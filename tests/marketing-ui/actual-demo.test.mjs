import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoTransport, DEMO_ORIGIN, DEMO_USER_ID, DEMO_COMPANY_ID, DEMO_CLIENT_ID, DEMO_PROJECT_ID } from '../../src/demo/demoTransport.ts';

const jsonRequest = (transport, path, method, body, extraHeaders = {}) => transport.fetch(`${DEMO_ORIGIN}${path}`, {
  method, headers: { 'Content-Type': 'application/json', ...extraHeaders }, ...(body ? { body: JSON.stringify(body) } : {}),
});

test('actual app requests preserve draft → submitted → approved → invoice gating', async () => {
  const transport = createDemoTransport();
  const period = { client_id: DEMO_CLIENT_ID, period_start: '2026-10-01', period_end: '2026-10-31' };
  assert.equal(transport.snapshot().hours, 22);
  assert.equal((await jsonRequest(transport, '/api/invoices/client-review', 'POST', period)).status, 404);
  const createdResponse = await jsonRequest(transport, '/rest/v1/timesheets?select=*', 'POST', {
    user_id: DEMO_USER_ID, company_id: DEMO_COMPANY_ID, client_id: DEMO_CLIENT_ID,
    project_id: DEMO_PROJECT_ID, work_date: '2026-10-22', hours_logged: 2, description: 'Brand exploration',
  }, { Accept: 'application/vnd.pgrst.object+json' });
  const created = await createdResponse.json();
  assert.equal(created.status, 'draft');
  assert.equal(transport.snapshot().hours, 24);
  assert.equal((await jsonRequest(transport, '/api/invoices/client-review', 'POST', period)).status, 404);
  await jsonRequest(transport, '/rest/v1/timesheets?status=eq.draft', 'PATCH', { status: 'submitted' });
  assert.equal(transport.snapshot().submittedHours, 24);
  const beforeApproval = await transport.fetch(`${DEMO_ORIGIN}/rest/v1/timesheets?status=eq.approved`);
  assert.deepEqual(await beforeApproval.json(), []);
  await jsonRequest(transport, '/rest/v1/timesheets?status=eq.submitted', 'PATCH', { status: 'approved', approved_by: DEMO_USER_ID });
  const reviewed = await jsonRequest(transport, '/api/invoices/client-review', 'POST', period);
  const review = await reviewed.json();
  assert.equal(review.approved_entries.length, 4);
  assert.equal(review.quantity, 24);
  assert.equal(review.net_total, 1800);
  assert.equal(review.vat_total, 486);
  assert.equal(review.gross_total, 2286);
  assert.equal(transport.snapshot().reviewed, true);
  const pdf = await jsonRequest(transport, '/api/invoices/client-preview', 'POST', period);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.match(await pdf.text(), /Net total: 1800.00 EUR/);
  assert.equal((await jsonRequest(transport, '/api/invoices/client-review', 'POST', { ...period, period_start: '2026-11-01', period_end: '2026-11-30' })).status, 404);
  transport.reset();
  assert.equal(transport.snapshot().hours, 22);
  assert.equal(transport.snapshot().reviewed, false);
});

test('edits and filters affect the same rows used by the real dialogs', async () => {
  const transport = createDemoTransport();
  const first = (await (await transport.fetch(`${DEMO_ORIGIN}/rest/v1/timesheets?work_date=gte.2026-10-20&order=work_date.desc&limit=1`)).json())[0];
  assert.equal(first.work_date, '2026-10-21');
  await jsonRequest(transport, `/rest/v1/timesheets?id=eq.${first.id}`, 'PATCH', { hours_logged: 4 });
  assert.equal(transport.snapshot().hours, 20);
  await jsonRequest(transport, '/rest/v1/timesheets?status=eq.draft', 'PATCH', { status: 'approved' });
  const review = await (await jsonRequest(transport, '/api/invoices/client-review', 'POST', {
    client_id: DEMO_CLIENT_ID, period_start: '2026-10-01', period_end: '2026-10-31',
  })).json();
  assert.equal(review.net_total, 1500);
  assert.equal(review.approved_entries.reduce((sum, entry) => sum + entry.hours_logged, 0), 20);
});

test('the demo fails closed for live origins, invoice issuance, and unknown endpoints', async () => {
  const transport = createDemoTransport();
  const before = transport.snapshot();
  assert.equal((await transport.fetch('https://example.com/rest/v1/timesheets')).status, 403);
  assert.equal((await jsonRequest(transport, '/api/invoices/client-issue', 'POST', { confirm: true })).status, 403);
  assert.equal((await jsonRequest(transport, '/rest/v1/companies', 'PATCH', { is_active: false })).status, 403);
  assert.equal((await transport.fetch(`${DEMO_ORIGIN}/unimplemented`)).status, 403);
  assert.deepEqual(transport.snapshot(), before);
});
