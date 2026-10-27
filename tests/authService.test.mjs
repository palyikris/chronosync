import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { z } from "zod";

const i18n = { __esModule:true,default:{t:key => key} };
const shared = {emailSchema:z.string().trim().email(),uuidSchema:z.string().uuid(),
  trimmedNonEmptyStringSchema:(_message,max) => z.string().trim().min(1).max(max)};

function load(relative, modules, env) {
  let source = readFileSync(new URL(relative,import.meta.url),"utf8");
  if (env) source = source.replaceAll('import.meta.env.VITE_API_BASE_URL',JSON.stringify(env));
  const { outputText } = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  const exports = {};
  new Function("require","exports",outputText)(name => {
    assert.ok(name in modules,`Unexpected dependency ${name}`);
    return modules[name];
  },exports);
  return exports;
}

function fixture(t,{claimError=null}={}) {
  const events = [];
  const previousWindow = globalThis.window;
  globalThis.window = {location:{origin:"https://app.example"}};
  t.after(() => {globalThis.window=previousWindow;});
  const supabase = {
    auth:{
      signInWithPassword:async credentials => {events.push(["password",credentials]);return {data:{user:{id:"member"}},error:null};},
      signOut:async () => {events.push(["signout"]);return {error:null};},
      resetPasswordForEmail:async (...args) => {events.push(["recovery",...args]);return {error:null};},
      getSession:async () => ({data:{session:{access_token:"caller-jwt"}}}),
      signUp:async () => {throw new Error("Public signup must never provision team membership");},
    },
    rpc:async name => {events.push(["rpc",name]);return {data:false,error:claimError};},
    from:table => {
      events.push(["read",table]);
      const query={select:() => query,eq:() => query,
        single:async () => ({data:table==="profiles" ? {company_id:"company",is_active:true,role:"regular"} : {is_active:true},error:null})};
      return query;
    },
  };
  const schemas = load("../src/types/auth.ts",{"zod":{z},"../lib/i18n":i18n,"../lib/zodSchemas":shared});
  const service = load("../src/services/authService.ts",{"../lib/supabaseClient":{supabase},"../lib/i18n":i18n,
    "../types/auth":schemas,"../lib/zodSchemas":shared});
  return {events,supabase,service};
}

test("password sign-in preserves the chosen password and claims membership before loading it",async t => {
  const {events,service}=fixture(t);
  await service.signInUser(" member@example.com ","  secure-password  ");
  assert.deepEqual(events[0],["password",{email:"member@example.com",password:"  secure-password  "}]);
  assert.deepEqual(events.slice(1),[["rpc","claim_company_invitation"],["read","profiles"],["read","companies"]]);
});

test("a failed invitation claim signs out without reading or granting membership",async t => {
  const {events,service}=fixture(t,{claimError:new Error("expired invite")});
  await assert.rejects(service.signInUser("member@example.com","password"));
  assert.deepEqual(events.slice(1),[["rpc","claim_company_invitation"],["signout"]]);
});

test("recovery normalizes email and uses the inert action landing",async t => {
  const {events,service}=fixture(t);
  await service.requestPasswordReset(" MEMBER@Example.COM ");
  assert.deepEqual(events,[["recovery","member@example.com",{redirectTo:"https://app.example/auth/recover"}]]);
});

test("team creation sends a bearer-authenticated backend invitation without signup or a password",async t => {
  const {supabase}=fixture(t);
  const schemas=load("../src/types/user-management.ts",{"zod":{z},"../lib/zodSchemas":shared});
  const service=load("../src/services/userManagementService.ts",{"../lib/supabaseClient":{supabase},
    "../types/user-management":schemas},"https://api.example/api/v1");
  const requests=[];
  t.mock.method(globalThis,"fetch",async (...args) => {requests.push(args);return {ok:true};});
  await service.createCompanyUser({email:"new@example.com",full_name:"New Member",role:"regular",
    company_id:"11111111-1111-4111-8111-111111111111"});
  const [url,request]=requests[0];
  assert.equal(url,"https://api.example/api/v1/users/invitations");
  assert.equal(request.headers.Authorization,"Bearer caller-jwt");
  assert.equal(request.method,"POST");
  assert.equal("password" in JSON.parse(request.body),false);
  await assert.rejects(service.createCompanyUser({email:"new@example.com",full_name:"New Member",role:"super_admin",
    company_id:"11111111-1111-4111-8111-111111111111"}));
});
