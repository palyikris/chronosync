// Run Vite with a fake Supabase URL. Every API request is intercepted locally.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { expect } = require("playwright/test");
const base = process.env.CALENDAR_UI_BASE_URL ?? "http://127.0.0.1:5196";
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
});
const ids = Array.from({ length: 7 }, (_, index) =>
  `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);
const [userId, companyId, clientId, projectId, otherClientId, otherProjectId, emptyProjectId] = ids;
const errors = [];

async function run(language) {
  const { timesheet: labels, common } = JSON.parse(await readFile(
    new URL(`../../src/locales/${language}.json`, import.meta.url), "utf8"));
  const context = await browser.newContext({ viewport: { width: 1366, height: 1000 },
    timezoneId: "Europe/Budapest" });
  const user = { id: userId, aud: "authenticated", role: "authenticated",
    email: "calendar-test@example.invalid", app_metadata: {}, user_metadata: {},
    created_at: "2026-01-01T00:00:00Z" };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = [{ alg: "HS256", typ: "JWT" }, { sub: userId, exp, role: "authenticated" }, "fake"]
    .map(value => typeof value === "string" ? value : Buffer.from(JSON.stringify(value)).toString("base64url")).join(".");
  const session = { access_token: token, refresh_token: "fake", expires_at: exp,
    expires_in: 3600, token_type: "bearer", user };
  const profile = { ...user, company_id: companyId, full_name: "Calendar Tester",
    role: "regular", is_active: true, show_timesheet_timer: false, company: { is_active: true } };
  const clients = [
    { id: clientId, company_id: companyId, name: "First client", is_active: true },
    { id: otherClientId, company_id: companyId, name: "Second client", is_active: true },
  ];
  const projects = [
    { id: projectId, client_id: clientId, company_id: companyId, name: "First project", is_active: true },
    { id: otherProjectId, client_id: otherClientId, company_id: companyId, name: "Second project", is_active: true },
    { id: emptyProjectId, client_id: clientId, company_id: companyId, name: "Empty project", is_active: true },
  ];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" }).format(new Date());
  const month = today.slice(0, 7);
  const otherDay = `${month}-${today.endsWith("01") ? "02" : "01"}`;
  const otherClientDay = ["01", "02", "03"].map(day => `${month}-${day}`)
    .find(day => day !== today && day !== otherDay);
  const entry = (index, work_date) => ({ id: `entry-${index}`, user_id: userId,
    company_id: companyId, client_id: index % 2 ? clientId : otherClientId,
    project_id: index % 2 ? projectId : otherProjectId, work_date, hours_logged: 1,
    description: `Existing entry ${index}`, status: "draft", created_at: "2026-01-01T12:00:00Z" });
  const entries = Array.from({ length: 54 }, (_, index) => index < 44
    ? entry(index, index < 4 ? today : otherDay)
    : { ...entry(index, otherClientDay), client_id: otherClientId, project_id: otherProjectId });
  const reads = [], writes = [];
  let holdMonthRead, releaseMonthRead;
  await context.addInitScript(({ session, language }) => {
    localStorage.setItem("sb-127-auth-token", JSON.stringify(session));
    localStorage.setItem("i18nextLng", language);
    localStorage.setItem("chronosync:timesheet:view", "calendar");
  }, { session, language });
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === base) return route.continue();
    const json = body => route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname.endsWith("/auth/v1/user")) return json(user);
    if (url.pathname.endsWith("/auth/v1/token")) return json(session);
    const table = url.pathname.split("/").at(-1);
    if (table === "profiles") return json(request.headers().accept?.includes("object") ? profile : [profile]);
    if (table === "clients") return json(clients);
    if (table === "projects") return json(projects);
    if (table !== "timesheets") return json([]);
    if (request.method() === "POST") {
      const payload = request.postDataJSON()[0];
      writes.push(payload);
      const saved = { ...payload, id: `saved-${writes.length}`, status: "draft", created_at: new Date().toISOString() };
      entries.push(saved);
      return json(saved);
    }
    const isMonthRead = url.searchParams.getAll("work_date").includes(`gte.${month}-01`);
    if (isMonthRead && holdMonthRead) await holdMonthRead;
    let rows = entries.filter(row => [...url.searchParams].every(([field, expression]) => {
      if (!["user_id", "work_date", "status"].includes(field)) return true;
      const [op, value] = [expression.slice(0, expression.indexOf(".")), expression.slice(expression.indexOf(".") + 1)];
      return op === "eq" ? row[field] === value : op === "gte" ? row[field] >= value
        : op === "lt" ? row[field] < value : op === "in" ? value.slice(1, -1).split(",").includes(row[field]) : true;
    }));
    for (const clause of (url.searchParams.get("order") ?? "").split(",").reverse()) {
      const [field, direction] = clause.split(".");
      rows.sort((a, b) => String(a[field]).localeCompare(String(b[field])) * (direction === "desc" ? -1 : 1));
    }
    rows = rows.slice(Number(url.searchParams.get("offset") ?? 0));
    reads.push({ isMonthRead, count: rows.length });
    return json(rows);
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", error => errors.push(error.message));
  const filterBar = page.getByRole("region", { name: labels.filterEntries, exact: true });
  const choose = async (container, label, name) => {
    await container.getByRole("button", { name: label, exact: true }).click();
    await page.getByRole("option", { name, exact: true }).click();
  };
  const save = async description => {
    await page.getByRole("button", { name: labels.addEntry, exact: true }).filter({ visible: true }).click();
    const modal = page.getByRole("dialog", { name: labels.entryTitleNew, exact: true });
    await choose(modal, labels.client, "First client");
    await choose(modal, labels.project, "First project");
    await modal.getByRole("spinbutton", { name: labels.totalHours }).fill("0.5");
    await modal.getByRole("textbox", { name: labels.taskDescription }).fill(description);
    await modal.getByRole("button", { name: labels.saveEntry, exact: true }).click();
    await modal.waitFor({ state: "detached" });
  };
  try {
    await page.goto(base + "/timesheet");
    await expect(page.getByRole("article")).toHaveCount(4);
    const todayCell = page.getByRole("button", { name: new RegExp(`^${today},`) });
    await expect(todayCell).toHaveAttribute("aria-label", `${today}, 4 hours logged`);
    const otherClientCell = page.getByRole("button", { name: new RegExp(`^${otherClientDay}(,|$)`) });
    await expect(otherClientCell).toHaveAttribute("aria-label", `${otherClientDay}, 10 hours logged`);

    // A slow post-save refetch must retain every previously displayed entry.
    holdMonthRead = new Promise(resolve => { releaseMonthRead = resolve; });
    await save("New calendar work");
    await expect(page.getByRole("article")).toHaveCount(4);
    releaseMonthRead(); holdMonthRead = null;
    await expect(page.getByRole("article")).toHaveCount(5);
    await expect(todayCell).toHaveAttribute("aria-label", `${today}, 4.5 hours logged`);
    await expect(otherClientCell).toHaveAttribute("aria-label", `${otherClientDay}, 10 hours logged`);
    await expect(filterBar.getByRole("status")).toHaveCount(0);
    assert.ok(reads.some(read => read.isMonthRead && read.count === 55));
    for (let index = 0; index < 4; index++) {
      await expect(page.getByRole("article").getByText(`Existing entry ${index}`, { exact: true })).toBeVisible();
    }

    // Reproduce the reported symptom: a collapsed filter hides other clients,
    // survives saving, and is cleared by a browser refresh.
    await filterBar.getByRole("button", { name: labels.filtersExpand, exact: true }).click();
    await choose(filterBar, labels.client, "First client");
    await filterBar.getByRole("button", { name: labels.filtersCollapse, exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(3);
    await expect(otherClientCell).toHaveAttribute("aria-label", otherClientDay);
    await expect(filterBar.getByRole("status")).toContainText("First client");
    await expect(filterBar.getByRole("status")).toContainText(labels.filterEntriesActive);
    await save("Work with a filter active");
    await expect(page.getByRole("article")).toHaveCount(4);
    await expect(filterBar.getByRole("status")).toContainText("First client");
    assert.equal(entries.length, 56);
    await filterBar.getByRole("button", { name: common.clearFilters, exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(6);
    await expect(otherClientCell).toHaveAttribute("aria-label", `${otherClientDay}, 10 hours logged`);
    await expect(filterBar.getByRole("status")).toHaveCount(0);

    await filterBar.getByRole("button", { name: labels.filtersExpand, exact: true }).click();
    await choose(filterBar, labels.client, "First client");
    await choose(filterBar, labels.project, "Empty project");
    await filterBar.getByRole("button", { name: labels.filtersCollapse, exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(filterBar.getByRole("status")).toContainText("Empty project");
    await expect(page.getByText(labels.noEntriesMatchFilters, { exact: true })).toBeVisible();
    await expect(page.getByText(labels.noEntries, { exact: true })).toHaveCount(0);
    for (const width of [320, 390, 1366]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(filterBar.getByRole("status")).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.screenshot({ path: `/tmp/chronosync-calendar-filters-${language}.png`, fullPage: true });
    await page.reload();
    await expect(page.getByRole("article")).toHaveCount(6);
    await expect(filterBar.getByRole("status")).toHaveCount(0);
    assert.equal(writes.length, 2);
    console.log(`Passed ${language} calendar save, refetch, collapsed filters, empty results and refresh checks.`);
  } finally {
    releaseMonthRead?.();
    await context.close();
  }
}

try {
  for (const language of ["en", "hu"]) await run(language);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
