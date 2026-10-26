// Start Vite with VITE_SUPABASE_URL=http://127.0.0.1:54321 and a fake publishable key.
// Run with Playwright available through NODE_PATH. Every external request is mocked.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { expect } = require("playwright/test");
const language = process.env.ATTENTION_UI_LANGUAGE || "en";
const { timesheet: labels, common } = JSON.parse(await readFile(new URL(`../../src/locales/${language}.json`, import.meta.url), "utf8"));
const base = process.env.ATTENTION_UI_BASE_URL || "http://127.0.0.1:5192";
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
});
const context = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
const user = { id: "user-1", aud: "authenticated", role: "authenticated", email: "tester@example.invalid", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = [{ alg: "HS256", typ: "JWT" }, { sub: user.id, exp, role: "authenticated" }, "fake"].map(x => typeof x === "string" ? x : Buffer.from(JSON.stringify(x)).toString("base64url")).join(".");
const session = { access_token: token, refresh_token: "fake", expires_at: exp, expires_in: 3600, token_type: "bearer", user };
const profile = { ...user, company_id: "company-1", full_name: "Test Person", role: "regular", is_active: true, weekly_work_hours: 40, show_timesheet_timer: false, company: { is_active: true } };
const clients = [
  { id: "client-1", company_id: "company-1", name: "AIR FRANCE MAGYARORSZÁGI KÉPVISELETE", is_active: true },
  { id: "client-2", company_id: "company-1", name: "Other client", is_active: true },
];
const projects = [{ id: "project-1", company_id: "company-1", client_id: "client-1", name: "Éves bevallások készítése és kapcsolódó projektfeladatok", is_active: true }];
const today = new Date();
const todayValue = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
const makeEntry = (id, work_date, status, rejection_reason) => ({ id, user_id: user.id, company_id: "company-1", client_id: "client-1", project_id: "project-1", work_date, status, rejection_reason, description: id, hours_logged: 2, created_at: "2024-01-01T12:00:00Z" });
const entries = [
  makeEntry("Old rejected work", "2024-01-15", "rejected", "Please describe the deliverable.\nInclude the ticket number."),
  makeEntry("Rejected without reason", todayValue, "rejected", "  "),
  makeEntry("Outstanding draft", "2023-04-03", "draft"),
  makeEntry("Submitted work", "2024-01-16", "submitted"),
  makeEntry("Approved work", "2024-01-17", "approved"),
  makeEntry("Invoiced work", "2024-01-18", "invoiced"),
  { ...makeEntry("Other user's draft", "2022-01-01", "draft"), user_id: "other-user" },
];
let failPatch = false, failAttention = false;
const patches = [], reads = [], errors = [];
await context.addInitScript(({ session, language }) => {
  localStorage.setItem("i18nextLng", language);
  localStorage.setItem("sb-127-auth-token", JSON.stringify(session));
  if (!localStorage.getItem("chronosync:timesheet:view")) {
    localStorage.setItem("chronosync:timesheet:view", "calendar");
  }
}, { session, language });
await context.route("**/*", async route => {
  const request = route.request(), url = new URL(request.url());
  if (url.origin === base) return route.continue();
  const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  if (url.pathname.endsWith("/auth/v1/user")) return json(user);
  if (url.pathname.endsWith("/auth/v1/token")) return json(session);
  const table = url.pathname.split("/").at(-1);
  const isSingle = request.headers().accept?.includes("object");
  if (table === "profiles") return json(isSingle ? profile : [profile]);
  if (table === "clients") return json(Number(url.searchParams.get("offset")) ? [] : clients);
  if (table === "projects") return json(Number(url.searchParams.get("offset")) ? [] : projects);
  if (table === "timesheets") {
    let rows = entries.filter(entry => [...url.searchParams].every(([field, expression]) => {
      if (!["user_id", "id", "status", "work_date"].includes(field)) return true;
      const index = expression.indexOf("."), op = expression.slice(0, index), value = expression.slice(index + 1);
      if (op === "eq") return entry[field] === value;
      if (op === "in") return value.slice(1, -1).split(",").map(value => value.replaceAll('"', "")).includes(entry[field]);
      if (op === "gte") return entry[field] >= value;
      if (op === "lt") return entry[field] < value;
      return true;
    }));
    if (request.method() === "PATCH") {
      const payload = request.postDataJSON();
      patches.push({ payload, ids: rows.map(row => row.id) });
      if (failPatch) return json({ message: "Save failed. Try again." }, 400);
      rows.forEach(row => Object.assign(row, payload));
      return json(isSingle ? rows[0] : rows);
    }
    if (request.method() === "DELETE") {
      rows.forEach(row => entries.splice(entries.indexOf(row), 1));
      return json([]);
    }
    const isAttention = url.searchParams.get("status") === "in.(draft,rejected)";
    if (isAttention) {
      reads.push(url.search);
      if (failAttention) return json({ message: "Attention read failed" }, 400);
    }
    for (const clause of (url.searchParams.get("order") ?? "").split(",").reverse()) {
      const [field, direction] = clause.split(".");
      rows.sort((a, b) => String(a[field]).localeCompare(String(b[field])) * (direction === "desc" ? -1 : 1));
    }
    const offset = Number(url.searchParams.get("offset") ?? 0);
    if (isAttention) rows = rows.slice(offset, offset + 2); // Exercise a short API page.
    return json(isSingle ? rows[0] : rows);
  }
  return json([]);
});
const page = await context.newPage();
page.on("pageerror", error => errors.push(error.message));
page.setDefaultTimeout(12000);
try {
  await page.goto(base + "/timesheet");
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByText(labels.noRejectionReason, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: labels.editAndResubmit, exact: true })).toBeVisible();

  const viewSelector = page.getByRole("tablist", { name: labels.viewOptions, exact: true });
  await viewSelector.getByRole("tab", { name: labels.calendarView, exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(viewSelector.getByRole("tab", { name: labels.listView, exact: true })).toBeFocused();
  await expect(viewSelector.getByRole("tab", { name: labels.listView, exact: true })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(viewSelector.getByRole("tab", { name: labels.needsAttention, exact: true })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(viewSelector.getByRole("tab", { name: labels.calendarView, exact: true })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(viewSelector.getByRole("tab", { name: labels.needsAttention, exact: true })).toBeFocused();
  await page.keyboard.press("Home");

  const filterBar = page.getByRole("region", { name: labels.filterEntries, exact: true });
  await filterBar.getByRole("button", { name: labels.filtersExpand, exact: true }).click();
  const viewLabels = [labels.calendarView, labels.listView, labels.needsAttention];
  const widths = [320, 390, 640, 768, 1024, 1280, 1440, 1920];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    for (const viewLabel of viewLabels) {
      await page.getByRole("tab", { name: viewLabel, exact: true }).click();
      await expect(page.getByRole("tab", { name: viewLabel, exact: true })).toHaveAttribute("aria-selected", "true");
      await expect.poll(() => viewSelector.evaluate(control => {
        const selected = control.querySelector('[aria-selected="true"]').getBoundingClientRect();
        const highlight = control.querySelector(':scope > span[aria-hidden="true"]').getBoundingClientRect();
        const labelsCentered = [...control.querySelectorAll('[role="tab"]')].every(tab => {
          const button = tab.getBoundingClientRect();
          const label = tab.querySelector(':scope > span').getBoundingClientRect();
          return Math.abs(button.top + button.height / 2 - label.top - label.height / 2) <= 0.5;
        });
        return labelsCentered && ["left", "top", "width", "height"].every(edge => Math.abs(selected[edge] - highlight[edge]) <= 0.5);
      })).toBe(true);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const layout = await page.evaluate(() => {
        const issues = [];
        for (const article of document.querySelectorAll("article")) {
          for (const element of [article, article.parentElement, article.querySelector("footer")]) {
            if (element.scrollWidth > element.clientWidth + 1) issues.push(`Internal overflow: ${element.tagName}`);
          }
          const secondary = [...article.querySelectorAll('button[aria-label]')];
          if (new Set(secondary.map(button => Math.round(button.getBoundingClientRect().y))).size > 1) issues.push("Secondary actions wrap apart");
        }
        for (const button of document.querySelectorAll("main button")) {
          const bounds = button.getBoundingClientRect();
          if (!bounds.width || !bounds.height) continue;
          for (let parent = button.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
            const style = getComputedStyle(parent);
            if (!["hidden", "clip", "auto", "scroll"].includes(style.overflowX)) continue;
            const clip = parent.getBoundingClientRect();
            if (bounds.left < clip.left - 1 || bounds.right > clip.right + 1) issues.push(`Clipped control: ${button.getAttribute("aria-label") || button.innerText}`);
          }
        }
        return issues;
      });
      assert.deepEqual(layout, [], `${language} ${viewLabel} at ${width}px`);
      const clientBounds = await filterBar.getByRole("button", { name: labels.client, exact: true }).boundingBox();
      const projectBounds = await filterBar.getByRole("button", { name: labels.project, exact: true }).boundingBox();
      assert.ok(clientBounds.width >= 120 && projectBounds.width >= 120, "Expanded filter fields remain usable");
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("tab", { name: labels.calendarView, exact: true }).click();
  await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))));
  await page.screenshot({ path: `/tmp/chronosync-layout-calendar-${language}.png`, fullPage: true });
  await viewSelector.screenshot({ path: `/tmp/chronosync-view-selector-${language}.png` });
  const deleteButton = page.getByRole("article").getByRole("button", { name: labels.deleteEntry, exact: true });
  await deleteButton.hover();
  const tooltip = page.getByRole("tooltip", { name: labels.deleteEntry, exact: true });
  await expect(tooltip).toBeVisible();
  const tooltipBounds = await tooltip.boundingBox();
  assert.ok(tooltipBounds.x >= 0 && tooltipBounds.x + tooltipBounds.width <= 1440, "Action tooltip stays inside the viewport");
  await deleteButton.focus();
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
  await page.mouse.move(0, 0);
  await filterBar.getByRole("button", { name: labels.filtersCollapse, exact: true }).click();

  const attention = page.getByRole("tab", { name: labels.needsAttention, exact: true });
  await attention.click();
  await expect(page.getByRole("article")).toHaveCount(3);
  assert.ok(reads.some(read => read.includes("offset=2")), "Fetches the next page despite an API cap below the requested size");
  assert.deepEqual(await page.getByRole("article").locator("time").evaluateAll(times => times.map(time => time.dateTime)), ["2024-01-15", todayValue, "2023-04-03"]);
  await expect(page.getByText("Include the ticket number.", { exact: false })).toBeVisible();
  await expect(attention).toContainText("3");
  await expect(page.getByRole("article").filter({ hasText: "Submitted work" })).toHaveCount(0);
  await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))));
  await page.screenshot({ path: "/tmp/chronosync-needs-attention-desktop.png", fullPage: true });
  await viewSelector.screenshot({ path: `/tmp/chronosync-view-selector-attention-${language}.png` });

  await page.getByRole("button", { name: labels.filtersExpand }).click();
  await page.getByRole("button", { name: labels.client, exact: true }).click();
  await page.getByRole("option", { name: "Other client", exact: true }).click();
  await expect(page.getByText(labels.noAttentionMatches, { exact: true })).toBeVisible();
  await expect(page.getByText(labels.allCaughtUp, { exact: true })).toHaveCount(0);
  await expect(attention).toContainText("3"); // Filtering does not hide unresolved work for other clients.
  await page.getByRole("button", { name: common.clearFilters, exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(3);

  const oldCard = page.getByRole("article").filter({ hasText: "Old rejected work" });
  await oldCard.getByRole("button", { name: labels.editAndResubmit, exact: true }).click();
  let dialog = page.getByRole("dialog", { name: labels.editAndResubmit, exact: true });
  await expect(dialog.getByText("Include the ticket number.", { exact: false })).toBeVisible();
  await dialog.getByRole("button", { name: labels.cancel, exact: true }).click();
  assert.equal(patches.length, 0, "Opening and cancelling does not resubmit");
  await oldCard.getByRole("button", { name: labels.editAndResubmit, exact: true }).click();
  await dialog.getByLabel(labels.taskDescription, { exact: true }).fill("Delivered homepage, ticket WEB-42");
  failPatch = true;
  await dialog.getByRole("button", { name: labels.saveAndResubmit, exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(labels.saveFailed);
  await expect(dialog.getByLabel(labels.taskDescription, { exact: true })).toHaveValue("Delivered homepage, ticket WEB-42");
  assert.equal(entries[0].status, "rejected", "Failed save preserves rejected status and reason");
  failPatch = false;
  await dialog.getByRole("button", { name: labels.saveAndResubmit, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(oldCard).toHaveCount(0);
  await expect(attention).toContainText("2");
  assert.equal(entries[0].status, "submitted");
  assert.equal(entries[0].description, "Delivered homepage, ticket WEB-42");
  assert.equal(entries[0].rejection_reason, null);
  assert.ok(entries[0].submitted_at);
  assert.ok(patches.every(patch => patch.payload.status === "submitted"), "Corrections and resubmission are atomic");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(attention).toBeVisible();
  await page.getByRole("button", { name: labels.editAndResubmit, exact: true }).click();
  dialog = page.getByRole("dialog", { name: labels.editAndResubmit, exact: true });
  await expect(dialog.getByText(labels.noRejectionReason, { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect.poll(() => dialog.evaluate(element => getComputedStyle(element).transform)).toBe("none");
  await page.screenshot({ path: "/tmp/chronosync-resubmit-mobile.png", fullPage: false });
  await dialog.getByRole("button", { name: labels.saveAndResubmit, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByRole("button", { name: labels.submitEntry, exact: true }).click();
  await expect(attention).toHaveCount(0);
  await expect(viewSelector.getByRole("tab", { name: labels.calendarView, exact: true })).toHaveAttribute("aria-selected", "true");

  await page.setViewportSize({ width: 1366, height: 1000 });
  await page.evaluate(() => localStorage.setItem("chronosync:timesheet:view", "attention"));
  await page.reload();
  await expect(attention).toHaveCount(0);
  await expect(viewSelector.getByRole("tab", { name: labels.calendarView, exact: true })).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("chronosync:timesheet:view"))).toBe("calendar");

  entries.push(makeEntry("New outstanding draft", "2022-01-10", "draft"));
  await page.evaluate(() => window.dispatchEvent(new Event("chronosync:timesheet-updated")));
  await expect(attention).toContainText("1");
  await expect(viewSelector.getByRole("tab", { name: labels.calendarView, exact: true })).toHaveAttribute("aria-selected", "true");
  await attention.click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("chronosync:timesheet:view"))).toBe("attention");
  failAttention = true;
  await page.reload();
  await expect(page.getByRole("alert").filter({ hasText: common.loadError })).toBeVisible({ timeout: 25000 });
  await expect(page.getByText(labels.allCaughtUp, { exact: true })).toHaveCount(0);
  failAttention = false;
  await page.getByRole("button", { name: common.retry, exact: true }).click();
  await expect(page.getByRole("article").filter({ hasText: "New outstanding draft" })).toBeVisible();
  await expect(attention).toContainText("1");
  await page.getByRole("button", { name: labels.deleteEntry, exact: true }).click();
  await expect(attention).toHaveCount(0);
  await expect(viewSelector.getByRole("tab", { name: labels.calendarView, exact: true })).toHaveAttribute("aria-selected", "true");
  await viewSelector.getByRole("tab", { name: labels.listView, exact: true }).click();
  await page.reload();
  await expect(viewSelector.getByRole("tab", { name: labels.listView, exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(attention).toHaveCount(0);
  assert.deepEqual(errors, []);
  console.log(`Needs attention browser checks passed (${language}): ${widths.length * viewLabels.length} responsive layouts, long labels, no clipped controls or internal scrollbars, tooltips, and the complete resubmission workflow.`);
} catch (error) {
  console.error("Attention check failed:", language, page.url(), await page.evaluate(() => localStorage.getItem("chronosync:timesheet:view")), (await page.locator("main").innerText()).slice(0, 1600));
  throw error;
} finally {
  await context.close();
  await browser.close();
}
