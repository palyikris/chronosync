// Start Vite with fake Supabase credentials; all external requests are intercepted.
// Requires an isolated local status_ui database containing the backend security
// fixture and migrations (it can be cloned from test_tenant_security's database).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { expect } = require("playwright/test");
const dsn = process.env.STATUS_UI_PG_DSN ?? "";
assert.match(dsn, /^host=\/tmp\/chronosync-invoice-audit port=\d+ dbname=status_ui$/);
const base = process.env.STATUS_UI_BASE_URL ?? "http://127.0.0.1:5194";
const language = process.env.STATUS_UI_LANGUAGE ?? "en";
const { timesheet: labels } = JSON.parse(await readFile(new URL(`../../src/locales/${language}.json`, import.meta.url)));
const companyId = "20000000-0000-0000-0000-000000000001";
const userId = "10000000-0000-0000-0000-000000000003";
const clientId = "30000000-0000-0000-0000-000000000001";
const projectId = "40000000-0000-0000-0000-000000000001";
const entryId = "50000000-0000-0000-0000-000000000001";
const literal = value => value == null ? "null" : `'${String(value).replaceAll("'", "''")}'`;
const sql = (query, asEmployee = false) => execFileSync("psql", [dsn, "-XAtq", "-v", "ON_ERROR_STOP=1"], {
  input: (asEmployee ? `set request.jwt.claim.sub='${userId}';set role authenticated;` : "") + query,
  encoding: "utf8", timeout: 15000,
}).trim();
const today = new Date();
const date = [today.getFullYear(), String(today.getMonth()+1).padStart(2,"0"), String(today.getDate()).padStart(2,"0")].join("-");
sql("truncate private.company_invitations,public.timesheets,public.leave_requests,public.projects,public.clients,public.profiles,public.companies,auth.users cascade;");
sql(`insert into companies(id) values ('${companyId}');
  insert into auth.users(id,email,email_confirmed_at) values ('${userId}','undo@test.invalid',now());
  update profiles set company_id='${companyId}',is_active=true where id='${userId}';
  insert into clients(id,company_id) values ('${clientId}','${companyId}');
  insert into projects(id,company_id,client_id) values ('${projectId}','${companyId}','${clientId}');
  insert into timesheets(id,user_id,company_id,client_id,project_id,work_date,hours_logged,description,status,submitted_at)
    values ('${entryId}','${userId}','${companyId}','${clientId}','${projectId}','${date}',2,'Undo regression','submitted',now());`);

