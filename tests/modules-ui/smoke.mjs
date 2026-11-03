// Run Vite with a fake Supabase URL on port 5187 and Playwright on NODE_PATH.
// Every external request is mocked; no live accounts or invoices are used.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { expect } = require('playwright/test');
const labels = JSON.parse(await readFile(new URL('../../src/locales/en.json', import.meta.url), 'utf8'));
const base = process.env.MODULES_UI_BASE_URL || 'http://127.0.0.1:5187';
const browser = await chromium.launch({ headless: true });
const errors = [];
const userId = '10000000-0000-4000-8000-000000000001';
const companyId = '20000000-0000-4000-8000-000000000001';

async function setup(modules, role = 'company_admin') {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'module@test.invalid',
    app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = [{ alg: 'HS256', typ: 'JWT' }, { sub: userId, exp, role: 'authenticated' }, 'fake']
    .map(value => typeof value === 'string' ? value : Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
  const session = { access_token: token, refresh_token: 'fake-refresh', expires_at: exp, expires_in: 3600, token_type: 'bearer', user };
  const company = { id: companyId, name: 'Module test company', enabled_modules: modules,
    is_active: true, is_deleted: false, billing_email: null, szamlazz_test_mode: true,
    leave_client_id: null, leave_project_id: null, created_at: '2026-01-01T00:00:00Z', profiles: [{ count: 1 }] };
  const profile = { id: userId, company_id: companyId, full_name: 'Module tester', role,
    is_active: true, weekly_work_hours: 40, show_timesheet_timer: false, company: { is_active: true } };
  const requests = [];
  let savedCompany;
  await context.addInitScript(session => {
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('sb-127-auth-token', JSON.stringify(session));
  }, session);
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === base) return route.continue();
    requests.push(url.pathname);
    const json = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    if (url.pathname.endsWith('/auth/v1/user')) return json(user);
    if (url.pathname.endsWith('/auth/v1/token')) return json(session);
    const table = url.pathname.split('/').at(-1);
    if (table === 'claim_company_invitation') return json(null);
    if (table === 'profiles') return json(req.headers().accept?.includes('object') ? profile : [profile]);
    if (table === 'companies') {
      if (req.method() === 'POST') { savedCompany = req.postDataJSON(); return json({ ...company, ...savedCompany }); }
      return json(req.headers().accept?.includes('object') ? company : [company]);
    }
    if (table === 'invoice-settings') return json({ invoice_provider: 'szamlazz_hu', api_key_configured: false });
    return json([]);
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return { page, context, requests, saved: () => savedCompany };
}

try {
  for (const modules of [[], ['leave_attachments'], ['leave_attachments', 'invoicing']]) {
    const app = await setup(modules);
    await app.page.goto(base + '/timesheet');
    await expect(app.page.getByRole('link', { name: labels.navigation.timesheetReview, exact: true })).toBeVisible();
    const nav = app.page.getByRole('navigation');
    for (const [name, enabled] of [
      [labels.navigation.leaveRequests, modules.includes('leave_attachments')],
      [labels.navigation.invoiceAttachments, modules.includes('leave_attachments')],
      [labels.navigation.automaticInvoicing, modules.includes('invoicing')],
    ]) {
      await expect(nav.getByRole('link', { name, exact: true })).toHaveCount(enabled ? 1 : 0);
    }
    for (const [path, enabled] of [
      ['/leaves', modules.includes('leave_attachments')],
      ['/admin/invoice-attachments', modules.includes('leave_attachments')],
      ['/admin/billing', modules.includes('invoicing')],
    ]) {
      await app.page.goto(base + path);
      await expect(app.page).toHaveURL(base + (enabled ? path : '/timesheet'));
    }
    await app.page.goto(base + '/admin/settings');
    await expect(app.page.getByRole('heading', { name: labels.companySettings.title, exact: true })).toBeVisible();
    await expect(app.page.getByText(labels.companySettings.leaveConfigTitle, { exact: true }))
      .toHaveCount(modules.includes('leave_attachments') ? 1 : 0);
    await expect(app.page.getByRole('heading', { name: labels.companySettings.invoiceSettingsTitle, exact: true }))
      .toHaveCount(modules.includes('invoicing') ? 1 : 0);
    if (!modules.includes('invoicing')) {
      await expect(app.page.getByText(labels.modules.dependency, { exact: true })).toHaveCount(0);
      // Let all mounted settings queries finish before checking for hidden calls.
      await expect(app.page.getByRole('button', { name: labels.companySettings.newClientButton, exact: true })).toBeVisible();
      expect(app.requests.some(path => path.endsWith('/invoice-settings') || path.endsWith('/ensure_company_project_pricing'))).toBe(false);
    }
    await app.context.close();
  }
  const admin = await setup([], 'super_admin');
  await admin.page.goto(base + '/super-admin/companies');
  await admin.page.getByRole('button', { name: labels.companyManagement.addCompany, exact: true }).click();
  const modal = admin.page.getByRole('dialog');
  const first = modal.getByRole('checkbox', { name: labels.modules.leave_attachments, exact: true });
  const invoicing = modal.getByRole('checkbox', { name: labels.modules.invoicing, exact: true });
  await expect(first).not.toBeChecked();
  await expect(invoicing).not.toBeChecked();
  await invoicing.check();
  await expect(first).toBeChecked();
  await first.uncheck();
  await expect(invoicing).not.toBeChecked();
  await invoicing.check();
  await modal.getByRole('textbox').first().fill('New module company');
  await modal.getByRole('button', { name: labels.companyManagement.createCompany, exact: true }).click();
  await expect(modal).toHaveCount(0);
  expect(admin.saved().enabled_modules.sort()).toEqual(['invoicing', 'leave_attachments']);
  await admin.context.close();
  expect(errors).toEqual([]);
  console.log('Module browser checks passed: base, first module, full modules, URL guards, settings calls, and saved dependency controls.');
} finally {
  await browser.close();
}
