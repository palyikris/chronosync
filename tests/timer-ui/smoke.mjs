// Start Vite on port 5193 with a fake Supabase URL/key, then run with Playwright
// available via NODE_PATH. All external traffic and saves are intercepted locally.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const expect = require("playwright/test").expect.configure({ timeout: 12000 });
const base = process.env.TIMER_UI_BASE_URL || "http://127.0.0.1:5193";
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
});
const errors = [];

async function fixture({ language = "en", width = 1366, showWidget = true, persisted = false } = {}) {
  const labels = JSON.parse(await readFile(new URL(`../../src/locales/${language}.json`, import.meta.url), "utf8"));
  const context = await browser.newContext({ viewport: { width, height: 850 } });
  const user = { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "timer@example.invalid", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = [{ alg: "HS256", typ: "JWT" }, { sub: user.id, exp, role: "authenticated" }, "fake"].map(value => typeof value === "string" ? value : Buffer.from(JSON.stringify(value)).toString("base64url")).join(".");
  const session = { access_token: token, refresh_token: "fake", expires_at: exp, expires_in: 3600, token_type: "bearer", user };
  const profile = { ...user, company_id: "00000000-0000-4000-8000-000000000002", full_name: "Timer Tester", role: "company_admin", is_active: true, weekly_work_hours: 40, show_timesheet_timer: showWidget, company: { is_active: true } };
  const client = { id: "00000000-0000-4000-8000-000000000003", company_id: "00000000-0000-4000-8000-000000000002", name: "Test client", is_active: true };
  const project = { id: "00000000-0000-4000-8000-000000000004", client_id: client.id, company_id: "00000000-0000-4000-8000-000000000002", name: "Test project", is_active: true };
  const timer = { started_at: new Date(Date.now() - 75000).toISOString(), project_id: project.id, client_id: client.id, company_id: "00000000-0000-4000-8000-000000000002", description: "Preparing the monthly report and reviewing the supporting documents" };
  const state = { saveFailure: false, saveDelay: 0, attempts: [], entries: [] };
  await context.addInitScript(({ language, session, persisted, timer }) => {
    localStorage.setItem("i18nextLng", language);
    localStorage.setItem("sb-127-auth-token", JSON.stringify(session));
    if (!sessionStorage.getItem("timer-ui-initialized")) {
      if (persisted) localStorage.setItem("chronosync:active-timer:00000000-0000-4000-8000-000000000001", JSON.stringify(timer));
      sessionStorage.setItem("timer-ui-initialized", "true");
    }
  }, { language, session, persisted, timer });
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === base) return route.continue();
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname.endsWith("/auth/v1/user")) return json(user);
    if (url.pathname.endsWith("/auth/v1/token")) return json(session);
    const table = url.pathname.split("/").at(-1);
    const single = request.headers().accept?.includes("object");
    const offset = Number(url.searchParams.get("offset") ?? 0);
    if (table === "profiles") {
      if (request.method() === "PATCH") Object.assign(profile, request.postDataJSON());
      return json(single ? profile : offset ? [] : [profile]);
    }
    if (table === "clients") return json(single ? client : offset ? [] : [client]);
    if (table === "projects") return json(single ? project : offset ? [] : [project]);
    if (table === "timesheets") {
      if (request.method() === "POST") {
        const payload = request.postDataJSON()[0];
        state.attempts.push(payload);
        if (state.saveDelay) await new Promise(resolve => setTimeout(resolve, state.saveDelay));
        if (state.saveFailure) return json({ message: "Could not save. Try again." }, 400);
        const entry = { id: `entry-${state.entries.length + 1}`, status: "draft", ...payload };
        state.entries.push(entry);
        return json(entry);
      }
      return json(offset ? [] : state.entries);
    }
    return json([]);
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", error => errors.push(error.message));
  const running = page.locator("main > header").getByRole("group", { name: labels.timesheet.liveTimerTitle, exact: true });
  return { context, page, labels, state, timer, running };
}

