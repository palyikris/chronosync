// Run Vite on ENTRY_UI_BASE_URL with a fake Supabase URL. All API traffic is intercepted.
// Requires Playwright in NODE_PATH; never writes to a hosted database.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { expect } = require('playwright/test');
const strings = JSON.parse(await readFile(new URL('../../src/locales/en.json', import.meta.url), 'utf8'));
const labels = strings.timesheet;
const prefs = strings.userSettings;
const base = process.env.ENTRY_UI_BASE_URL ?? 'http://127.0.0.1:5184';
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const uid = '00000000-0000-4000-8000-000000000001';
const company = '00000000-0000-4000-8000-000000000002';
const ca = '00000000-0000-4000-8000-000000000003';
const pa = '00000000-0000-4000-8000-000000000004';
const cb = '00000000-0000-4000-8000-000000000005';
const pb = '00000000-0000-4000-8000-000000000006';
const inactive = '00000000-0000-4000-8000-000000000007';
const payroll = '00000000-0000-4000-8000-000000000008';
const errors = [];
async function app(history = false, language = 'en', savedFavorites = []) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'Europe/Budapest' });
  const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'entry-test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = [{ alg: 'HS256', typ: 'JWT' }, { sub: uid, exp, role: 'authenticated' }, 'fake'].map(x => typeof x === 'string' ? x : Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
  const session = { access_token: token, refresh_token: 'fake', expires_at: exp, expires_in: 3600, token_type: 'bearer', user };
  const profile = { ...user, company_id: company, full_name: 'Entry Tester', role: 'regular', is_active: true, weekly_work_hours: 40, show_timesheet_timer: false, company: { is_active: true } };
  const clients = [
    { id: ca, company_id: company, name: 'English client', is_active: true, invoice_attachment_language: 'en' },
    { id: cb, company_id: company, name: 'Hungarian client', is_active: true, invoice_attachment_language: 'hu' },
  ];
  const projects = [
    { id: pa, client_id: ca, company_id: company, name: 'Website', is_active: true },
    { id: pb, client_id: cb, company_id: company, name: 'Support', is_active: true },
    { id: payroll, client_id: ca, company_id: company, name: 'Payroll', is_active: true, is_payroll: true },
    { id: inactive, client_id: ca, company_id: company, name: 'Archived project', is_active: false },
  ];
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Budapest' }).format(new Date());
  const entry = (id, client_id, project_id, hours_logged, created_at) => ({ id, user_id: uid, company_id: company, client_id, project_id, work_date: date, hours_logged, created_at, status: 'draft', description: `History ${id}` });
  const state = { entries: history ? [entry('old', ca, pa, 8, '2026-10-01T09:00:00Z'), entry('latest', ca, pa, 0.5, '2026-10-25T09:00:00Z'), entry('support', cb, pb, 2, '2026-10-24T09:00:00Z'), entry('archived', ca, inactive, 4, '2026-10-26T09:00:00Z')] : [], writes: [], favorites: savedFavorites, favoriteWrites: [], failFavoriteSave: false, failFavoriteDelete: false, failFavoriteLoad: false, failSave: false, hold: null, release: null };
  await context.addInitScript(({ session, language }) => {
    localStorage.setItem('i18nextLng', language);
    localStorage.setItem('sb-127-auth-token', JSON.stringify(session));
    localStorage.setItem('chronosync:timesheet:view', 'list');
  }, { session, language });
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === base) return route.continue();
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.pathname.endsWith('/auth/v1/user')) return json(user);
    if (url.pathname.endsWith('/auth/v1/token')) return json(session);
    const table = url.pathname.split('/').at(-1);
    if (table === 'profiles') return json(req.headers().accept?.includes('object') ? profile : [profile]);
    if (table === 'clients') return json(clients);
    if (table === 'projects') return json(projects);
    if (table === 'user_favorite_projects') {
      const id = url.searchParams.get('id')?.slice(3);
      const result = row => {
        const project = projects.find(project => project.id === row.project_id);
        const client = clients.find(client => client.id === project?.client_id);
        return { ...row, project: project ? { ...project, client } : null };
      };
      if (req.method() === 'POST' || req.method() === 'PATCH') {
        state.favoriteWrites.push(req.postDataJSON());
        if (state.failFavoriteSave) return json({ message: 'Test favourite save failed' }, 400);
        if (id) {
          const row = state.favorites.find(task => task.id === id);
          Object.assign(row, req.postDataJSON());
          return json(result(row));
        }
        const row = { ...req.postDataJSON(), id: crypto.randomUUID(), user_id: uid };
        state.favorites.push(row);
        return json(result(row));
      }
      if (req.method() === 'DELETE') {
        if (state.failFavoriteDelete) return json({ message: 'Test favourite delete failed' }, 400);
        const index = state.favorites.findIndex(task => task.id === id);
        if (index < 0) return json({ message: 'Missing task' }, 406);
        state.favorites.splice(index, 1);
        return json({ id });
      }
      if (state.failFavoriteLoad) return json({ message: 'Test favourite load failed' }, 400);
      return json(state.favorites.slice(Number(url.searchParams.get('offset') ?? 0)).map(result));
    }
    if (table === 'timesheets') {
      if (req.method() === 'POST') {
        const payload = req.postDataJSON()[0];
        state.writes.push(payload);
        if (state.hold) await state.hold;
        if (state.failSave) return json({ message: 'Test save failed' }, 400);
        const saved = { ...payload, id: `saved-${state.writes.length}`, status: 'draft', created_at: new Date().toISOString() };
        state.entries.push(saved);
        return json(saved);
      }
      if (req.method() === 'PATCH') {
        const payload = req.postDataJSON();
        state.writes.push(payload);
        const row = state.entries.find(entry => `eq.${entry.id}` === url.searchParams.get('id'));
        Object.assign(row, payload);
        return json(row);
      }
      if (url.searchParams.has('id')) return json(state.entries.find(entry => `eq.${entry.id}` === url.searchParams.get('id')));
      // Supabase encodes repeated range filters separately.
      const filters = url.searchParams.getAll('work_date');
      return json(state.entries.filter(entry => filters.every(filter => filter.startsWith('gte.') ? entry.work_date >= filter.slice(4) : filter.startsWith('lt.') ? entry.work_date < filter.slice(3) : true)));
    }
    return json([]);
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/timesheet');
  return { page, context, state };
}
const open = async page => {
  await page.getByRole('button', { name: labels.addEntry, exact: true }).filter({ visible: true }).click().catch(async error => {
    console.error({ url: page.url(), body: (await page.locator('body').innerText()).slice(0, 1800), errors });
    throw error;
  });
  const dialog = page.getByRole('dialog', { name: labels.entryTitleNew });
  await dialog.waitFor(); return dialog;
};
const select = async (page, dialog, label, option) => {
  await dialog.getByRole('button', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
};
try {
  const fresh = await app();
  const d = await open(fresh.page);
  const hours = d.getByRole('spinbutton', { name: labels.totalHours });
  const description = d.getByRole('textbox', { name: labels.taskDescription });
  await expect(hours).toHaveValue(''); checks++;
  await expect(d.getByRole('button', { name: labels.client, exact: true })).toContainText(labels.selectClient); checks++;
  await expect(d.getByRole('button', { name: labels.project, exact: true })).toContainText(labels.selectClientFirst); checks++;
  await expect(d.getByRole('button', { name: labels.favoriteProjects, exact: true })).toContainText(labels.useFavoriteProject); checks++;
  await expect(d.getByRole('link', { name: labels.manageFavoriteProjects })).toBeVisible(); checks++;
  await d.getByRole('button', { name: labels.favoriteProjects, exact: true }).click();
  await expect(fresh.page.getByRole('option', { name: labels.noFavoriteProjectsShort, exact: true })).toBeDisabled(); checks++;
  await fresh.page.keyboard.press('Escape');
  await expect(d.getByRole('button', { name: labels.saveEntry, exact: true })).toBeDisabled(); checks++;
  await select(fresh.page, d, labels.client, 'English client');
  await select(fresh.page, d, labels.project, 'Website');
  await expect(d.getByText(labels.englishDescriptionWarning)).toBeVisible(); checks++;
  await expect(d.getByRole('button', { name: labels.saveFavoriteProject, exact: true })).toBeEnabled(); checks++;
  await d.getByRole('button', { name: labels.saveFavoriteProject, exact: true }).click();
  await expect(d.getByRole('button', { name: labels.removeCurrentFavorite, exact: true })).toBeEnabled(); checks++;
  check(fresh.state.favorites.length === 1 && Object.keys(fresh.state.favoriteWrites.at(-1)).join(',') === 'project_id', 'Starring a project sends only its ID, with blank duration and description');
  await expect(description).toHaveValue(''); checks++;
  await expect(hours).toHaveValue(''); checks++;
  await d.getByRole('group', { name: labels.durationShortcuts }).getByRole('button', { name: '15 min', exact: true }).click();
  await expect(hours).toHaveValue('0.25'); checks++;
  await d.getByRole('button', { name: labels.saveAndAddAnother, exact: true }).click();
  check(fresh.state.writes.length === 0, 'A description is still required to save the entry');
  await description.fill('Weekly planning');
  await hours.fill('25');
  await d.getByRole('button', { name: labels.saveAndAddAnother, exact: true }).click();
  check(fresh.state.writes.length === 0, 'Invalid durations cannot be saved');
  await hours.fill('0.5');
  fresh.state.hold = new Promise(resolve => { fresh.state.release = resolve; });
  await d.getByRole('button', { name: labels.saveAndAddAnother, exact: true }).click();
  await expect.poll(() => fresh.state.writes.length).toBe(1); checks++;
  await expect(description).toBeDisabled(); checks++;
  await fresh.page.keyboard.press('Control+Shift+N');
  check(await description.inputValue() === 'Weekly planning', 'New-entry shortcut cannot reset a pending save');
  fresh.state.release(); fresh.state.hold = null;
  await expect(description).toHaveValue(''); checks++;
  await expect(description).toBeFocused(); checks++;
  await expect(hours).toHaveValue('0.5'); checks++;
  await expect(d.getByRole('status').filter({ hasText: labels.entrySavedAddAnother })).toBeVisible(); checks++;
  await description.fill('Follow-up');
  fresh.state.failSave = true;
  await d.getByRole('button', { name: labels.saveAndAddAnother, exact: true }).click();
  await expect(d.getByRole('alert')).toContainText(labels.saveFailed); checks++;
  await expect(description).toHaveValue('Follow-up'); checks++;
  check(fresh.state.entries.length === 1, 'Failed entry saves preserve the draft');
  fresh.state.failSave = false;
  await d.getByRole('button', { name: labels.saveEntry, exact: true }).click();
  await d.waitFor({ state: 'detached' }); checks++;
  await fresh.page.reload();
  const again = await open(fresh.page);
  const againHours = again.getByRole('spinbutton', { name: labels.totalHours });
  const againDescription = again.getByRole('textbox', { name: labels.taskDescription });
  await expect(againHours).toHaveValue('0.5'); checks++;
  await againHours.fill('1.75');
  await againDescription.fill('Different work today');
  await select(fresh.page, again, labels.client, 'Hungarian client');
  await select(fresh.page, again, labels.project, 'Support');
  const dateBefore = await again.locator('#timesheet-entry-date').textContent();
  await select(fresh.page, again, labels.favoriteProjects, /^Website/);
  await expect(again.getByRole('button', { name: labels.client, exact: true })).toContainText('English client'); checks++;
  await expect(again.getByRole('button', { name: labels.project, exact: true })).toContainText('Website'); checks++;
  await expect(againDescription).toHaveValue('Different work today'); checks++;
  await expect(againHours).toHaveValue('1.75'); checks++;
  check(await again.locator('#timesheet-entry-date').textContent() === dateBefore, 'Choosing a favourite preserves the selected date');
  await again.screenshot({ animations: 'disabled', path: '/tmp/chronosync-entry-with-favorite-desktop.png' });
  await fresh.page.setViewportSize({ width: 390, height: 660 });
  await expect.poll(() => fresh.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); checks++;
  const footerBefore = await again.getByRole('button', { name: labels.saveEntry, exact: true }).boundingBox();
  await again.locator('form').evaluate(form => { form.parentElement.scrollTop = 0; });
  const footerAfter = await again.getByRole('button', { name: labels.saveEntry, exact: true }).boundingBox();
  check(footerBefore.y === footerAfter.y && footerAfter.y + footerAfter.height <= 660, 'Save actions remain visible while the form scrolls');
  await fresh.page.screenshot({ animations: 'disabled', path: '/tmp/chronosync-entry-mobile-top.png' });
  await again.getByRole('button', { name: labels.removeCurrentFavorite, exact: true }).click();
  await expect(again.getByRole('group', { name: labels.favoriteProjects })).toBeVisible(); checks++;
  await again.getByRole('link', { name: labels.manageFavoriteProjects }).click();
  const card = fresh.page.locator('#favorite-projects');
  await card.getByRole('button', { name: prefs.addFavoriteProject, exact: true }).click();
  await expect(card.getByRole('textbox')).toHaveCount(0); checks++;
  await expect(card.getByRole('spinbutton')).toHaveCount(0); checks++;
  await select(fresh.page, card, labels.client, 'English client');
  await select(fresh.page, card, labels.project, 'Website');
  fresh.state.failFavoriteSave = true;
  await card.getByRole('button', { name: prefs.saveFavoriteProject, exact: true }).click();
  await expect(card.getByRole('alert')).toContainText(prefs.favoriteSaveFailed); checks++;
  await expect(card.getByRole('button', { name: labels.project, exact: true })).toContainText('Website'); checks++;
  fresh.state.failFavoriteSave = false;
  await card.getByRole('button', { name: prefs.saveFavoriteProject, exact: true }).click();
  await expect(card.getByRole('status')).toContainText(prefs.favoriteSaved); checks++;
  await expect(card.locator('li').getByText('Website', { exact: true })).toBeVisible(); checks++;
  check(fresh.state.favorites.length === 1 && Object.keys(fresh.state.favoriteWrites.at(-1)).join(',') === 'project_id', 'Preferences store only a project ID');
  await card.getByRole('button', { name: 'Edit favourite: Website', exact: true }).click();
  await select(fresh.page, card, labels.client, 'Hungarian client');
  await select(fresh.page, card, labels.project, 'Support');
  await card.getByRole('button', { name: prefs.saveFavoriteProject, exact: true }).click();
  await expect(card.locator('li').getByText('Support', { exact: true })).toBeVisible(); checks++;
  check(fresh.state.favorites.length === 1 && fresh.state.favorites[0].project_id === pb, 'Editing updates the existing favourite project');
  await fresh.page.setViewportSize({ width: 1366, height: 1000 });
  await card.screenshot({ animations: 'disabled', path: '/tmp/chronosync-favorite-preferences-desktop.png' });
  const device = await app(false, 'en', fresh.state.favorites);
  const synced = await open(device.page);
  const deviceHours = synced.getByRole('spinbutton', { name: labels.totalHours });
  const deviceDescription = synced.getByRole('textbox', { name: labels.taskDescription });
  await select(device.page, synced, labels.favoriteProjects, /^Support/);
  await expect(deviceHours).toHaveValue(''); checks++;
  await expect(deviceDescription).toHaveValue(''); checks++;
  await deviceHours.fill('2.5');
  await deviceDescription.fill('Fresh notes on another browser');
  await select(device.page, synced, labels.client, 'English client');
  await select(device.page, synced, labels.project, 'Website');
  await select(device.page, synced, labels.favoriteProjects, /^Support/);
  await expect(deviceHours).toHaveValue('2.5'); checks++;
  await expect(deviceDescription).toHaveValue('Fresh notes on another browser'); checks++;
  await expect(synced.getByRole('button', { name: labels.client, exact: true })).toContainText('Hungarian client'); checks++;
  check(await device.page.evaluate(projectId => !Object.values(localStorage).some(value => value.includes(projectId)), pb), 'A fresh browser reads favourites from the account');
  await synced.getByRole('link', { name: labels.manageFavoriteProjects }).click();
  const deviceCard = device.page.locator('#favorite-projects');
  await expect(deviceCard.locator('li').getByText('Support', { exact: true })).toBeVisible(); checks++;
  await device.page.setViewportSize({ width: 390, height: 660 });
  await expect.poll(() => device.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); checks++;
  await deviceCard.screenshot({ animations: 'disabled', path: '/tmp/chronosync-favorite-preferences-mobile.png' });
  device.state.failFavoriteDelete = true;
  await deviceCard.getByRole('button', { name: 'Delete favourite: Support', exact: true }).click();
  await expect(deviceCard.getByRole('alert')).toContainText(prefs.favoriteDeleteFailed); checks++;
  check(fresh.state.favorites.length === 1, 'A failed delete leaves the favourite available');
  device.state.failFavoriteDelete = false;
  await deviceCard.getByRole('button', { name: 'Delete favourite: Support', exact: true }).click();
  await expect(deviceCard.getByText(prefs.noFavoriteProjects)).toBeVisible(); checks++;
  await device.context.close(); await fresh.context.close();
  const history = await app(true);
  const h = await open(history.page);
  await expect(h.getByRole('spinbutton', { name: labels.totalHours })).toHaveValue('0.5'); checks++;
  await expect(h.getByRole('group', { name: labels.recentProjects })).toHaveCount(0); checks++;
  await select(history.page, h, labels.client, 'Hungarian client');
  await select(history.page, h, labels.project, 'Support');
  await expect(h.getByRole('button', { name: labels.client, exact: true })).toContainText('Hungarian client'); checks++;
  await expect(h.getByText(labels.englishDescriptionWarning)).toHaveCount(0); checks++;
  await history.page.screenshot({ animations: 'disabled', path: '/tmp/chronosync-entry-desktop.png' });
  await history.page.setViewportSize({ width: 320, height: 568 });
  await expect.poll(() => history.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); checks++;
  const smallSave = await h.getByRole('button', { name: labels.saveEntry, exact: true }).boundingBox();
  check(smallSave.y + smallSave.height <= 568, 'Save remains visible on a small phone');
  await history.page.screenshot({ animations: 'disabled', path: '/tmp/chronosync-entry-small-phone.png' });
  await history.context.close();
  const hu = await app(false, 'hu');
  const huLabels = JSON.parse(await readFile(new URL('../../src/locales/hu.json', import.meta.url), 'utf8')).timesheet;
  await hu.page.setViewportSize({ width: 390, height: 660 });
  await hu.page.getByRole('button', { name: huLabels.addEntry, exact: true }).filter({ visible: true }).click();
  const huModal = hu.page.getByRole('dialog', { name: huLabels.entryTitleNew });
  await expect(huModal.getByRole('button', { name: huLabels.favoriteProjects, exact: true })).toContainText(huLabels.useFavoriteProject); checks++;
  await expect(huModal.getByRole('link', { name: huLabels.manageFavoriteProjects })).toBeVisible(); checks++;
  await expect.poll(() => hu.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); checks++;
  await hu.page.screenshot({ animations: 'disabled', path: '/tmp/chronosync-entry-hungarian-mobile.png' });
  await hu.context.close();
  for (const language of ['en', 'hu']) {
    const {timesheet: text} = JSON.parse(await readFile(new URL(`../../src/locales/${language}.json`, import.meta.url), 'utf8'));
    const payrollApp = await app(false, language);
    const {page, state} = payrollApp;
    if (language === 'hu') await page.setViewportSize({width: 390, height: 660});
    await page.getByRole('button', {name: text.addEntry, exact: true}).filter({visible: true}).click();
    const modal = page.getByRole('dialog');
    await select(page, modal, text.client, 'English client');
    await select(page, modal, text.project, 'Website');
    const multiplier = modal.getByRole('spinbutton', {name: text.billingMultiplier, exact: true});
    await expect(multiplier).toBeHidden(); checks++;
    await select(page, modal, text.project, 'Payroll');
    await expect(multiplier).toHaveValue('1'); checks++;
    await modal.getByRole('spinbutton', {name: text.totalHours}).fill('2.5');
    await modal.getByRole('textbox', {name: text.taskDescription}).fill('Payroll entry');
    for (const value of ['', '0', '-1', '1.5', '2147483648']) {
      await multiplier.fill(value);
      await expect(modal.getByRole('button', {name: text.saveEntry, exact: true})).toBeDisabled(); checks++;
    }
    await multiplier.fill('3');
    await page.screenshot({path: `/tmp/chronosync-entry-multiplier-${language}.png`});
    await modal.getByRole('button', {name: text.saveAndAddAnother, exact: true}).click();
    await expect.poll(() => state.writes.length).toBe(1); checks++;
    await expect(multiplier).toHaveValue('1'); checks++;
    assert.equal(state.writes[0].billing_multiplier, 3);
    assert.equal(state.writes[0].hours_logged, 2.5);
    await multiplier.fill('7');
    await modal.getByRole('textbox', {name: text.taskDescription}).fill('Second payroll entry');
    await modal.getByRole('button', {name: text.saveEntry, exact: true}).click();
    await expect(modal).toBeHidden(); checks++;
    assert.equal(state.writes[1].billing_multiplier, 7);
    await page.reload();
    const payrollCard = page.locator('article').filter({has: page.getByText('Payroll entry', {exact: true})});
    await payrollCard.getByRole('button', {name: text.editEntry, exact: true}).click();
    const savedFactor = state.entries[0].billing_multiplier;
    await expect(multiplier).toHaveValue(String(savedFactor)); checks++;
    await page.screenshot({animations: 'disabled', path: `/tmp/chronosync-entry-edit-${language}.png`});
    await multiplier.fill('12');
    await modal.getByRole('button', {name: text.saveChanges, exact: true}).click();
    await expect(modal).toBeHidden(); checks++;
    assert.equal(state.writes.at(-1).billing_multiplier, 12);
    await payrollCard.getByRole('button', {name: text.editEntry, exact: true}).click();
    await expect(multiplier).toHaveValue('12'); checks++;
    await select(page, modal, text.project, 'Website');
    await expect(multiplier).toBeHidden(); checks++;
    await modal.getByRole('button', {name: text.saveChanges, exact: true}).click();
    await expect(modal).toBeHidden(); checks++;
    assert.equal(state.writes.at(-1).billing_multiplier, 1);
    await payrollApp.context.close();
  }
  check(errors.length === 0, `No browser errors: ${errors.join('; ')}`);
  console.log(`Passed ${checks} entry workflow checks.`);
} finally {
  await browser.close();
}
