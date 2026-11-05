// Isolated browser test: every external request is intercepted; no hosted writes.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { expect } = require('playwright/test');
const base = process.env.PRICING_UI_BASE_URL ?? 'http://127.0.0.1:5191';
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
const output = process.env.PRICING_UI_OUTPUT ?? '/tmp/ecovis-pricing-check/ui';
await mkdir(output, { recursive: true });
const uid = '00000000-0000-4000-8000-000000000001';
const company = '00000000-0000-4000-8000-000000000002';
const client = { id: '00000000-0000-4000-8000-000000000003', company_id: company,
  name: 'Pricing test client', client_code: 'TST', is_active: true,
  available_hours_per_month: 0, hours_from_previous_month: 0, invoice_attachment_language: 'hu' };
const names = ['Priced project', 'Missing indexed price', 'Zero priced project', 'No annual price', 'Previous year price'];
const projects = names.map((name, i) => ({ id: `00000000-0000-4000-8000-${String(i + 10).padStart(12, '0')}`,
  client_id: client.id, company_id: company, name, is_active: true, estimated_hours_per_month: 0 }));
const prices = [156.6, null, 0, undefined, 100].flatMap((fee, i) => fee === undefined ? [] : [{
  project_id: projects[i].id, company_id: company, pricing_year: i === 4 ? 2025 : 2026,
  original_fee: 150, original_fee_text: null, indexed_fee: fee, unit: 'óra', currency: 'EUR',
  original_currency: 'EUR', original_unit: 'óra', index_code: 'ksh',
}]);
const billingProfile = { client_id: client.id, company_id: company, billing_name: 'Pricing buyer',
  billing_country_code: 'HU', billing_postal_code: '1111', billing_city: 'Budapest', billing_address: 'Test street',
  tax_subject: 1, tax_number: '12345678-2-41', eu_vat_number: null, group_tax_number: null,
  billing_email: null, send_invoice_email: false, invoice_language: 'hu', payment_method: 'Átutalás',
  payment_term_days: 8, vat_code: 'AAM', automatic_invoicing_enabled: false, invoice_schedule_day: 1,
  attach_timesheet_report: true, net_unit_price: 999999, currency: 'USD', billing_model: 'hourly',
  invoice_item_name: 'Old item', invoice_unit: 'hour', updated_at: '2026-10-01T00:00:00Z' };
const annexMetadata = { filename: 'invoice-annex-TST-2026-10-01-2026-10-31.xlsx',
  media_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  size_bytes: 7000, sha256: 'b'.repeat(64), language: 'hu' };
