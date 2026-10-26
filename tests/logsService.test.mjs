import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function fixture() {
  const calls=[];
  const query=new Proxy({}, {get:(_,method)=>method==='then' ? resolve=>Promise.resolve(resolve({data:[],count:0,error:null})) : (...args)=>{calls.push([method,...args]);return query;}});
  const dependencies={
    '../lib/supabaseClient':{supabase:{auth:{getUser:async()=>({data:{user:{id:'user'}}})},from:()=>query}},
    '../lib/i18n':{__esModule:true,default:{t:key=>key}},
    '../types/logs':{auditLogFiltersSchema:{parse:value=>value}},
  };
  const source=ts.transpileModule(readFileSync(new URL('../src/services/logsService.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exported={};new Function('require','exports',source)(name=>dependencies[name],exported);
  return {calls,fetch:exported.fetchAuditLogs};
}
test('Audit search uses an empty actor embed and same-level OR filters',async()=>{
  const f=fixture();await f.fetch({searchQuery:'Alice',page:1,pageSize:25});
  const ors=f.calls.filter(([name])=>name==='or');
  assert.deepEqual(ors[0],['or','email.ilike."%Alice%",full_name.ilike."%Alice%"',{referencedTable:'actor_search'}]);
  assert.equal(ors[1][1],'table_name.ilike."%Alice%",actor_search.not.is.null');
  assert.ok(f.calls.find(([name,selection])=>name==='select'&&selection.includes('actor_search:performed_by()')));
});
test('UUID search uses equality, while punctuation stays quoted inside the search pattern',async()=>{
  const f=fixture();const id='00000000-0000-4000-8000-000000000001';
  await f.fetch({searchQuery:id,page:1,pageSize:25});
  assert.ok(f.calls.some(([name,value])=>name==='or'&&value.includes('record_id.eq.'+id)));
  const quoted=fixture();await quoted.fetch({searchQuery:'A, "B"_(x)',page:1,pageSize:25});
  assert.ok(quoted.calls.find(([name])=>name==='or')[1].includes('"%A, \\"B\\"\\_(x)%"'));
});
test('Audit search forwards cancellation and stable pagination',async()=>{
  const f=fixture();const signal=new AbortController().signal;
  await f.fetch({page:2,pageSize:25},signal);
  assert.deepEqual(f.calls.find(([name])=>name==='range'),['range',25,49]);
  assert.deepEqual(f.calls.find(([name])=>name==='abortSignal'),['abortSignal',signal]);
  assert.ok(f.calls.some(([name,value])=>name==='order'&&value==='id'));
});
