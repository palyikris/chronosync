// All HTTP requests outside the local harness are intercepted. No real clients are modified.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const playwrightPath = process.env.PLAYWRIGHT_MODULE_PATH || 'playwright';
const { chromium } = require(playwrightPath);
const { expect } = require(`${playwrightPath}/test`);
const XLSX = require('xlsx');
const base = process.env.PARTNER_IMPORT_UI_BASE_URL || 'http://127.0.0.1:5187';
const output = process.env.PARTNER_IMPORT_UI_OUTPUT || '/tmp/chronosync-partner-import-ui';
const company = '20000000-0000-4000-8000-000000000001';
const first = '30000000-0000-4000-8000-000000000001';
const second = '30000000-0000-4000-8000-000000000002';
const initialClients = [{ id: first, company_id: company, name: 'Árvíz & Társai Kft.', client_code: 'ARV', is_active: true, invoice_attachment_language: 'hu' },
  { id: second, company_id: company, name: 'Második Zrt.', client_code: 'MAS', is_active: true, invoice_attachment_language: 'hu' }];
const seedProfile = { client_id: first, company_id: company, billing_name: 'Saved billing name', billing_country_code: 'HU',
  billing_postal_code: null, billing_city: null, billing_address: null, billing_email: 'saved@example.invalid',
  tax_subject: 1, tax_number: '12345678-2-41', eu_vat_number: null, group_tax_number: null, payment_term_days: 0,
  payment_method: 'Átutalás', invoice_language: 'hu', vat_code: '27', automatic_invoicing_enabled: false,
  invoice_schedule_day: 1, attach_timesheet_report: true, send_invoice_email: false,
  created_at: '2026-11-06T00:00:00Z', updated_at: '2026-11-06T00:00:00Z' };
