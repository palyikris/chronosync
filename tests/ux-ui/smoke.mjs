// Run Vite with the fake Supabase URL below on port 5180, then run this with Playwright available.
// All non-app traffic is intercepted. No live authentication or database writes are made.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const {expect}=require('playwright/test');
const isFocused=async locator=>{await expect(locator).toBeFocused();return true;};
const labels=JSON.parse(await readFile(new URL('../../src/locales/en.json',import.meta.url),'utf8'));
let base=process.env.UX_UI_BASE_URL || 'http://127.0.0.1:5180';
let server;
if(process.env.UX_DIST_DIR){
  const root=resolve(process.env.UX_DIST_DIR);
  const contentTypes={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
  server=createServer(async(req,res)=>{
    try{
      let file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
      if(!file.startsWith(root+sep)&&file!==root){res.writeHead(403);res.end();return;}
      if(!extname(file))file=resolve(root,'index.html');
      const body=await readFile(file);
      res.writeHead(200,{'content-type':contentTypes[extname(file)]||'application/octet-stream'});res.end(body);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base=`http://127.0.0.1:${server.address().port}`;
}
const componentBase=process.env.UX_COMPONENT_BASE_URL || base;
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
let checks=0;
const verify=(condition,message)=>{assert.ok(condition,message);checks++;};
const userId='00000000-0000-4000-8000-000000000001';
const companyId='00000000-0000-4000-8000-000000000002';
const clientId='00000000-0000-4000-8000-000000000003';
const projectId='00000000-0000-4000-8000-000000000004';
const errors=[];
async function app(role='regular', options={}) {
  const context=await browser.newContext({viewport:{width:1366,height:900}});
  const user={id:userId,aud:'authenticated',role:'authenticated',email:'tester@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
  const exp=Math.floor(Date.now()/1000)+3600;
  const token=[{alg:'HS256',typ:'JWT'},{sub:userId,exp,role:'authenticated'},'fake'].map(x=>typeof x==='string'?x:Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
  const session={access_token:token,refresh_token:'fake-refresh-token',expires_at:exp,expires_in:3600,token_type:'bearer',user};
  const profile={...user,company_id:companyId,full_name:'Test Person',role,is_active:true,weekly_work_hours:40,show_timesheet_timer:false,company:{is_active:true},companies:{name:'Test company'}};
  const client={id:clientId,company_id:companyId,name:'Test client',client_code:'TEST',is_active:true,is_default:true,invoice_attachment_language:'en',available_hours_per_month:40,hours_from_previous_month:0};
  const project={id:projectId,client_id:clientId,company_id:companyId,name:'Test project',is_active:true,estimated_hours_per_month:40,clients:client};
  const state={profile,fail:options.fail??null,requests:[],patches:[],session,profileReads:0};
  await context.addInitScript(({session,options})=>{
    localStorage.setItem('i18nextLng','en');
    if(!options.loggedOut)localStorage.setItem('sb-127-auth-token',JSON.stringify(session));
    localStorage.setItem('chronosync:timesheet:view',options.view??'calendar');
  },{session,options});
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.origin===base)return route.continue();
    state.requests.push({path:url.pathname,search:url.search,method:req.method()});
    const json=(data,status=200,headers={})=>route.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(data)});
    if(url.pathname.endsWith('/auth/v1/token'))return json(session);
    if(url.pathname.endsWith('/auth/v1/user'))return json(user);
    if(url.pathname.endsWith('/auth/v1/logout'))return json({});
    const table=url.pathname.split('/').at(-1);
    if(state.fail===table && (table!=='profiles'||!url.searchParams.get('select')?.includes('company:')))return json({message:'Test load failure'},400);
    if(req.method()==='PATCH'){
      state.patches.push({table,data:req.postDataJSON()});
      if(table==='profiles')Object.assign(profile,req.postDataJSON());
      return json(profile);
    }
    const offset=Number(url.searchParams.get('offset')??0);
    if(table==='profiles'){
      if(url.searchParams.get('select')?.includes('company:'))state.profileReads++;
      return json(req.headers().accept?.includes('object')?profile:offset?[]:[profile]);
    }
    if(table==='clients')return json(offset?[]:[client]);
    if(table==='projects')return json(offset?[]:[project]);
    if(table==='companies')return json(req.headers().accept?.includes('object')?{id:companyId,name:'Test company',is_active:true,szamlazz_test_mode:true}:[]);
    if(table==='invoice-settings')return json({invoice_provider:'szamlazz_hu',api_key_configured:false});
    if(table==='audit_logs'){
      const search=url.searchParams.get('or')??'';
      const result=[{id:1,table_name:'profiles',record_id:userId,operation:'UPDATE',old_data:{},new_data:{},changed_fields:null,performed_by:userId,created_at:'2026-10-26T08:00:00Z',profiles:{full_name:search.includes('second')?'Second result':'First result'}}];
      return json(result,200,{'content-range':'0-0/1'});
    }
    return json([]);
  });
  const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
  return {context,page,state};
}
try{
  if (!process.env.UX_UI_FOCUS) {
  const component=await browser.newPage({viewport:{width:390,height:660}});
  component.on('pageerror',e=>errors.push(e.message));
  await component.goto(componentBase+'/tests/ux-ui/index.html');
  await component.getByRole('button',{name:'Open form'}).click();
  await component.getByRole('dialog',{name:'Test form'}).waitFor();
  verify(await component.getByLabel('Name',{exact:true}).count()===1,'Input labels get generated IDs');
  const trigger=component.getByRole('button',{name:'Client',exact:true});
  await trigger.focus();await component.keyboard.press('ArrowDown');
  await component.getByRole('listbox').waitFor();
  verify(await isFocused(component.getByRole('textbox',{name:labels.common.searchOptions})),'Keyboard opening focuses search');
  const scrollable=await component.getByRole('listbox').evaluate(el=>el.scrollHeight>el.clientHeight);
  verify(scrollable,'Long dropdowns have a constrained scrollable option list');
  await component.getByRole('textbox',{name:labels.common.searchOptions}).fill('Client 40');
  await component.keyboard.press('ArrowDown');await component.keyboard.press('Enter');
  await expect(trigger).toContainText('Client 40');checks++;
  verify(await isFocused(trigger),'Selection returns focus to its trigger');
  await trigger.click();await component.keyboard.press('Escape');
  verify(await component.getByRole('dialog',{name:'Test form'}).isVisible(),'Escape closes dropdown without closing its parent modal');
  await component.getByRole('button',{name:'Save test'}).click();
  verify(await component.getByTestId('submits').textContent()==='1','Bottom action remains reachable on a short mobile screen');
  verify(await component.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile form has no horizontal overflow');
  await component.keyboard.press('Escape');
  verify(await isFocused(component.getByRole('button',{name:'Open form'})),'Closing dialog restores the opener focus');
  await component.close();

  const regular=await app('regular',{view:'grid'});
  await regular.page.goto(base+'/');await regular.page.waitForURL('**/timesheet');
  await regular.page.getByRole('button',{name:labels.timesheet.addEntry,exact:true}).waitFor();
  verify(await regular.page.getByRole('button',{name:labels.timesheet.calendarView,exact:true}).isVisible(),'Legacy grid preference recovers to calendar');
  verify(regular.state.profileReads===1,'Initial session loads the profile once');
  verify(regular.state.requests.filter(r=>r.path.endsWith('/clients')).length===1,'Timesheet clients load once');
  verify(regular.state.requests.filter(r=>r.path.endsWith('/projects')).length===1,'Timesheet projects load once');
  await regular.page.getByRole('button',{name:labels.timesheet.addEntry,exact:true}).click();
  const entry=regular.page.getByRole('dialog');
  await entry.waitFor();
  verify(!(await entry.getByRole('button',{name:labels.timesheet.saveEntry,exact:true}).isEnabled()),'Entry cannot silently submit without client and project');
  await entry.getByRole('button',{name:labels.timesheet.client,exact:true}).click();
  await regular.page.getByRole('option',{name:'Test client',exact:true}).click();
  await entry.getByRole('button',{name:labels.timesheet.project,exact:true}).click();
  await regular.page.getByRole('option',{name:'Test project',exact:true}).click();
  verify(await entry.getByRole('button',{name:labels.timesheet.saveEntry,exact:true}).isEnabled(),'Selecting client/project enables save');
  verify(regular.state.requests.filter(r=>r.path.endsWith('/projects')).length===1,'Changing client reuses loaded projects');
  await regular.page.setViewportSize({width:390,height:660});
  await expect.poll(()=>regular.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await regular.page.screenshot({path:'/tmp/chronosync-ux-entry-mobile.png',fullPage:false});
  await regular.page.keyboard.press('Escape');
  await regular.page.setViewportSize({width:1366,height:900});
  for(const route of ['/admin/dashboard','/admin/users','/admin/settings','/super-admin/companies','/super-admin/logs']){
    await regular.page.goto(base+route);await regular.page.waitForURL('**/timesheet');checks++;
  }
  await regular.page.goto(base+'/settings');
  const workHours=regular.page.getByLabel(labels.userSettings.workHoursLabel,{exact:true});await workHours.waitFor();
  await workHours.fill('0');await regular.page.getByRole('button',{name:labels.userSettings.saveWorkHours}).click();
  verify(regular.state.patches.length===0,'Invalid weekly hours are blocked before network requests');
  await workHours.fill('32');await regular.page.getByRole('button',{name:labels.userSettings.saveWorkHours}).click();
  await regular.page.getByText(labels.userSettings.workHoursSaved,{exact:true}).waitFor();
  verify(regular.state.profile.weekly_work_hours===32,'Saving work hours refreshes the profile');
  await regular.page.setViewportSize({width:390,height:844});
  verify(await regular.page.locator('aside').evaluate(el=>el.inert),'Closed mobile navigation is inert');
  const menu=regular.page.getByRole('button',{name:labels.navigation.openNavigation,exact:true});
  await menu.click();
  const nav=regular.page.getByRole('dialog',{name:labels.navigation.openNavigation,exact:true});
  await nav.waitFor();
  await expect(nav.getByRole('button',{name:labels.navigation.closeNavigation,exact:true})).toBeFocused();checks++;
  verify(await regular.page.evaluate(()=>document.body.style.overflow==='hidden'),'Opening navigation locks background scrolling');
  await regular.page.keyboard.press('Escape');
  await expect(menu).toBeFocused();checks++;
  await menu.click();
  await nav.getByRole('link',{name:labels.navigation.timesheets,exact:true}).click();
  await regular.page.waitForURL('**/timesheet');
  verify(await regular.page.locator('aside').evaluate(el=>el.inert),'Following navigation closes the mobile drawer');
  await regular.context.close();

  for(const [path,table] of [['/timesheet','timesheets'],['/leaves','leave_requests'],['/admin/users','profiles']]){
    const test=await app('company_admin');
    test.state.fail=table;
    await test.page.goto(base+path);
    await test.page.getByRole('alert').filter({hasText:labels.common.loadError}).waitFor({timeout:15000});
    test.state.fail=null;
    await test.page.getByRole('button',{name:labels.common.retry,exact:true}).click();
    await test.page.getByRole('alert').filter({hasText:labels.common.loadError}).waitFor({state:'detached'});
    checks++;
    await test.context.close();
  }
  for(const path of ['/admin/dashboard','/admin/review','/admin/users','/admin/settings','/admin/invoice-attachments','/admin/billing','/leaves']){
    const test=await app('company_admin');console.log('Checking',path);await test.page.goto(base+path);await test.page.locator('main').getByRole('heading',{level:1}).waitFor().catch(async error=>{console.log('Page diagnostics',test.page.url(),(await test.page.locator('body').innerText()).slice(0,1500),errors);throw error;});
    verify(!test.page.url().endsWith('/login'),'Admin flow renders '+path);
    await test.page.setViewportSize({width:390,height:844});
    await expect.poll(() => test.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true).catch(async error=>{
      console.log(path,await test.page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('*')].map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width})).filter(x=>x.right>innerWidth+1).slice(0,25)})));
      await test.page.screenshot({path:'/tmp/chronosync-mobile-overflow.png',fullPage:true});throw error;
    });
    checks++;
    if(path==='/admin/dashboard')await test.page.screenshot({path:'/tmp/chronosync-ux-dashboard-mobile.png',fullPage:true});
    await test.context.close();
  }
  }
  const admin=await app('company_admin');
  await admin.page.goto(base+'/admin/users');
  await admin.page.getByPlaceholder(labels.users.searchPlaceholder).fill('tester@example.invalid');
  await expect(admin.page.locator('tbody tr')).toHaveCount(1);checks++;
  const downloadEvent=admin.page.waitForEvent('download');
  await admin.page.getByRole('button',{name:labels.users.export,exact:true}).click();
  verify((await downloadEvent).suggestedFilename()==='team-members.csv','Member export downloads the filtered rows');
  await admin.context.close();
  const login=await app('regular',{loggedOut:true});
  await login.page.goto(base+'/login');
  await login.page.getByRole('button',{name:labels.auth.forgotPassword,exact:true}).click();
  verify(await login.page.getByRole('status').filter({hasText:labels.auth.passwordResetHelp}).isVisible(),'Forgot password provides recovery instructions');
  await login.page.getByRole('button',{name:labels.auth.contactAdmin,exact:true}).click();
  verify(await login.page.getByRole('status').filter({hasText:(labels.auth.accountAccessHelp ?? labels.auth.contactAdminHelp)}).isVisible(),'Contact admin provides access instructions');
  await login.page.getByLabel(labels.auth.emailLabel,{exact:true}).fill('tester@example.invalid');
  await login.page.getByLabel(labels.auth.passwordLabel,{exact:true}).fill('local-test-password');
  await login.page.getByRole('button',{name:labels.common.signIn,exact:true}).click();
  await login.page.waitForURL('**/timesheet');checks++;
  const profileReads=login.state.profileReads;
  await login.page.evaluate(session=>{
    const channel=new BroadcastChannel('sb-127-auth-token');
    channel.postMessage({event:'TOKEN_REFRESHED',session});
    channel.close();
  },login.state.session);
  verify(login.state.profileReads===profileReads,'A token refresh event does not refetch the profile or block navigation');
  await login.page.getByRole('button',{name:labels.navigation.signOut,exact:true}).click();
  await login.page.waitForURL('**/login');checks++;
  await login.context.close();
  const logs=await app('super_admin');await logs.page.goto(base+'/super-admin/logs');
  await logs.page.getByRole('heading',{name:labels.auditLogs.title,exact:true}).waitFor();
  const search=logs.page.getByPlaceholder(labels.auditLogs.searchPlaceholder);
  const initial=logs.state.requests.filter(r=>r.path.endsWith('/audit_logs')).length;
  await search.pressSequentially('second',{delay:25});
  await logs.page.getByText('Second result',{exact:true}).waitFor();
  verify(logs.state.requests.filter(r=>r.path.endsWith('/audit_logs')).length===initial+1,'Typing sends one debounced audit-log request');
  await logs.context.close();
  verify(errors.length===0,JSON.stringify(errors));
  console.log(`${checks} UX checks passed${process.env.UX_UI_FOCUS ? ' (focused run)' : ' across keyboard, desktop, mobile, role guards, error recovery, and request efficiency'}.`);
}catch(error){
  console.log('Browser errors:',errors);
  for(const ctx of browser.contexts())for(const page of ctx.pages()){
    console.log('Failure page:',page.url(),(await page.locator('body').innerText().catch(()=>'' )).slice(0,2200));
    console.log('Layout:',await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('*')].map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width})).filter(x=>x.right>innerWidth+1).slice(0,15)})).catch(()=>null));
    await page.screenshot({path:'/tmp/chronosync-ux-failure.png',fullPage:true}).catch(()=>{});
  }
  throw error;
}finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