const errors = [];
async function open(language = 'en', failPrices = false, initialTime = '2026-10-28T12:00:00Z', routePath = '/admin/settings', initialHistory = []) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const user = { id: uid, email: 'pricing-test@example.invalid', role: 'authenticated', aud: 'authenticated', app_metadata: {}, user_metadata: {} };
  const exp = 2082758400;
  const token = [{ alg: 'HS256', typ: 'JWT' }, { sub: uid, exp, role: 'authenticated' }, 'fake']
    .map(x => typeof x === 'string' ? x : Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
  const session = { access_token: token, refresh_token: 'fake', expires_at: exp, expires_in: 3600, token_type: 'bearer', user };
  const profile = { ...user, company_id: company, role: 'company_admin', full_name: 'Price Tester', is_active: true, company: { is_active: true } };
  await context.addInitScript(({ session, language }) => {
    localStorage.setItem('i18nextLng', language);
    localStorage.setItem('sb-price-tests-auth-token', JSON.stringify(session));
  }, { session, language });
  const writes = [];
  const contextPrices = structuredClone(prices);
  const priceWrites = [];
  const indexWrites = [];
  const apiCalls = [];
  const profileWrites = [];
  const contextBillingProfile = structuredClone(billingProfile);
  let legacyReview = false;
  let invoiceHistory = structuredClone(initialHistory);
  let stornoReconciliations = 0;
  if (routePath === '/admin/billing') contextPrices.find(p => p.project_id === projects[2].id).unit = 'hó';
  let selectedYear = 2026;
  const indexRates = ['ksh','eu'].map(index_code => ({ company_id: company, index_code, effective_year: 2026, rate: index_code === 'ksh' ? .044 : .024 }));
  let failSave = false;
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === base) return route.continue();
    const json = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (url.pathname.endsWith('/claim_company_invitation')) return json(null);
    if (req.method() !== 'GET' && req.method() !== 'HEAD' && !url.pathname.includes('/rpc/')) writes.push(url.pathname);
    if (url.pathname.endsWith('/ensure_company_project_pricing')) {
      assert.equal(req.postDataJSON().p_company_id, company); return json(0);
    }
    if (url.pathname.includes('/auth/')) return json(user);
    if (url.hostname === 'price-api.invalid') {
      if (url.pathname.endsWith('/history')) return json(invoiceHistory);
      if (url.pathname.endsWith('/client-attachment') || url.pathname.endsWith('/attachment')) {
        const isPreview = url.pathname.endsWith('/client-attachment');
        if (isPreview) {
          const payload = req.postDataJSON();
          assert.equal(payload.review_fingerprint, 'a'.repeat(64));
          assert.deepEqual(payload.project_quantities, { [projects[2].id]: 1 });
          apiCalls.push({ endpoint: 'annex-preview', payload });
          if (apiCalls.filter(c => c.endpoint === 'annex-preview').length === 1) {
            return route.fulfill({ contentType: 'text/html', body: '<html>not a workbook</html>' });
          }
        }
        return route.fulfill({ contentType: annexMetadata.media_type, body: Buffer.from('PK\x03\x04synthetic-workbook'),
          headers: { 'Access-Control-Expose-Headers': 'Content-Disposition', 'Content-Disposition': `attachment; filename="${annexMetadata.filename}"` } });
      }
      if (url.pathname.endsWith('/storno/pdf') || url.pathname.endsWith('/pdf')) {
        return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\nsynthetic invoice',
          headers: { 'Access-Control-Expose-Headers': 'Content-Disposition', 'Content-Disposition': `attachment; filename="${url.pathname.endsWith('/storno/pdf') ? 'storno' : 'original'}.pdf"` } });
      }
      if (url.pathname.endsWith('/storno') || url.pathname.endsWith('/storno/reconcile')) {
        const payload = req.postDataJSON();
        apiCalls.push({ endpoint: url.pathname.endsWith('/reconcile') ? 'storno-reconcile' : 'storno', payload });
        assert.equal(payload.company_id, company);
        assert.equal(payload.original_invoice_number, 'TEST-ORIGINAL');
        assert.equal(payload.confirm, true);
        assert.ok(payload.reason.trim());
        if (url.pathname.endsWith('/storno')) {
          invoiceHistory[0].reversal = { id: 'storno-id', status: 'uncertain', reason: payload.reason,
            issue_date: '2026-11-04', e_invoice: true, invoice_number: null, net_total: null,
            gross_total: null, pdf_available: false, attempt_count: 1, error_message: 'Storno outcome unconfirmed.' };
          return json({ detail: 'Storno response lost. Check history and reconcile.' }, 502);
        }
        assert.equal(payload.resolution, 'reversed');
        assert.equal(payload.reversal_invoice_number, 'TEST-STORNO');
        if (stornoReconciliations++ === 0) return json({ detail: 'Provider storno reference does not match.' }, 409);
        invoiceHistory[0].status = 'reversed';
        Object.assign(invoiceHistory[0].reversal, { status: 'reversed', invoice_number: 'TEST-STORNO',
          net_total: '-313.2', gross_total: '-313.2', pdf_available: true, error_message: null });
        return json(invoiceHistory[0]);
      }
      if (url.pathname.endsWith('/client-preview')) {
        apiCalls.push({ endpoint: 'preview', payload: req.postDataJSON() });
        return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\nmock preview' });
      }
      if (url.pathname.endsWith('/client-issue')) {
        apiCalls.push({ endpoint: 'issue', payload: req.postDataJSON() });
        return json({ detail: 'Project prices changed; review again' }, 409);
      }
      if (url.pathname.endsWith('/client-review')) {
        const payload = req.postDataJSON(); apiCalls.push({ endpoint: 'review', payload });
        const items = [0,2].map(i => ({ project_id: projects[i].id, project_name: projects[i].name,
          pricing_year: 2026, pricing_updated_at: '2026-10-28T10:00:00Z', quantity: i === 0 ? '2' : '1',
          unit: i === 0 ? 'óra' : 'hó', net_unit_price: i === 0 ? '156.6' : '0', currency: 'EUR',
          vat_code: 'AAM', net_total: i === 0 ? '313.2' : '0', vat_total: '0', gross_total: i === 0 ? '313.2' : '0' }));
        return json({ ...payload, client_code: client.client_code, client_name: client.name,
          issue_date: '2026-10-28', fulfillment_date: contextBillingProfile.fulfillment_date_policy === 'due_date' ? '2026-11-05' : payload.period_end, due_date: '2026-11-05',
          e_invoice: contextBillingProfile.invoice_electronic ?? false,
          invoice_prefix: contextBillingProfile.invoice_prefix,
          seller_bank_name: contextBillingProfile.seller_bank_name,
          seller_bank_account: contextBillingProfile.seller_bank_account,
          invoice_comment: `Service period: ${payload.period_start} - ${payload.period_end}`,
          attach_timesheet_report: contextBillingProfile.attach_timesheet_report,
          attachment: contextBillingProfile.attach_timesheet_report ? annexMetadata : null,
          payment_method: 'Átutalás', language: 'hu', billing_model: legacyReview ? 'hourly' : 'project',
          item_name: 'Project services', quantity: '1', unit: 'számla', net_unit_price: '313.2', currency: 'EUR',
          vat_code: 'AAM', net_total: '313.2', vat_total: '0', gross_total: '313.2',
          recipient: { name: 'Pricing buyer', postal_code: '1111', city: 'Budapest', address: 'Test street',
            country: 'HU', email: null, send_email: false, tax_subject: 1, tax_number: '12345678-2-41' },
          approved_entries: [{ id: '00000000-0000-4000-8000-000000000090', project_id: projects[0].id, project_name: projects[0].name, work_date: payload.period_start, hours_logged: '2', description: 'Approved work' }], items, review_fingerprint: 'a'.repeat(64) });
      }
      return json({ invoice_provider: 'szamlazz_hu', api_key_configured: routePath === '/admin/billing' });
    }
    const table = url.pathname.split('/').at(-1);
    if (table === 'profiles') return json(profile);
    if (table === 'companies') return json({ id: company, name: 'Pricing Test Company', enabled_modules: ['leave_attachments', 'invoicing'], is_active: true, is_deleted: false, szamlazz_test_mode: routePath !== '/admin/billing', leave_client_id: null, leave_project_id: null });
    if (table === 'clients') return json([client]);
    if (table === 'projects') return json(projects);
    if (table === 'client_billing_profiles') {
      if (req.method() === 'POST') {
        const value = req.postDataJSON(); profileWrites.push(value);
        for (const field of ['net_unit_price','currency','billing_model','invoice_item_name','invoice_unit']) assert.ok(!(field in value));
        Object.assign(contextBillingProfile, value);
        return json(contextBillingProfile);
      }
      return json([contextBillingProfile]);
    }
    if (table === 'company_price_indexes') {
      if (req.method() === 'POST') { indexWrites.push(req.postDataJSON()); return json(null); }
      return json(Number(url.searchParams.get('offset') ?? 0) > 0 ? [] : indexRates);
    }
    if (table === 'project_pricing') {
      if (req.method() !== 'POST') {
        assert.equal(url.searchParams.get('company_id'), `eq.${company}`);
        selectedYear = Number(url.searchParams.get('pricing_year')?.replace('eq.', ''));
        assert.ok([2026, 2027].includes(selectedYear));
      }
      if (req.method() === 'PATCH') {
        if (failSave) return json({ message: 'Simulated write failure' }, 400);
        const id = url.searchParams.get('project_id')?.replace('eq.', '');
        const row = contextPrices.find(price => price.project_id === id && price.pricing_year === 2026);
        assert.ok(row);
        const changes = req.postDataJSON();
        priceWrites.push(changes);
        assert.ok(!('original_fee' in changes) && !('original_currency' in changes) && !('original_unit' in changes));
        Object.assign(row, changes);
        return json({ project_id: row.project_id });
      }
      if (req.method() === 'POST') {
        const value = req.postDataJSON();
        // INSERT scopes through its body; query filters are read/update-only.
        assert.equal(value.company_id, company);
        assert.equal(value.pricing_year, 2026);
        assert.ok(projects.some(project => project.id === value.project_id));
        contextPrices.push({ ...value, original_fee: null, original_fee_text: null, original_currency: null, original_unit: null });
        return json({ project_id: value.project_id });
      }
      if (failPrices) return json({ message: 'Price load failed' }, 403);
      const offset = Number(url.searchParams.get('offset') ?? 0);
      return json(contextPrices.filter(price => price.pricing_year === selectedYear).slice(offset));
    }
    return json([]);
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(initialTime));
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') console.log('browser:', message.text()); });
  page.on('requestfailed', request => console.log('request failed:', request.url(), request.failure()));
  await page.goto(`${base}${routePath}`);
  try {
    await expect(routePath === '/admin/settings' ? page.getByRole('heading', { name: 'Missing indexed price', exact: true })
      : page.getByRole('region', { name: language === 'hu' ? 'Projektdíjak és mennyiségek' : 'Project prices and quantities' })).toBeVisible({ timeout: 10000 });
  } catch (error) {
    await page.screenshot({ animations: 'disabled', path: `${output}/failure-${language}.png` });
    console.log({ language, initialTime, url: page.url(), text: (await page.locator('body').innerText()).slice(0, 1600), errors });
    throw error;
  }
  return { context, page, writes, priceWrites, indexWrites, apiCalls, profileWrites, legacyReview: value => { legacyReview = value; }, getPrices: () => contextPrices, failSave: value => { failSave = value; } };
}
try {
  const app = await open();
  const { context, page, writes } = app;
  await expect(page.getByText('3 projects need a 2026 price')).toBeVisible();
  const article = name => page.locator('article').filter({ has: page.getByRole('heading', { name, exact: true }) });
  for (const name of ['Missing indexed price', 'No annual price', 'Previous year price']) {
    await expect(article(name).getByText('2026 price missing')).toBeVisible();
    await expect(article(name)).toHaveClass(/bg-warning-bg/);
  }
  for (const name of ['Priced project', 'Zero priced project']) {
    await expect(article(name).getByText('2026 price missing')).toHaveCount(0);
    await expect(article(name)).not.toHaveClass(/bg-warning-bg/);
  }
  await expect(article('Zero priced project').getByText('0 EUR · óra', { exact: true })).toBeVisible();
  await expect(article('Missing indexed price').getByText('150 EUR · óra', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show missing prices' }).click();
  await expect(page.locator('article[data-project-id]')).toHaveCount(3);
  await page.getByRole('button', { name: 'Show all projects' }).click();
  await expect(page.locator('article[data-project-id]')).toHaveCount(5);
  await article('Missing indexed price').scrollIntoViewIfNeeded();
  await page.screenshot({ animations: 'disabled', path: `${output}/desktop.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await article('Missing indexed price').scrollIntoViewIfNeeded();
  await page.screenshot({ animations: 'disabled', path: `${output}/mobile.png` });
  const overflow = await page.evaluate(() => [...document.querySelectorAll('*')]
    .filter(element => element.getBoundingClientRect().right > window.innerWidth + 1)
    .map(element => ({ tag: element.tagName, class: element.className, right: element.getBoundingClientRect().right })).slice(0, 12));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), JSON.stringify(overflow));
  assert.deepEqual(writes, []);
  await expect(page.getByRole('heading', { name: 'Price indexes for 2027' })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'KSH inflation (%)' })).toHaveValue('4.4');
  await expect(page.getByRole('spinbutton', { name: 'EU inflation (%)' })).toHaveValue('2.4');
  await page.getByRole('spinbutton', { name: 'KSH inflation (%)' }).fill('5.5');
  await page.getByRole('button', { name: 'Save indexes', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Indexes saved for 2027.' })).toBeVisible();
  assert.deepEqual(app.indexWrites[0], [
    { company_id: company, index_code: 'ksh', effective_year: 2027, rate: .055 },
    { company_id: company, index_code: 'eu', effective_year: 2027, rate: .024 }]);
  assert.equal(app.getPrices()[0].indexed_fee, 156.6);
  writes.length = 0;
  await page.setViewportSize({ width: 1366, height: 900 });
  await article('Missing indexed price').getByRole('button', { name: 'Edit pricing', exact: true }).click();
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await expect.poll(async () => Math.round((await modal.boundingBox()).width)).toBeLessThanOrEqual(512);
  await page.screenshot({ animations: 'disabled', path: `${output}/pricing-modal-desktop.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => Math.round((await modal.boundingBox()).width)).toBeLessThanOrEqual(358);
  const mobileModal = await modal.boundingBox();
  assert.ok(mobileModal.x >= 16 && mobileModal.y > 0 && mobileModal.y + mobileModal.height < 844);
  await page.screenshot({ animations: 'disabled', path: `${output}/pricing-modal-mobile.png` });
  await page.setViewportSize({ width: 1366, height: 900 });
  await modal.getByRole('spinbutton', { name: '2026 indexed price' }).fill('200');
  await expect(modal.getByRole('textbox', { name: /^(Currency|Unit)$/ })).toHaveCount(0);
  await expect(modal.getByRole('button', { name: 'Unit', exact: true })).toHaveText('Hour');
  await modal.getByRole('button', { name: 'Currency', exact: true }).click();
  await page.getByRole('option', { name: 'HUF – Hungarian Forint', exact: true }).click();
  await modal.getByRole('button', { name: 'Unit', exact: true }).click();
  await page.getByRole('option', { name: 'Month', exact: true }).click();
  await modal.getByRole('spinbutton', { name: 'Default monthly quantity', exact: true }).fill('1');
  await modal.getByRole('textbox', { name: 'Invoice line name', exact: true }).fill('Accounting service');
  await modal.getByRole('textbox', { name: 'Invoice line note', exact: true }).fill('According to the annex');
  await modal.getByRole('textbox', { name: 'Purchase order reference', exact: true }).fill('PO-2026');
  await modal.getByRole('button', { name: 'Annual increase' }).click();
  await page.getByRole('option', { name: 'EU inflation', exact: true }).click();
  app.failSave(true);
  await modal.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(modal.getByRole('alert')).toContainText('Pricing could not be saved');
  await expect(modal.getByRole('spinbutton', { name: '2026 indexed price', exact: true })).toHaveValue('200');
  app.failSave(false);
  await modal.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(modal).toHaveCount(0);
  assert.equal(app.priceWrites.at(-1)?.unit, 'hó');
  assert.equal(app.priceWrites.at(-1)?.currency, 'HUF');
  assert.equal(app.priceWrites.at(-1)?.recurring_quantity, 1);
  assert.equal(app.priceWrites.at(-1)?.invoice_name, 'Accounting service');
  assert.equal(app.priceWrites.at(-1)?.attachment_note, 'According to the annex');
  assert.equal(app.priceWrites.at(-1)?.po_number, 'PO-2026');
  await expect(article('Missing indexed price').getByText('200 HUF · hó', { exact: true })).toBeVisible();
  await expect(article('Missing indexed price').getByText('150 EUR · óra', { exact: true })).toBeVisible();
  await expect(article('Missing indexed price').getByText('2026 price missing')).toHaveCount(0);
  await expect(page.getByText('2 projects need a 2026 price')).toBeVisible();
  await article('Missing indexed price').getByRole('button', { name: 'Edit pricing', exact: true }).click();
  await expect(modal.getByRole('spinbutton', { name: 'Default monthly quantity', exact: true })).toHaveValue('1');
  await expect(modal.getByRole('textbox', { name: 'Invoice line name', exact: true })).toHaveValue('Accounting service');
  await modal.getByRole('spinbutton', { name: '2026 indexed price' }).fill('');
  await expect(modal.getByRole('spinbutton', { name: '2026 indexed price' })).toHaveValue('');
  await modal.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(modal).toHaveCount(0);
  assert.equal(app.priceWrites.at(-1)?.index_code, 'eu');
  assert.equal(app.priceWrites.at(-1)?.indexed_fee, null, JSON.stringify(app.priceWrites));
  assert.equal(app.getPrices().find(price => price.project_id === projects[1].id).indexed_fee, null);
  await expect(article('Missing indexed price').getByText('2026 price missing')).toBeVisible();
  await expect(page.getByText('3 projects need a 2026 price')).toBeVisible();
  await article('No annual price').getByRole('button', { name: 'Edit pricing', exact: true }).click();
  await modal.getByRole('spinbutton', { name: '2026 indexed price' }).fill('300');
  await modal.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(article('No annual price').getByText('300 HUF · óra', { exact: true })).toBeVisible();
  await expect(article('No annual price').getByText('2026 price missing')).toHaveCount(0);
  assert.ok(writes.every(path => path.endsWith('/project_pricing')));
  await context.close();
  const hu = await open('hu');
  await expect(hu.page.getByText('3 projektnél hiányzik a 2026. évi díj')).toBeVisible();
  await expect(hu.page.getByText('Hiányzó 2026. évi díj')).toHaveCount(3);
  await hu.page.locator('article').filter({ has: hu.page.getByRole('heading', { name: 'Priced project', exact: true }) })
    .getByRole('button', { name: 'Díjazás szerkesztése', exact: true }).click();
  const huModal = hu.page.getByRole('dialog');
  await expect(huModal.getByRole('button', { name: 'Egység', exact: true })).toHaveText('Óra');
  await huModal.getByRole('button', { name: 'Deviza', exact: true }).click();
  await expect(hu.page.getByRole('option', { name: 'HUF – magyar forint', exact: true })).toBeVisible();
  await hu.page.getByRole('option', { name: 'EUR – euró', exact: true }).click();
  await huModal.getByRole('button', { name: 'Egység', exact: true }).click();
  await expect(hu.page.getByRole('option', { name: 'Fő / hónap', exact: true })).toBeVisible();
  await hu.page.getByRole('option', { name: 'Hónap', exact: true }).click();
  await hu.page.screenshot({ animations: 'disabled', path: `${output}/pricing-selects-hu.png` });
  await hu.context.close();
  const rollover = await open('en', false, '2026-12-31T22:59:58Z');
  await rollover.page.locator('article').filter({ has: rollover.page.getByRole('heading', { name: 'Priced project', exact: true }) })
    .getByRole('button', { name: 'Edit pricing', exact: true }).click();
  await rollover.page.clock.setFixedTime(new Date('2026-12-31T23:00:01Z'));
  await expect(rollover.page.getByRole('heading', { name: 'Price indexes for 2028' })).toBeVisible();
  await expect(rollover.page.getByText('5 projects need a 2027 price')).toBeVisible();
  await expect(rollover.page.getByRole('dialog')).toContainText('2026');
  await rollover.page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await rollover.page.locator('article').filter({ has: rollover.page.getByRole('heading', { name: 'Priced project', exact: true }) })
    .getByRole('button', { name: 'Edit pricing', exact: true }).click();
  await expect(rollover.page.getByRole('dialog')).toContainText('2027');
  await rollover.context.close();
  const failure = await open('en', true);
  await expect(failure.page.getByText('Some data could not be loaded. Please try again.')).toBeVisible({ timeout: 15000 });
  await expect(failure.page.getByText('2026 price missing')).toHaveCount(0);
  await failure.context.close();

  const billing = await open('en', false, undefined, '/admin/billing');
  const billingPage = billing.page;
  await billingPage.getByRole('button', { name: 'Invoice document type', exact: true }).click();
  await billingPage.getByRole('option', { name: 'Electronic invoice', exact: true }).click();
  await billingPage.getByRole('button', { name: 'Fulfillment date', exact: true }).click();
  await billingPage.getByRole('option', { name: 'Payment deadline', exact: true }).click();
  await billingPage.getByRole('textbox', { name: 'Invoice numbering prefix', exact: true }).fill('E-ECS');
  await billingPage.getByRole('checkbox', { name: /Save billing report and attach/ }).uncheck();
  await billingPage.getByRole('textbox', { name: 'Seller bank name', exact: true }).fill('K&H Bank');
  await billingPage.getByRole('button', { name: 'Save billing profile', exact: true }).click();
  await expect(billingPage.getByText('Enter both the seller bank name and account, or leave both blank.', { exact: true })).toBeVisible();
  assert.equal(billing.profileWrites.length, 0);
  await billingPage.getByRole('textbox', { name: 'Seller bank account / IBAN', exact: true }).fill('HU-TEST-IBAN');
  await billingPage.getByRole('button', { name: 'Save billing profile', exact: true }).click();
  await expect.poll(() => billing.profileWrites.length).toBe(1);
  assert.equal(billing.profileWrites[0].attach_timesheet_report, false);
  await billingPage.getByRole('checkbox', { name: /Save billing report and attach/ }).check();
  await billingPage.getByRole('button', { name: 'Save billing profile', exact: true }).click();
  await expect.poll(() => billing.profileWrites.length).toBe(2);
  assert.equal(billing.profileWrites[1].attach_timesheet_report, true);
  assert.equal(billing.profileWrites[0].invoice_electronic, true);
  assert.equal(billing.profileWrites[0].fulfillment_date_policy, 'due_date');
  assert.equal(billing.profileWrites[0].invoice_prefix, 'E-ECS');
  assert.equal(billing.profileWrites[0].seller_bank_account, 'HU-TEST-IBAN');
  await expect(billingPage.getByRole('button', { name: 'Download preview', exact: true })).toBeEnabled();
  const billingPrices = billingPage.getByRole('region', { name: 'Project prices and quantities' });
  await expect(billingPrices.getByText('156.6 EUR · óra', { exact: true })).toBeVisible();
  await expect(billingPrices.getByText('2026 price missing')).toHaveCount(3);
  await expect(billingPage.getByRole('spinbutton', { name: 'Net unit price', exact: true })).toHaveCount(0);
  await expect(billingPage.getByRole('textbox', { name: 'Currency', exact: true })).toHaveCount(0);
  await expect(billingPrices.getByRole('link', { name: 'Manage project prices' })).toHaveAttribute('href','/admin/settings');
  await billingPrices.getByRole('spinbutton', { name: 'Zero priced project quantity (hó)' }).fill('1');
  const download = billingPage.waitForEvent('download');
  await billingPage.getByRole('button', { name: 'Download preview', exact: true }).click();
  await download;
  assert.deepEqual(billing.apiCalls.at(-1).payload.project_quantities, { [projects[2].id]: 1 });
  assert.ok(!('net_unit_price' in billing.apiCalls.at(-1).payload));
  await billingPage.getByRole('button', { name: 'Review and issue', exact: true }).click();
  const invoiceModal = billingPage.getByRole('dialog');
  await expect(invoiceModal.getByText(/Electronic invoice/)).toBeVisible();
  await expect(invoiceModal.getByText('K&H Bank · HU-TEST-IBAN', { exact: true })).toBeVisible();
  await expect(invoiceModal.getByText(/Service period: /)).toBeVisible();
  await expect(invoiceModal.getByRole('table').first().getByRole('cell', { name: 'Priced project', exact: true })).toBeVisible();
  await expect(invoiceModal.getByRole('cell', { name: '156.6 EUR', exact: true })).toBeVisible();
  await expect(invoiceModal.getByRole('cell', { name: 'Zero priced project', exact: true })).toBeVisible();
  await expect(invoiceModal.getByRole('button', { name: 'Issue live invoice', exact: true })).toBeDisabled();
  await expect(invoiceModal.getByText('Saved with the invoice. Email delivery is disabled.', { exact: true })).toBeVisible();
  await invoiceModal.getByRole('button', { name: 'Review billing report', exact: true }).click();
  await expect(invoiceModal.getByText('The server did not return a valid billing workbook.', { exact: true })).toBeVisible();
  const annexDownload = billingPage.waitForEvent('download');
  await invoiceModal.getByRole('button', { name: 'Review billing report', exact: true }).click();
  assert.equal((await annexDownload).suggestedFilename(), annexMetadata.filename);
  await expect(invoiceModal.getByText('The server did not return a valid billing workbook.', { exact: true })).toHaveCount(0);
  await invoiceModal.screenshot({ animations: 'disabled', path: `${output}/invoice-project-review.png` });
  await invoiceModal.getByRole('checkbox').check();
  await invoiceModal.getByRole('button', { name: 'Issue live invoice', exact: true }).click();
  await expect(invoiceModal.getByText('Project prices changed; review again')).toBeVisible();
  assert.equal(billing.apiCalls.at(-1).endpoint,'issue');
  assert.deepEqual(billing.apiCalls.at(-1).payload.project_quantities, { [projects[2].id]: 1 });
  await invoiceModal.getByRole('button', { name: 'Cancel', exact: true }).click();
  billing.legacyReview(true);
  await billingPage.getByRole('button', { name: 'Review and issue', exact: true }).click();
  await expect(billingPage.getByText('Project pricing is unavailable. Refresh the invoice after the application update.')).toBeVisible();
  await expect(billingPage.getByRole('dialog')).toHaveCount(0);
  assert.ok(!billing.writes.some(path => path.endsWith('/project_pricing')));
  await billingPrices.scrollIntoViewIfNeeded();
  await billingPage.screenshot({ animations: 'disabled', path: `${output}/invoice-pricing-desktop.png` });
  await billing.context.close();

  for (const language of ['en','hu']) {
    const { clientBilling: labels, common } = JSON.parse(await readFile(new URL(`../../src/locales/${language}.json`, import.meta.url), 'utf8'));
    const fixture = { id: '00000000-0000-4000-8000-000000000099', company_id: company,
      client_id: client.id, client_name: client.name, period_start: '2026-10-01', period_end: '2026-10-31',
      status: 'issued', provider: 'szamlazz_hu', external_id: 'chronosync-synthetic', recipient_name: 'Pricing buyer',
      send_email: false, quantity: '1', unit: 'számla', net_unit_price: '313.2', vat_code: 'AAM',
      currency: 'EUR', net_total: '313.2', vat_total: '0', gross_total: '313.2',
      invoice_number: 'TEST-ORIGINAL', pdf_available: true, attempt_count: 1, attachment: annexMetadata, attachment_available: true };
    const stornoApp = await open(language, false, '2026-11-04T12:00:00Z', '/admin/billing', [fixture]);
    const stornoPage = stornoApp.page;
    if (language === 'hu') await stornoPage.setViewportSize({ width: 390, height: 844 });
    await stornoPage.getByRole('button', { name: labels.storno.action, exact: true }).click();
    const submit = stornoPage.getByRole('button', { name: labels.storno.submit, exact: true });
    await expect(submit).toBeDisabled();
    await stornoPage.getByLabel(labels.storno.reason, { exact: true }).fill('Correction');
    await stornoPage.getByRole('dialog').getByRole('checkbox').check();
    await stornoPage.getByLabel(labels.storno.originalNumber, { exact: true }).fill('WRONG');
    await expect(submit).toBeDisabled();
    assert.equal(stornoApp.apiCalls.length, 0);
    await stornoPage.getByLabel(labels.storno.originalNumber, { exact: true }).fill('TEST-ORIGINAL');
    await expect(submit).toBeEnabled();
    await expect(stornoPage.getByRole('dialog')).toBeVisible();
    assert.ok(await stornoPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await stornoPage.screenshot({ path: `${output}/storno-confirmation-${language}.png`, animations: 'disabled' });
    await submit.click();
    await expect(stornoPage.getByRole('alert')).toHaveText('Storno response lost. Check history and reconcile.');
    assert.equal(stornoApp.apiCalls.filter(c => c.endpoint === 'storno').length, 1);
    await stornoPage.getByRole('button', { name: common.cancel, exact: true }).click();
    await expect(stornoPage.getByRole('button', { name: labels.storno.action, exact: true })).toHaveCount(0);
    await stornoPage.getByRole('button', { name: labels.storno.recordExisting, exact: true }).click();
    await stornoPage.getByLabel(labels.storno.originalNumber, { exact: true }).fill('TEST-ORIGINAL');
    await stornoPage.getByLabel(labels.storno.reversalNumber, { exact: true }).fill('TEST-STORNO');
    await stornoPage.getByRole('dialog').getByRole('checkbox').check();
    await stornoPage.getByRole('button', { name: labels.storno.verify, exact: true }).click();
    await expect(stornoPage.getByRole('alert')).toHaveText('Provider storno reference does not match.');
    await expect(stornoPage.getByLabel(labels.storno.reversalNumber, { exact: true })).toHaveValue('TEST-STORNO');
    await stornoPage.getByRole('button', { name: labels.storno.verify, exact: true }).click();
    await expect(stornoPage.getByRole('dialog')).toHaveCount(0);
    await expect(stornoPage.getByText(labels.invoiceStatus.reversed, { exact: true })).toBeVisible();
    for (const [button, filename] of [[labels.downloadInvoicePdf,'original.pdf'],[labels.storno.download,'storno.pdf'],[labels.annex.downloadSaved,annexMetadata.filename]]) {
      const downloadEvent = stornoPage.waitForEvent('download');
      await stornoPage.getByRole('button', { name: button, exact: true }).click();
      assert.equal((await downloadEvent).suggestedFilename(), filename);
    }
    assert.equal(stornoApp.apiCalls.filter(c => c.endpoint === 'storno').length, 1);
    await stornoPage.screenshot({ path: `${output}/storno-history-${language}.png`, animations: 'disabled' });
    await stornoApp.context.close();
  }
  assert.deepEqual(errors, []);
  console.log('Passed: tenant/year query, missing and absent prices, zero price, original fee, attention filter, editing and clearing prices, preserved original denomination, failed save recovery, English/Hungarian labels, load failure, desktop/mobile layout, price-only writes, editable index settings without repricing, Budapest New Year label rollover, read-only invoice rates, explicit quantities, review lines, changed-price rejection, refusal of legacy-rate reviews, storno confirmation, timeout recovery, reference-mismatch rejection, retained original/storno PDF downloads, mobile Hungarian storno, saved annex preferences, reviewed workbook validation/download recovery and archived annex downloads.');
} finally {
  await browser.close();
}