try {
  const { context, page, labels, state, running } = await fixture();
  await page.goto(base + "/timesheet");
  await expect(page.locator("#live-timer-client")).toBeEnabled();
  await expect(running).toHaveCount(0);
  await page.locator("#live-timer-client").click();
  await page.getByRole("option", { name: "Test client", exact: true }).click();
  await page.locator("#live-timer-project").click();
  await page.getByRole("option", { name: "Test project", exact: true }).click();
  await page.locator("#live-timer-description").fill("Prepare the monthly report");
  await page.getByRole("button", { name: labels.timesheet.startTimer, exact: true }).click();
  await expect(page.getByRole("button", { name: labels.timesheet.stopTimer, exact: true })).toHaveCount(1);
  await expect(running).toHaveCount(0);
  const startedAt = await page.evaluate(() => JSON.parse(localStorage.getItem("chronosync:active-timer:00000000-0000-4000-8000-000000000001")).started_at);
  const firstDisplay = await page.getByRole("timer").innerText();
  await expect.poll(() => page.getByRole("timer").innerText()).not.toBe(firstDisplay);

  for (const path of ["/leaves", "/admin/dashboard", "/admin/review", "/admin/users", "/admin/settings", "/settings"]) {
    await page.locator(`aside a[href="${path}"]`).first().click();
    await expect(page).toHaveURL(base + path);
    await expect(running).toBeVisible();
    await expect(running.getByText("Test client", { exact: true })).toBeVisible();
    await expect(running.getByText("Test project", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: labels.timesheet.stopTimer, exact: true })).toHaveCount(1);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("chronosync:active-timer:00000000-0000-4000-8000-000000000001")).started_at), startedAt);
    if (path === "/leaves") {
      await running.getByRole("link", { name: labels.timesheet.returnToTimer }).click();
      await expect(page).toHaveURL(base + "/timesheet");
      await expect(running).toHaveCount(0);
      await expect(page.getByRole("button", { name: labels.timesheet.stopTimer, exact: true })).toHaveCount(1);
      await expect(page.locator("#live-timer-description")).toHaveValue("Prepare the monthly report");
    }
  }
  await page.reload();
  await expect(running).toBeVisible();
  await expect(running).toContainText("Prepare the monthly report");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  assert.equal(await page.locator("main > header").evaluate(element => element.getBoundingClientRect().top), 12);

  // Hiding the start controls cannot hide or stop an active timer.
  await page.getByRole("switch", { name: labels.userSettings.timerVisibilityToggleLabel }).click();
  await expect(running).toBeVisible();
  await running.getByRole("link", { name: labels.timesheet.returnToTimer }).click();
  await expect(page).toHaveURL(base + "/timesheet");
  await expect(page.locator("#live-timer-client")).toHaveCount(0);

  // A failed stop retains the timer, then a successful retry saves once.
  state.saveFailure = true;
  const dialog = page.waitForEvent("dialog");
  await running.getByRole("button", { name: labels.timesheet.stopTimer, exact: true }).click();
  const failure = await dialog;
  assert.equal(failure.message(), labels.timesheet.timerStopFailed);
  await failure.dismiss();
  await expect(running).toBeVisible();
  assert.ok(await page.evaluate(() => localStorage.getItem("chronosync:active-timer:00000000-0000-4000-8000-000000000001")));
  state.saveFailure = false;
  state.saveDelay = 800;
  await running.getByRole("button", { name: labels.timesheet.stopTimer, exact: true }).click();
  await expect(running.getByRole("button")).toBeDisabled();
  await page.locator('aside a[href="/settings"]').first().click();
  await expect(running.getByRole("button")).toBeDisabled();
  await expect(running).toHaveCount(0);
  assert.equal(state.entries.length, 1);
  assert.equal(state.attempts.length, 2);
  assert.equal(await page.evaluate(() => localStorage.getItem("chronosync:active-timer:00000000-0000-4000-8000-000000000001")), null);
  await context.close();

  // The floating timer shares the page gutters in both sidebar states, even
  // when wide screens center the content inside its maximum width.
  for (const width of [1024, 1366, 1920, 2560]) {
    const { context, page, labels, running } = await fixture({ language: "hu", width, persisted: true });
    await page.goto(base + "/settings");
    await expect(page.getByRole("heading", { name: labels.userSettings.title, exact: true })).toBeVisible();
    for (const collapsed of [false, true, false]) {
      if (collapsed !== await page.evaluate(() => localStorage.getItem("chronosync:sidebar:collapsed") === "true")) {
        await page.getByRole("button", { name: collapsed ? "Collapse sidebar" : "Expand sidebar", exact: true }).click();
      }
      await expect.poll(() => page.locator("aside").evaluate(element => Math.round(element.getBoundingClientRect().width))).toBe(collapsed ? 68 : 256);
      await expect.poll(() => running.evaluate(element => {
        const page = document.querySelector("main > div"), rect = page.getBoundingClientRect(), styles = getComputedStyle(page);
        const timer = element.getBoundingClientRect();
        return Math.max(Math.abs(timer.left - rect.left - parseFloat(styles.paddingLeft)), Math.abs(timer.right - rect.right + parseFloat(styles.paddingRight)));
      })).toBeLessThan(1);
      const timerBounds = await running.boundingBox();
      const sidebarBounds = await page.locator("aside").boundingBox();
      assert.ok(timerBounds.x - sidebarBounds.x - sidebarBounds.width >= 24);
      await expect(running.getByRole("button", { name: labels.timesheet.stopTimer, exact: true })).toBeVisible();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (width === 1366) await page.screenshot({ path: `/tmp/chronosync-running-timer-sidebar-${collapsed ? "collapsed" : "expanded"}.png` });
    }
    await context.close();
  }

  for (const language of ["en", "hu"]) {
    for (const width of [320, 390, 768, 1366]) {
      const { context, page, labels, timer, running } = await fixture({ language, width, showWidget: false, persisted: true });
      await page.goto(base + "/settings");
      await expect(page.getByRole("heading", { name: labels.userSettings.title, exact: true })).toBeVisible();
      await expect(running).toBeVisible();
      await expect(running.getByText("Test client", { exact: true })).toBeVisible();
      await expect(running.getByText("Test project", { exact: true })).toBeVisible();
      await expect(running.getByRole("timer")).toHaveText(/^00:01:\d{2}$/);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const bounds = await running.boundingBox();
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 850);
      const stop = await running.getByRole("button", { name: labels.timesheet.stopTimer, exact: true }).boundingBox();
      assert.ok(stop.width >= 44 && stop.height >= 44);
      if (width === 320 || width === 1366) {
        await page.screenshot({ path: `/tmp/chronosync-running-timer-${language}-${width}.png` });
      }
      // Another tab's changes are reflected without navigation or a reload.
      const other = await context.newPage();
      await other.goto(base + "/settings");
      await other.evaluate(() => localStorage.removeItem("chronosync:active-timer:00000000-0000-4000-8000-000000000001"));
      await expect(running).toHaveCount(0);
      await other.evaluate(timer => localStorage.setItem("chronosync:active-timer:00000000-0000-4000-8000-000000000001", JSON.stringify(timer)), timer);
      await expect(running).toBeVisible();
      await other.evaluate(() => localStorage.clear());
      await expect(running).toHaveCount(0);
      await context.close();
    }
  }
  assert.deepEqual(errors, []);
  console.log("Timer checks passed: start, tick, navigation, reload, sticky header, return, stop/retry, save during navigation, hidden widget, two languages, mobile/tablet/desktop, and cross-tab changes.");
} catch (error) {
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      console.error("Timer check failed at", page.url(), await page.locator("h1").allTextContents());
      await page.screenshot({ path: "/tmp/chronosync-running-timer-failure.png" }).catch(() => {});
    }
  }
  throw error;
} finally {
  await browser.close();
}
