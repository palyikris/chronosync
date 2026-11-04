// All external requests are intercepted. No real keys or accounts are used.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const playwrightPath = process.env.PLAYWRIGHT_MODULE_PATH || 'playwright';
const { chromium } = require(playwrightPath);
const { expect } = require(`${playwrightPath}/test`);
const base = process.env.INVOICE_CONNECTION_UI_BASE_URL || 'http://127.0.0.1:5174';
const output = process.env.INVOICE_CONNECTION_UI_OUTPUT || 'tests/invoice-connection-ui/output.local';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });

try {
  for (const language of ['en', 'hu']) for (const width of [1280, 390]) {
    const { companySettings: text, common } = JSON.parse(await readFile(new URL(`../../src/locales/${language}.json`, import.meta.url), 'utf8'));
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const errors = [], requests = [];
    let pending;
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.pathname.endsWith('/invoice-settings/test-connection')) {
        assert.equal(request.method(), 'POST');
        assert.equal(request.headers().authorization, 'Bearer connection-test-token');
        requests.push(request.postDataJSON());
        pending = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
        return;
      }
      if (url.origin === base) return route.continue();
      throw new Error(`Unexpected external request: ${request.method()} ${url.pathname}`);
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const testButton = page.getByRole('button', { name: text.invoiceConnectionTest, exact: true });
    const input = page.getByLabel(text.invoiceApiKeyLabel, { exact: true });
    const save = page.getByRole('button', { name: common.saveChanges, exact: true });
    const open = query => page.goto(`${base}/tests/invoice-connection-ui/?lang=${language}&${query}`);
    const start = async () => {
      pending = undefined;
      await testButton.click();
      await expect.poll(() => Boolean(pending)).toBe(true);
      await expect(page.getByRole('button', { name: text.invoiceConnectionTesting, exact: true })).toBeDisabled();
      await expect(input).toBeDisabled();
      await expect(save).toBeDisabled();
    };
    await open('configured=1');
    await start();
    assert.deepEqual(requests.at(-1), { company_id: '10000000-0000-4000-8000-000000000001', invoice_provider: 'szamlazz_hu' });
    await pending({ success: true, status: 'connected', provider_error_code: null });
    await expect(page.getByRole('status')).toHaveText(text.invoiceConnectionSuccess);
    await input.fill('  entered-key  ');
    await expect(page.getByRole('status')).toHaveCount(0);
    await start();
    assert.equal(requests.at(-1).api_key, 'entered-key');
    await pending({ success: true, status: 'connected', provider_error_code: null });
    await expect(page.getByRole('status')).toHaveText(text.invoiceConnectionNewKeySuccess);
    await expect(input).toHaveValue('  entered-key  ');
    for (const [status, message] of [
      ['invalid_key', text.invoiceConnectionInvalidKey],
      ['provider_error', text.invoiceConnectionProviderError],
      ['unavailable', text.invoiceConnectionUnavailable],
      ['unconfirmed', text.invoiceConnectionUnconfirmed],
    ]) {
      await start();
      await pending({ success: false, status, provider_error_code: null });
      await expect(page.getByRole('alert')).toHaveText(message);
      await expect(save).toBeEnabled();
    }
    await start();
    await pending({ detail: 'Company access denied' }, 403);
    await expect(page.getByRole('alert')).toHaveText('Company access denied');
    await input.fill('x'.repeat(513));
    const requestCount = requests.length;
    await testButton.click();
    await expect(page.getByRole('alert')).toBeVisible();
    assert.equal(requests.length, requestCount);
    await input.fill('');
    await expect(testButton).toBeEnabled();
    await page.getByRole('button', { name: text.invoiceProviderLabel, exact: true }).click();
    await page.getByRole('option', { name: text.billingo, exact: true }).click();
    await expect(testButton).toHaveCount(0);
    await expect(page.getByText(text.invoiceNotConnected, { exact: true })).toBeVisible();
    await open('provider=billingo&configured=1');
    await page.getByRole('button', { name: text.invoiceProviderLabel, exact: true }).click();
    await page.getByRole('option', { name: text.szamlazzHu, exact: true }).click();
    await expect(testButton).toBeDisabled();
    await open('configured=0');
    await expect(testButton).toBeDisabled();
    await input.fill('entered-key');
    await expect(testButton).toBeEnabled();
    await start();
    await pending({ success: true, status: 'connected', provider_error_code: null });
    await expect(page.getByRole('status')).toHaveText(text.invoiceConnectionNewKeySuccess);
    await expect(page.getByText(text.invoiceNotConnected, { exact: true })).toBeVisible();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${output}/${language}-${width}.png`, fullPage: true });
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS saved/entered keys, loading, failures, validation, provider switching: ${language} ${width}px`);
  }
} finally { await browser.close(); }
