import { describe, test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const dsn = process.env.PARTNER_IMPORT_TEST_PG_DSN;
const company = '20000000-0000-4000-8000-000000000001';
const otherCompany = '20000000-0000-4000-8000-000000000002';
const admin = '10000000-0000-4000-8000-000000000001';
const employee = '10000000-0000-4000-8000-000000000002';
const client = '30000000-0000-4000-8000-000000000001';
const second = '30000000-0000-4000-8000-000000000002';
const outside = '30000000-0000-4000-8000-000000000003';
const literal = value => "'" + String(value).replaceAll("'", "''") + "'";
function sql(query, identity, check = true) {
  assert.match(dsn, /host=\/tmp\/chronosync-partner-import(?:\s|$)/);
  assert.match(dsn, /dbname=partner_import(?:\s|$)/);
  const prefix = identity ? `set request.jwt.claim.sub=${literal(identity)}; set role authenticated;` : '';
  const result = spawnSync('psql', [dsn, '-XAtq', '-v', 'ON_ERROR_STOP=1'], { input: prefix + query, encoding: 'utf8', timeout: 15000 });
  if (check) assert.equal(result.status, 0, result.stderr);
  return result;
}
const call = (rows, tenant = company) => `select public.import_client_billing_details('${tenant}',${literal(JSON.stringify(rows))}::jsonb);`;
const run = rows => JSON.parse(sql(call(rows), admin).stdout);
const row = data => ({ client_id: client, data });
const snapshot = () => JSON.parse(sql(`select to_jsonb(p) from client_billing_profiles p where client_id='${client}';`).stdout);

describe('partner import database protections', { skip: !dsn }, () => {
  before(() => {
    sql(`drop schema if exists public cascade; drop schema if exists auth cascade; drop schema if exists private cascade;
      create schema public; grant usage on schema public to public;
      do $$ begin
        if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
        if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
        if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
      end $$;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to public; grant execute on function auth.uid() to public;
      create table public.companies(id uuid primary key, is_active boolean default true, is_deleted boolean default false, invoicing_enabled boolean default true);
      create table public.profiles(id uuid primary key, company_id uuid, role text, is_active boolean default true);
      create table public.clients(id uuid primary key, company_id uuid references companies, name text, client_code text, invoice_attachment_language text);
      grant select on public.clients to authenticated;`);
    sql(readFileSync(new URL('../supabase/migrations/20261022090000_create_client_billing_profiles.sql', import.meta.url), 'utf8'));
    // Exercise the current module-aware authorization contract without loading unrelated app tables.
    sql(`create or replace function private.current_billing_admin_company_id() returns uuid language sql stable security definer set search_path='' as $$
      select p.company_id from public.profiles p join public.companies c on c.id=p.company_id
      where p.id=auth.uid() and p.role='company_admin' and p.is_active and c.is_active and not c.is_deleted and c.invoicing_enabled limit 1 $$;`);
    sql(`alter table public.clients enable row level security;
      create policy client_company_read on public.clients for select to authenticated
      using (company_id=(select private.current_billing_admin_company_id()));`);
    sql(readFileSync(new URL('../supabase/migrations/20261106223909_import_client_billing_details.sql', import.meta.url), 'utf8'));
    sql(readFileSync(new URL('../supabase/migrations/20261113151355_import_multiple_billing_emails.sql', import.meta.url), 'utf8'));
  });
  beforeEach(() => {
    sql(`truncate client_billing_profiles,clients,profiles,companies cascade;
      insert into companies(id) values ('${company}'),('${otherCompany}');
      insert into profiles(id,company_id,role) values ('${admin}','${company}','company_admin'),('${employee}','${company}','employee');
      insert into clients values ('${client}','${company}','Original client','ORIGINAL','en'),
        ('${second}','${company}','Second client','SECOND','hu'),('${outside}','${otherCompany}','Outside','OUT','hu');
      insert into client_billing_profiles(client_id,company_id,billing_name,billing_email,payment_term_days)
        values ('${client}','${company}','Saved name','saved@example.invalid',0);`);
  });
  test('fills empty fields and appends unique emails while preserving existing settings', () => {
    const before = snapshot();
    const billing_email = 'SAVED@example.invalid, new@example.invalid, NEW@example.invalid, team@example.invalid';
    const result = run([row({ billing_name: 'Incoming name', billing_city: 'Budapest', billing_email, payment_term_days: 30 })]);
    assert.deepEqual(result[0].fields, ['billing_email', 'billing_city']);
    const after = snapshot();
    delete before.updated_at; delete after.updated_at;
    assert.deepEqual(after, { ...before, billing_city: 'Budapest', billing_email: 'saved@example.invalid,new@example.invalid,team@example.invalid' });
    assert.equal(sql(`select name||':'||client_code from clients where id='${client}'`).stdout.trim(), 'Original client:ORIGINAL');
  });
  test('replay is idempotent and does not touch updated_at', () => {
    const input = [row({ billing_address: 'Street 1', billing_email: 'new@example.invalid,team@example.invalid' })];
    assert.equal(run(input)[0].status, 'updated');
    const first = snapshot();
    assert.equal(run(input)[0].status, 'unchanged');
    assert.deepEqual(snapshot(), first);
  });
  test('creates a missing billing profile for an existing client without creating clients or enabling email/automation', () => {
    const result = run([{ client_id: second, data: { billing_name: 'German buyer', billing_country_code: 'DE', billing_email: 'buyer@example.invalid', payment_term_days: 30 } }]);
    assert.equal(result[0].status, 'updated');
    const saved = JSON.parse(sql(`select to_jsonb(p) from client_billing_profiles p where client_id='${second}'`).stdout);
    assert.equal(saved.billing_country_code, 'DE'); assert.equal(saved.payment_term_days, 30);
    assert.equal(saved.send_invoice_email, false); assert.equal(saved.automatic_invoicing_enabled, false);
    assert.equal(sql('select count(*) from clients').stdout.trim(), '3');
  });
  test('employee, other tenant, inactive admin and disabled invoicing cannot import', () => {
    const query = call([row({ billing_city: 'Changed' })]);
    assert.notEqual(sql(query, employee, false).status, 0);
    assert.notEqual(sql(call([row({ billing_city: 'Changed' })], otherCompany), admin, false).status, 0);
    sql(`update profiles set is_active=false where id='${admin}'`);
    assert.notEqual(sql(query, admin, false).status, 0);
    sql(`update profiles set is_active=true where id='${admin}'; update companies set invoicing_enabled=false`);
    assert.notEqual(sql(query, admin, false).status, 0);
    assert.equal(snapshot().billing_city, null);
  });
  test('unknown clients, cross-tenant clients and unknown fields are rejected without blocking valid rows', () => {
    const result = run([row({ automatic_invoicing_enabled: true }), { client_id: outside, data: { billing_city: 'No' } },
      { client_id: second, data: { billing_city: 'Valid' } }]);
    assert.deepEqual(result.map(item => item.status), ['failed', 'failed', 'updated']);
    assert.equal(snapshot().automatic_invoicing_enabled, false);
  });
  test('country/tax conflicts reject the whole row, including unrelated empty fields', () => {
    assert.equal(run([row({ billing_country_code: 'DE', billing_city: 'No' })])[0].error_code, 'identity_conflict');
    sql(`update client_billing_profiles set tax_subject=-1 where client_id='${client}'`);
    assert.equal(run([row({ tax_subject: 1, billing_city: 'No' })])[0].error_code, 'identity_conflict');
    assert.equal(run([row({ tax_number: '12345678-2-41', billing_city: 'No' })])[0].error_code, 'identity_conflict');
    assert.equal(snapshot().billing_city, null);
  });
  test('inconsistent VAT groups and malformed data roll back even newly created profiles', () => {
    for (const data of [{ tax_subject: 1, tax_number: '12345678-2-41', group_tax_number: '87654321-5-41' },
      { billing_email: 'valid@example.invalid,bad email' }, { billing_email: ['valid@example.invalid'] },
      { billing_country_code: 'Hungary' }, { payment_term_days: 1.5 }, { billing_city: ['bad'] }]) {
      assert.equal(run([{ client_id: second, data }])[0].status, 'failed');
      assert.equal(sql(`select count(*) from client_billing_profiles where client_id='${second}'`).stdout.trim(), '0');
    }
  });
  test('a concurrent regular save wins over stale import data', async () => {
    const process = spawn('psql', [dsn, '-XAtq', '-v', 'ON_ERROR_STOP=1'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    process.stderr.on('data', data => { stderr += data; });
    const done = new Promise((resolve, reject) => process.on('exit', code => code === 0 ? resolve() : reject(new Error(stderr))));
    const locked = new Promise(resolve => process.stdout.on('data', data => { if (String(data).includes('locked')) resolve(); }));
    process.stdin.end(`begin; update client_billing_profiles set billing_city='Concurrent value',
      billing_email='saved@example.invalid,concurrent@example.invalid' where client_id='${client}'; select 'locked'; select pg_sleep(0.4); commit;`);
    await locked;
    assert.equal(run([row({ billing_city: 'Stale file value', billing_address: 'Fill street', billing_email: 'file@example.invalid' })])[0].status, 'updated');
    await done;
    assert.equal(snapshot().billing_city, 'Concurrent value');
    assert.equal(snapshot().billing_address, 'Fill street');
    assert.equal(snapshot().billing_email, 'saved@example.invalid,concurrent@example.invalid,file@example.invalid');
  });
  test('function retains RLS and only authenticated callers have execute permission', () => {
    assert.equal(sql(`select prosecdef from pg_proc where oid='public.import_client_billing_details(uuid,jsonb)'::regprocedure`).stdout.trim(), 'f');
    assert.equal(sql(`select has_function_privilege('anon','public.import_client_billing_details(uuid,jsonb)','execute')`).stdout.trim(), 'f');
    assert.equal(sql(`select has_function_privilege('authenticated','public.import_client_billing_details(uuid,jsonb)','execute')`).stdout.trim(), 't');
  });
});
