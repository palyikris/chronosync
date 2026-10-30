// All external requests are intercepted; this never writes to a hosted database.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const playwrightPath = process.env.PLAYWRIGHT_MODULE_PATH || 'playwright';
const { chromium } = require(playwrightPath);
const { expect } = require(`${playwrightPath}/test`);
const base = process.env.PAYROLL_UI_BASE_URL || 'http://localhost:5173';
const output = process.env.PAYROLL_UI_OUTPUT || 'tests/payroll-ui/output.local';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
try {
  for (const language of ['en', 'hu']) for (const width of [1280, 390]) {
    const { companySettings: text, common } = JSON.parse(await readFile(new URL(`../../src/locales/${language}.json`, import.meta.url), 'utf8'));
    const context = await browser.newContext({ viewport: { width, height: 950 } });
    const errors = [], writes = [];
    const projects = [null, 3].map((payroll_headcount, i) => ({
      id: `30000000-0000-4000-8000-00000000000${i + 1}`, company_id: '10000000-0000-4000-8000-000000000001',
      client_id: '20000000-0000-4000-8000-000000000001', name: i === 0 ? 'Consulting' : 'Payroll work',
      is_active: true, estimated_hours_per_month: 2.5, payroll_headcount, created_at: '2026-10-29T00:00:00Z',
    }));
    let failNext = false;
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === base) return route.continue();
      const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname.endsWith('/projects')) {
        if (request.method() === 'GET') return json(projects);
        const payload = request.postDataJSON();
        writes.push(payload);
        if (failNext) { failNext = false; return json({ message: 'Test save failure', code: 'TEST' }, 500); }
        if (request.method() === 'PATCH') {
          const project = projects.find(p => `eq.${p.id}` === url.searchParams.get('id'));
          Object.assign(project, payload);
          return json(project);
        }
        const project = { ...projects[0], ...payload, id: '30000000-0000-4000-8000-000000000003' };
        projects.push(project);
        return json(project);
      }
      return json({});
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.dismiss());
    await page.goto(`${base}/tests/payroll-ui/?lang=${language}`);
    const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Consulting', exact: true }) });
    await card.getByRole('button', { name: text.editProject, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel(text.payrollHeadcount)).toBeHidden();
    await dialog.getByRole('checkbox', { name: text.payrollProject }).check();
    const count = dialog.getByLabel(text.payrollHeadcount);
    await expect(count).toHaveValue('1');
    for (const value of ['', '0', '-1', '1.5']) {
      await count.fill(value);
      await expect(dialog.getByRole('button', { name: text.saveChanges })).toBeDisabled();
      await expect(count).toHaveAttribute('aria-invalid', 'true');
    }
    await count.fill('12');
    await page.screenshot({ path: `${output}/${language}-${width}-edit.png`, fullPage: true });
    failNext = true;
    await dialog.getByRole('button', { name: text.saveChanges }).click();
    await expect(dialog.getByRole('button', { name: text.saveChanges })).toBeEnabled();
    await expect(count).toHaveValue('12');
    assert.equal(writes.length, 1);
    await dialog.getByRole('button', { name: text.saveChanges }).click();
    await expect(dialog).toBeHidden();
    await expect(card).toContainText('12');
    assert.equal(writes.at(-1).payroll_headcount, 12);
    await card.getByRole('button', { name: text.editProject, exact: true }).click();
    await expect(dialog.getByLabel(text.payrollHeadcount)).toHaveValue('12');
    await dialog.getByRole('checkbox', { name: text.payrollProject }).uncheck();
    await expect(dialog.getByLabel(text.payrollHeadcount)).toBeHidden();
    await dialog.getByRole('button', { name: text.saveChanges }).click();
    await expect(dialog).toBeHidden();
    assert.equal(writes.at(-1).payroll_headcount, null);
    await expect(card.getByText(language === 'hu' ? /Bérszámfejtés/ : /Payroll/)).toHaveCount(0);
    await page.getByRole('button', { name: text.newProjectButton, exact: true }).click();
    await page.locator('form').getByRole('button', { name: text.projectClientLabel, exact: true }).click();
    await page.getByRole('option', { name: 'Test client', exact: true }).click();
    await page.locator('#new-project-name').fill('New payroll project');
    await page.locator('#new-project-payroll-enabled').check();
    await page.locator('#new-project-payroll-headcount').fill('7');
    await page.getByRole('button', { name: common.add, exact: true }).click();
    const added = page.locator('article').filter({ has: page.getByRole('heading', { name: 'New payroll project', exact: true }) });
    await expect(added).toContainText('7');
    assert.equal(writes.at(-1).payroll_headcount, 7);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${output}/${language}-${width}-projects.png`, fullPage: true });
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS payroll editing, validation, failure/retry, persistence, disabling and creation: ${language} ${width}px`);
  }
} finally { await browser.close(); }
