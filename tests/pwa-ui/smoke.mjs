// Run after npm run build, with Playwright available (or NODE_PATH set).
// Uses only local production assets. External traffic is blocked.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname, sep } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const { expect } = require('playwright/test');
const root = resolve(process.env.PWA_DIST_DIR || 'dist');
const output = process.env.PWA_SCREENSHOT_DIR || '/tmp/chronosync-pwa';
const config = JSON.parse(await readFile('vercel.json', 'utf8'));
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.webmanifest'), 'utf8'));
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
let release = 1;
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  let file = resolve(root, '.' + path);
  if (!file.startsWith(root + sep) && file !== root) { res.writeHead(403).end(); return; }
  try {
    let body;
    try { body = await readFile(file); }
    catch {
      if (!config.rewrites.some(rule => new RegExp(`^${rule.source}$`).test(path))) throw new Error('Not found');
      file = resolve(root, 'index.html');
      body = await readFile(file);
    }
    const headers = { 'content-type': types[extname(file)] || 'application/octet-stream' };
    for (const rule of config.headers) {
      if (new RegExp(`^${rule.source}$`).test(path)) {
        for (const header of rule.headers) headers[header.key.toLowerCase()] = header.value;
      }
    }
    if (path === '/sw.js') body = Buffer.from(body.toString() + `\n// simulated release ${release}\n`);
    res.writeHead(200, headers).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
});
const errors = [];
let checks = 0;
const verify = (condition, message) => { assert.ok(condition, message); checks++; };
const title = 'Keep ChronoSync one tap away';

