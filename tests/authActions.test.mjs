import test from "node:test";
import assert from "node:assert/strict";
import { createEmailActionVerifier, readEmailAction, resumePasswordSetup, safeAuthContinuation } from "../src/utils/authActions.ts";

test("continuations retain internal state and reject external URLs and auth loops", () => {
  for (const value of [null,"https://evil.example","//evil.example","/\\evil.example","/auth/invite","/login?returnTo=/","/%61uth/recover","/%2f%2fevil.example","/\n/evil.example"]) {
    assert.equal(safeAuthContinuation(value),"/",String(value));
  }
  assert.equal(safeAuthContinuation("/admin/billing?client=1#history"),"/admin/billing?client=1#history");
  assert.equal(safeAuthContinuation("/timesheet?returnTo=https://evil.example"),"/timesheet?returnTo=%2F");
});

test("reading or prefetching an email action does not verify a token", () => {
  let calls = 0;
  createEmailActionVerifier(async () => { calls++; });
  const action = readEmailAction("/auth/invite",`?token_hash=${"a".repeat(64)}&type=invite&returnTo=%2Fsettings`);
  assert.equal(action.valid,true);
  assert.equal(action.returnTo,"/settings");
  assert.equal(calls,0);
});

test("action types are bound to the landing route and duplicate parameters are rejected", () => {
  const hash = "a".repeat(64);
  for (const search of [`?token_hash=${hash}&type=recovery`,`?token_hash=${hash}`,`?token_hash=${hash}&type=invite&type=recovery`,`?token_hash=${hash}&token_hash=${hash}&type=invite`]) {
    assert.equal(readEmailAction("/auth/invite",search).valid,false);
  }
  assert.equal(readEmailAction("/auth/recover","").type,"recovery");
  assert.equal(readEmailAction("/auth/magic","").type,"email");
});

test("duplicate activation shares one verification and errors permit explicit retry", async () => {
  let calls = 0;
  let release;
  const verify = createEmailActionVerifier(async () => {
    calls++;
    await new Promise(resolve => { release = resolve; });
    return "verified-user";
  });
  const a = verify({type:"invite",token_hash:"hash"});
  const b = verify({type:"invite",token_hash:"hash"});
  assert.equal(calls,1);
  release();
  assert.deepEqual(await Promise.all([a,b]),["verified-user","verified-user"]);
  await verify({type:"invite",token_hash:"hash"});
  assert.equal(calls,1);
  let attempts = 0;
  const retry = createEmailActionVerifier(async () => {
    if (++attempts === 1) throw new Error("expired");
    return "ok";
  });
  await assert.rejects(retry({type:"email",email:"test@example.com",token:"123456"}));
  assert.equal(await retry({type:"email",email:"test@example.com",token:"654321"}),"ok");
});

test("refresh resumes password setup only for the same verified identity and safe continuation", async () => {
  const progress = {type:"recovery",userId:"verified-user",returnTo:"/settings?tab=profile",verifiedAt:100000};
  assert.deepEqual(await resumePasswordSetup(progress,"recovery",async () => "verified-user",100001),progress);
  assert.equal((await resumePasswordSetup({...progress,returnTo:"https://evil.example"},"recovery",async () => "verified-user",100001)).returnTo,"/");
  assert.equal(await resumePasswordSetup(progress,"recovery",async () => "different-user",100001),null);
  assert.equal(await resumePasswordSetup(progress,"recovery",async () => null,100001),null);
  assert.equal(await resumePasswordSetup(progress,"recovery",async () => {throw new Error("signed out");},100001),null);
});

test("stale, future, mismatched and malformed password progress cannot resume or verify a token", async () => {
  const progress = {type:"invite",userId:"verified-user",returnTo:"/",verifiedAt:100000};
  let identityCalls = 0;
  const identity = async () => {identityCalls++;return "verified-user";};
  for (const [value,type,now] of [[null,"invite",100001],[{},"invite",100001],
    [progress,"recovery",100001],[progress,"email",100001],[progress,"invite",99999],
    [progress,"invite",1900001],[{...progress,verifiedAt:NaN},"invite",100001]]) {
    assert.equal(await resumePasswordSetup(value,type,identity,now),null);
  }
  assert.equal(identityCalls,0);
});