const user = { id: userId, email: "undo@test.invalid", role: "authenticated", aud: "authenticated", app_metadata: {}, user_metadata: {} };
const exp = Math.floor(Date.now()/1000)+3600;
const token = [{alg:"HS256",typ:"JWT"},{sub:userId,exp,role:"authenticated"},"fake"].map(x => typeof x === "string" ? x : Buffer.from(JSON.stringify(x)).toString("base64url")).join(".");
const session = {user,access_token:token,refresh_token:"fake",expires_at:exp,expires_in:3600,token_type:"bearer"};
const browser = await chromium.launch({headless:true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {}),
});
const context = await browser.newContext({viewport:{width:1366,height:1000}});
await context.addInitScript(({session,language}) => {
  localStorage.setItem("sb-127-auth-token", JSON.stringify(session));
  localStorage.setItem("i18nextLng",language);
  localStorage.setItem("chronosync:timesheet:view","calendar");
}, {session,language});
let zeroRows = true, concurrentApproval = false, pendingRelease;
const patches = [], errors = [];
await context.route("**/*", async route => {
  const request = route.request(), url = new URL(request.url());
  if (url.origin === base) return route.continue();
  const json = (data, headers = {}) => route.fulfill({status:200,contentType:"application/json",
    headers:{"access-control-expose-headers":"content-range",...headers},body:JSON.stringify(data)});
  if (url.pathname.endsWith("/auth/v1/user")) return json(user);
  if (url.pathname.endsWith("/auth/v1/token")) return json(session);
  const table = url.pathname.split("/").at(-1);
  const single = request.headers().accept?.includes("object");
  const profile = {...user,company_id:companyId,full_name:"Undo Test",role:"regular",is_active:true,company:{is_active:true},weekly_work_hours:40};
  if (table === "profiles") return json(single ? profile : [profile]);
  if (table === "clients") return json([{id:clientId,company_id:companyId,name:"Test client",is_active:true}]);
  if (table === "projects") return json([{id:projectId,company_id:companyId,client_id:clientId,name:"Test project",is_active:true}]);
  if (table !== "timesheets") return json([]);
  const predicates = [];
  for (const [field, expression] of url.searchParams) {
    if (!["id","user_id","work_date","status"].includes(field)) continue;
    const split = expression.indexOf("."), op = expression.slice(0,split), value = expression.slice(split+1);
    if (op === "in") predicates.push(`${field} in (${value.slice(1,-1).split(",").map(v => literal(v.replaceAll('"',''))).join(",")})`);
    else {
      assert.ok(["eq","gte","lt"].includes(op));
      predicates.push(`${field} ${{eq:"=",gte:">=",lt:"<"}[op]} ${literal(value)}`);
    }
  }
  const where = predicates.length ? predicates.join(" and ") : "true";
  if (request.method() === "PATCH") {
    const payload = request.postDataJSON();
    patches.push({payload,where});
    if (pendingRelease) await pendingRelease.promise;
    if (concurrentApproval) {
      sql(`update timesheets set status='approved' where id='${entryId}'`);
      concurrentApproval = false;
    }
    for (const field of Object.keys(payload)) assert.ok(["status","submitted_at"].includes(field));
    const assignments = Object.entries(payload).map(([field,value]) => `${field}=${literal(value)}`).join(",");
    const count = sql(`with changed as (update timesheets set ${assignments} where ${where}${zeroRows ? " and false" : ""} returning id) select count(*) from changed`, true);
    return json([], {"content-range":`*/${count}`});
  }
  assert.equal(request.method(),"GET");
  let rows = JSON.parse(sql(`select coalesce(json_agg(t),'[]') from (select * from timesheets where ${where} order by work_date,id) t`, true));
  const offset = Number(url.searchParams.get("offset") ?? 0);
  rows = rows.slice(offset,offset+Number(url.searchParams.get("limit") ?? rows.length));
  return json(single ? rows[0] : rows);
});
const page = await context.newPage();
page.on("pageerror", error => errors.push(error.message));
try {
  await page.goto(base+"/timesheet");
  const card = page.getByRole("article").filter({hasText:"Undo regression"});
  const undo = card.getByRole("button",{name:labels.revertToDraft,exact:true});
  await expect(undo).toBeVisible();
  await undo.click();
  await expect(page.getByRole("alert")).toContainText(labels.statusUpdateConflict);
  await expect(undo).toBeEnabled();
  assert.equal(sql(`select status from timesheets where id='${entryId}'`),"submitted");

  zeroRows = false;
  let release;
  pendingRelease = {promise:new Promise(resolve => {release=resolve;})};
  await undo.click();
  await expect(undo).toBeDisabled();
  await undo.evaluate(button => {button.click();button.click();});
  release();
  pendingRelease = null;
  await expect(card.getByRole("button",{name:labels.editEntry,exact:true})).toBeVisible();
  await expect(undo).toHaveCount(0);
  await expect(page.getByRole("status").filter({hasText:labels.statusUpdated})).toBeVisible();
  assert.equal(patches.length,2,"Repeated clicks while loading must not add writes");
  assert.equal(sql(`select status||':'||(submitted_at is null)::text from timesheets where id='${entryId}'`),"draft:true");
  await page.reload();
  await expect(card.getByRole("button",{name:labels.editEntry,exact:true})).toBeVisible();
  await card.getByRole("button",{name:labels.submitEntry,exact:true}).click();
  await expect(undo).toBeVisible();
  assert.equal(sql(`select status||':'||(submitted_at is not null)::text from timesheets where id='${entryId}'`),"submitted:true");

  concurrentApproval = true;
  await undo.click();
  await expect(page.getByRole("alert")).toContainText(labels.statusUpdateConflict);
  await expect(card.getByText(labels.approved,{exact:true})).toBeVisible();
  await expect(undo).toHaveCount(0);
  assert.equal(sql(`select status from timesheets where id='${entryId}'`),"approved");
  assert.deepEqual(errors,[]);
  await page.screenshot({path:`/tmp/chronosync-undo-verified-${language}.png`,fullPage:true});
  console.log(`Undo browser checks passed (${language}): zero-row feedback, pending clicks, database-backed withdrawal, reload, resubmission, concurrent approval refresh.`);
} finally {
  await context.close();
  await browser.close();
}