const headers = ['partner neve', 'partner azonosító', 'ország', 'irányítószám', 'település', 'utca és házszám', 'adószám', 'email cím', 'adóalany', 'fizetési határidő (nap)'];
const partnerRows = [
  ['Árvíz & Társai Kft.', 'ARV', 'Magyarország', '1051', 'Budapest', 'Fő utca 1.', '12345678-2-41', 'incoming@example.invalid, other@example.invalid', 'van magyar adószáma', '30'],
  ['Unknown partner', 'MAS', 'HU', '6720', 'Szeged', 'Tisza utca 2.', '87654321-2-06', 'contact@example.invalid; second@example.invalid', 'van magyar adószáma', '15'],
];
function workbook(type, rows = partnerRows) {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([headers, ...rows]), 'Partnerek');
  return XLSX.write(book, { type: 'buffer', bookType: type });
}
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
try {
  for (const language of ['en', 'hu']) for (const width of [1280, 390]) {
    const { clientBilling: billing, common } = JSON.parse(await readFile(new URL(`../../src/locales/${language}.json`, import.meta.url), 'utf8'));
    const text = billing.partnerImport;
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const errors = [], requests = [];
    let profiles = [structuredClone(seedProfile)], clients = structuredClone(initialClients), pending;
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === base) return route.continue();
      const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname.endsWith('/rpc/import_client_billing_details')) {
        const payload = request.postDataJSON();
        assert.equal(payload.p_company_id, company);
        assert.equal(payload.p_rows.length, 2);
        assert.equal(payload.p_rows[0].client_id, first);
        assert.equal(payload.p_rows[1].client_id, second);
        assert.ok(payload.p_rows.every(row => !Object.hasOwn(row.data, 'client_code') && !Object.hasOwn(row.data, 'send_invoice_email')));
        assert.ok(payload.p_rows.every(row => row.data.tax_subject === 1));
        assert.equal(payload.p_rows[0].data.billing_email, undefined);
        assert.equal(payload.p_rows[1].data.billing_email, 'second@example.invalid');
        requests.push(payload);
        pending = async (fail = false) => {
          if (fail) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Unavailable"}' });
          profiles = [{ ...seedProfile, billing_postal_code: '1051', billing_city: 'Budapest', billing_address: 'Fő utca 1.' },
            { ...seedProfile, client_id: second, billing_name: 'Unknown partner', tax_number: '87654321-2-06',
              billing_postal_code: '6720', billing_city: 'Szeged', billing_address: 'Tisza utca 2.', billing_email: 'second@example.invalid', payment_term_days: 15 }];
          return json([{ client_id: first, status: 'updated', fields: ['billing_postal_code','billing_city','billing_address'] },
            { client_id: second, status: 'updated', fields: ['billing_name','billing_postal_code','billing_city','billing_address','tax_number','billing_email'] }]);
        };
        return;
      }
      if (url.pathname.endsWith('/clients')) return json(url.searchParams.get('offset') === '0' || !url.searchParams.has('offset') ? clients : []);
      if (url.pathname.endsWith('/client_billing_profiles')) return json(url.searchParams.get('offset') === '0' || !url.searchParams.has('offset') ? profiles : []);
      if (url.pathname.endsWith('/companies')) return json({ id: company, name: 'Test company', szamlazz_test_mode: true });
      if (url.pathname.endsWith('/invoice-settings')) return json({ invoice_provider: 'szamlazz_hu', api_key_configured: false });
      if (url.pathname.endsWith('/rpc/get_company_invoice_credentials')) return json({ invoice_provider: 'szamlazz_hu', api_key_configured: false });
      if (url.pathname.includes('/rest/v1/') || url.pathname.endsWith('/invoices/history')) return json([]);
      throw new Error(`Unexpected external request: ${request.method()} ${url.pathname}`);
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/tests/partner-import-ui/?lang=${language}`);
    const open = page.getByRole('button', { name: text.openButton, exact: true });
    await expect(open).toBeEnabled({ timeout: 15000 }).catch(async error => {
      console.log({ errors, body: (await page.locator('body').innerText()).slice(0, 2000) });
      throw error;
    });
    await open.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(text.chooseFile, { exact: true })).toBeVisible();
    await page.screenshot({ path: `${output}/${language}-${width}-upload.png`, fullPage: true });
    // A blank official template is rejected and the user can choose another file.
    await dialog.locator('input[type=file]').setInputFiles({ name: 'blank.xls', mimeType: 'application/vnd.ms-excel', buffer: workbook('biff8', []) });
    await expect(dialog.getByRole('alert')).toHaveText(text.errors.empty);
    const type = width === 390 ? 'xlsx' : 'biff8';
    await dialog.locator('input[type=file]').setInputFiles({ name: width === 390 ? 'partners.xlsx' : 'partners.xls',
      mimeType: 'application/octet-stream', buffer: workbook(type) });
    await expect(dialog.getByLabel(text.fields.billing_name, { exact: true })).toHaveValue('0');
    await expect(dialog.getByLabel(text.fields.client_code, { exact: true })).toHaveValue('');
    await page.screenshot({ path: `${output}/${language}-${width}-columns.png`, fullPage: true });
    await dialog.getByRole('button', { name: text.reviewMatches, exact: true }).click();
    await expect(dialog.locator('article')).toHaveCount(2);
    // The provider ID MAS does not silently match the second client.
    await expect(dialog.getByText(text.noMatch, { exact: true })).toHaveCount(1);
    await dialog.locator('article').first().getByRole('button', { expanded: false }).click();
    await expect(dialog.getByText('Saved billing name', { exact: true })).toBeVisible();
    await expect(dialog.getByText('saved@example.invalid', { exact: true })).toBeVisible();
    await expect(dialog.getByText(text.issues.invalid, { exact: false })).toHaveCount(1);
    await dialog.getByLabel(text.emailChoice, { exact: true }).selectOption('skip');
    await expect(dialog.getByText(text.issues.invalid, { exact: false })).toHaveCount(0);
    await page.screenshot({ path: `${output}/${language}-${width}-review.png`, fullPage: true });
    await dialog.locator('article').nth(1).getByRole('button', { expanded: false }).click();
    await dialog.getByRole('button', { name: text.matchClient, exact: true }).click();
    await page.getByRole('option', { name: 'Második Zrt. · MAS', exact: true }).click();
    await dialog.locator('article').nth(1).getByLabel(text.emailChoice, { exact: true }).selectOption('second@example.invalid');
    const importButton = dialog.getByRole('button', { name: text.importButton_other.replace('{{count}}', '2'), exact: true });
    await expect(importButton).toBeEnabled();
    await importButton.click();
    await expect.poll(() => Boolean(pending)).toBe(true);
    await expect(dialog.getByText(text.savingTitle, { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: common.closeDialog, exact: true })).toBeDisabled();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await page.screenshot({ path: `${output}/${language}-${width}-saving.png`, fullPage: true });
    if (language === 'en' && width === 1280) {
      await pending(true);
      await expect(dialog.getByText(text.doneWithIssues, { exact: true })).toBeVisible();
      await dialog.getByRole('button', { name: text.reviewFailed, exact: true }).click();
      await expect(importButton).toBeEnabled();
      pending = undefined;
      await importButton.click();
      await expect.poll(() => Boolean(pending)).toBe(true);
    }
    await pending();
    await expect(dialog.getByText(text.doneTitle, { exact: true })).toBeVisible();
    await page.screenshot({ path: `${output}/${language}-${width}-done.png`, fullPage: true });
    await dialog.getByRole('button', { name: text.doneButton, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    // The parent page refreshes its query cache and editable snapshot automatically.
    await expect(page.locator('#billing-city')).toHaveValue('Budapest');
    await expect(page.locator('#billing-name')).toHaveValue('Saved billing name');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    // Re-import is a no-op; no second RPC is offered for fully populated fields.
    await open.click();
    await page.getByRole('dialog').locator('input[type=file]').setInputFiles({ name: 'partners.csv', mimeType: 'text/csv',
      buffer: Buffer.from('\ufeff' + [headers, ...partnerRows].map(row => row.map(value => `"${String(value).replaceAll('"','""')}"`).join(',')).join('\r\n')) });
    await page.getByRole('button', { name: text.reviewMatches, exact: true }).click();
    for (const article of await page.getByRole('dialog').locator('article').all()) {
      await article.getByRole('button', { expanded: false }).click();
      await article.getByLabel(text.emailChoice, { exact: true }).selectOption('skip');
    }
    await expect(page.getByRole('dialog').getByRole('button', { name: text.importButton_other.replace('{{count}}', '0'), exact: true })).toBeDisabled();
    if (language === 'en' && width === 1280) {
      await page.getByRole('dialog').getByRole('button', { name: common.closeDialog, exact: true }).click();
      clients = Array.from({ length: 30 }, (_, index) => ({ ...initialClients[0],
        id: `30000000-0000-4000-8000-${String(index + 100).padStart(12, '0')}`,
        name: `Bulk client ${String(index + 1).padStart(2, '0')}`, client_code: `B${index}` }));
      profiles = [];
      const bulkRows = clients.map(client => [client.name, '', 'HU', '1051', 'Budapest', 'Bulk street', '', '', '1', '8']);
      const batches = [];
      let releaseBatch;
      await context.route('**/rpc/import_client_billing_details', route => {
        const rows = route.request().postDataJSON().p_rows;
        batches.push(rows);
        releaseBatch = () => route.fulfill({ contentType: 'application/json', body: JSON.stringify(
          rows.map(row => ({ client_id: row.client_id, status: 'updated', fields: ['billing_name','billing_city'] }))) });
      });
      await open.click();
      await page.getByRole('dialog').locator('input[type=file]').setInputFiles({ name: 'bulk.xlsx', mimeType: 'application/octet-stream', buffer: workbook('xlsx', bulkRows) });
      await page.getByRole('button', { name: text.reviewMatches, exact: true }).click();
      await expect(page.getByRole('dialog').locator('article')).toHaveCount(15);
      await page.getByRole('button', { name: text.importButton_other.replace('{{count}}', '30'), exact: true }).click();
      await expect.poll(() => batches.length).toBe(1);
      assert.equal(batches[0].length, 25);
      await releaseBatch();
      await expect.poll(() => batches.length).toBe(2);
      assert.equal(batches[1].length, 5);
      await expect(page.getByRole('progressbar')).toHaveAttribute('value', '83');
      await expect(page.getByText(text.savingProgress.replace('{{completed}}','25').replace('{{total}}','30'), { exact: true })).toBeVisible();
      await releaseBatch();
      await expect(page.getByText(text.doneDescription_other.replace('{{count}}','30'), { exact: true })).toBeVisible();
      console.log('PASS 30-client import, paginated review and measured progress across 25+5 row batches');
    }
    assert.deepEqual(errors, []);
    console.log(`PASS partner import XLS/XLSX/CSV, mapping, manual match, preservation, loading, cache refresh and repeat: ${language} ${width}px (${requests.length} RPC calls)`);
    await context.close();
  }
} finally { await browser.close(); }