async function app(device = 'Pixel 7', options = {}) {
  const context = await browser.newContext(device ? { ...devices[device], ...options } : { viewport: { width: 1366, height: 900 }, ...options });
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  await context.addInitScript(() => {
    localStorage.setItem('i18nextLng', 'en');
    // Keep native browser promotion from racing the deterministic scenarios.
    window.addEventListener('beforeinstallprompt', event => {
      if (!event.testPrompt) event.stopImmediatePropagation();
    });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return { context, page };
}

async function nativePrompt(page, outcome) {
  await page.evaluate(outcome => {
    window.installCalls = 0;
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.testPrompt = true;
    event.prompt = async () => { window.installCalls++; return { outcome }; };
    window.dispatchEvent(event);
  }, outcome);
  await expect(page.getByRole('button', { name: 'Install app', exact: true })).toBeVisible();
}

try {
  await mkdir(output, { recursive: true });
  verify(manifest.start_url === '/app' && manifest.display === 'standalone', 'installed app opens the authenticated app entry');
  for (const icon of manifest.icons) {
    const response = await fetch(base + icon.src);
    const bytes = Buffer.from(await response.arrayBuffer());
    const size = Number(icon.sizes.split('x')[0]);
    verify(response.ok && bytes.readUInt32BE(16) === size && bytes.readUInt32BE(20) === size, 'manifest icon exists with correct PNG dimensions');
  }
  for (const path of ['/sw.js', '/manifest.webmanifest', '/login']) {
    const response = await fetch(base + path);
    verify(response.headers.get('cache-control') === 'no-cache, max-age=0, must-revalidate', `${path} revalidates`);
  }
  verify((await fetch(base + '/sw.js')).headers.get('content-type').includes('javascript'), 'worker is JavaScript');
  for (const path of ['/api/missing', '/pwa/missing.png', '/assets/missing.js']) verify((await fetch(base + path)).status === 404, 'missing non-SPA paths return 404');

  const android = await app();
  await android.page.goto(base + '/login');
  await expect(android.page.getByRole('heading', { name: title })).toBeVisible();
  await android.page.getByRole('button', { name: 'How to install', exact: true }).click();
  await expect(android.page.getByText('1. Open your browser’s menu (⋮).')).toBeVisible();
  await android.page.getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(android.page.locator('input[type="email"]')).toBeVisible();
  await nativePrompt(android.page, 'accepted');
  await android.page.screenshot({ path: resolve(output, 'android-install.png'), animations: 'disabled' });
  await android.page.getByRole('button', { name: 'Install app', exact: true }).click();
  await expect(android.page.getByRole('heading', { name: title })).toHaveCount(0);
  verify(await android.page.evaluate(() => window.installCalls) === 1, 'native install starts from one user gesture');
  await android.context.close();

  const dismissal = await app();
  await dismissal.page.goto(base);
  await expect(dismissal.page.getByRole('heading', { name: title })).toBeVisible();
  await nativePrompt(dismissal.page, 'dismissed');
  await dismissal.page.getByRole('button', { name: 'Install app', exact: true }).click();
  await expect(dismissal.page.getByRole('heading', { name: title })).toHaveCount(0);
  await dismissal.page.reload();
  await expect(dismissal.page.getByRole('heading', { name: title })).toHaveCount(0);
  const expiry = await dismissal.page.evaluate(() => Number(localStorage.getItem('chronosync:pwa-install-dismissed:v1')));
  verify(expiry > Date.now() + 6 * 86400000, 'dismissal lasts seven days across reloads');
  await dismissal.page.evaluate(() => localStorage.setItem('chronosync:pwa-install-dismissed:v1', '1'));
  await dismissal.page.reload();
  await expect(dismissal.page.getByRole('heading', { name: title })).toBeVisible();
  await dismissal.page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(dismissal.page.getByRole('heading', { name: title })).toHaveCount(0);
  await dismissal.context.close();

  const iphone = await app('iPhone 13');
  await iphone.page.goto(base + '/login');
  await expect(iphone.page.locator('input[type="email"]')).toBeVisible();
  await iphone.page.getByRole('button', { name: 'How to install', exact: true }).click();
  await expect(iphone.page.getByRole('dialog')).toBeVisible();
  await expect(iphone.page.getByText(/Open your browser’s Share menu/)).toBeVisible();
  await iphone.page.screenshot({ path: resolve(output, 'iphone-instructions.png'), animations: 'disabled' });
  await iphone.page.keyboard.press('Escape');
  await expect(iphone.page.getByRole('button', { name: 'How to install', exact: true })).toBeFocused();
  await iphone.page.getByRole('button', { name: 'Not now', exact: true }).click();
  await iphone.page.reload();
  await expect(iphone.page.getByRole('heading', { name: title })).toHaveCount(0);
  await iphone.context.close();

  const hu = await app('iPhone 13', { viewport: { width: 320, height: 740 } });
  await hu.context.addInitScript(() => localStorage.setItem('i18nextLng', 'hu'));
  await hu.page.goto(base + '/login');
  await expect(hu.page.getByRole('heading', { name: 'A ChronoSync egy érintésre' })).toBeVisible();
  await expect(hu.page.locator('input[type="email"]')).toBeVisible();
  verify(await hu.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Hungarian install card fits a narrow mobile viewport');
  await hu.page.screenshot({ path: resolve(output, 'hungarian-mobile.png'), animations: 'disabled' });
  await hu.context.close();

  const standalone = await app('iPhone 13');
  await standalone.context.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  await standalone.page.goto(base);
  await expect(standalone.page.getByRole('heading', { name: title })).toHaveCount(0);
  await standalone.context.close();

  const desktop = await app(null);
  await desktop.page.goto(base + '/app');
  await desktop.page.waitForURL('**/login');
  await expect(desktop.page.getByRole('heading', { name: title })).toHaveCount(0);
  await desktop.page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cdp = await desktop.context.newCDPSession(desktop.page);
  const installability = await cdp.send('Page.getInstallabilityErrors');
  verify(installability.installabilityErrors.length === 0, `Chromium installability: ${JSON.stringify(installability)}`);
  const otherTab = await desktop.context.newPage();
  await otherTab.goto(base + '/login');
  await otherTab.waitForFunction(() => !!navigator.serviceWorker.controller);
  await otherTab.locator('input[type="email"]').fill('unsaved@example.invalid');
  let firstNavigations = 0;
  let otherNavigations = 0;
  desktop.page.on('framenavigated', frame => { if (frame === desktop.page.mainFrame()) firstNavigations++; });
  otherTab.on('framenavigated', frame => { if (frame === otherTab.mainFrame()) otherNavigations++; });
  release++;
  await desktop.page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await expect(desktop.page.getByRole('heading', { name: 'A new version is ready' })).toBeVisible();
  await expect(otherTab.getByRole('heading', { name: 'A new version is ready' })).toBeVisible();
  verify(firstNavigations === 0 && otherNavigations === 0, 'update discovery preserves both tabs');
  await desktop.page.screenshot({ path: resolve(output, 'update-ready.png') });
  await desktop.page.getByRole('button', { name: 'Reload app', exact: true }).click();
  await expect(desktop.page.getByRole('heading', { name: 'A new version is ready' })).toHaveCount(0);
  await expect(otherTab.locator('input[type="email"]')).toHaveValue('unsaved@example.invalid');
  verify(firstNavigations === 1 && otherNavigations === 0, 'only the consenting tab reloads once');
  await otherTab.getByRole('button', { name: 'Reload app', exact: true }).click();
  await expect(otherTab.getByRole('heading', { name: 'A new version is ready' })).toHaveCount(0);
  verify(otherNavigations === 1, 'the other tab can reload when ready');
  await Promise.all([
    desktop.page.waitForEvent('framenavigated', { predicate: frame => frame === desktop.page.mainFrame() }),
    desktop.page.evaluate(() => window.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))),
  ]);
  await desktop.page.waitForFunction(() => Object.keys(sessionStorage).some(key => key.startsWith('chronosync:chunk-recovery:')));
  await expect(desktop.page.locator('input[type="email"]')).toBeVisible();
  verify(firstNavigations === 2, 'a stale lazy chunk triggers a single recovery reload');
  const repeatRecovery = await desktop.page.evaluate(() => {
    const event = new Event('vite:preloadError', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  verify(!repeatRecovery && firstNavigations === 2, 'the same broken build cannot cause a reload loop');
  await desktop.context.close();

  const auth = await app();
  await auth.page.goto(base + '/auth/magic');
  await expect(auth.page.getByRole('heading', { name: title })).toHaveCount(0);
  await auth.context.close();
  verify(errors.length === 0, `No browser errors: ${errors.join('; ')}`);
  console.log(`PWA browser checks passed (${checks} assertions plus UI expectations). Screenshots: ${output}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
