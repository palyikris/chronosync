// Uses synthetic credentials and intercepts all external requests. No hosted writes.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
const playwrightModule = process.env.PLAYWRIGHT_MODULE_PATH || "playwright";
const { chromium } = require(playwrightModule);
const { expect } = require(`${playwrightModule}/test`);
const base = process.env.INVOICE_ATTACHMENT_UI_BASE_URL || "http://127.0.0.1:5193";
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
const output = process.env.INVOICE_ATTACHMENT_UI_OUTPUT || "/tmp/chronosync-invoice-attachment-ui";
await mkdir(output, { recursive: true });
const company = "00000000-0000-4000-8000-000000000001";
const clients = ["Ready client", "Missing metadata client", "Another ready client"].map((name, index) => ({
  id: `00000000-0000-4000-8000-00000000000${index + 2}`, company_id: company, name,
  client_code: `C${index}`, is_active: true, is_default: true, invoice_attachment_language: "en",
}));
const review = (client) => ({
  company_id: company, client_id: client.id, client_code: client.client_code, client_name: client.name,
  period_start: "2026-10-01", period_end: "2026-10-31", issue_date: "2026-11-04",
  fulfillment_date: "2026-10-31", due_date: "2026-11-12", payment_method: "Átutalás", language: "en",
  billing_model: "project", item_name: "Services", quantity: "1", unit: "invoice", net_unit_price: "100",
  vat_code: "27", currency: "EUR", net_total: "100", vat_total: "27", gross_total: "127",
  recipient: { name: `${client.name} Ltd`, country: "HU", postal_code: "1111", city: "Budapest",
    address: "Example street 1", send_email: false, email: null, tax_subject: 1, tax_number: "12345678-2-41" },
  items: [{project_id: "project", project_name: "Services", quantity: "2", unit: "hour", net_unit_price: "50",
    vat_code: "27", currency: "EUR", net_total: "100", vat_total: "27", gross_total: "127"}],
  attach_timesheet_report: true,
  attachment: { filename: `invoice-annex-${client.client_code}-2026-10-01-2026-10-31.xlsx`,
    media_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size_bytes: 7000, sha256: 'b'.repeat(64), language: 'en' },
  approved_entries: [], project_quantities: {}, review_fingerprint: "a".repeat(64),
});
const errors = [];
async function open({ allSkipped = false, allEligible = false, invoicingEnabled = true, failedDownload = false,
  emptyReport = false, reportFailureStatus = null, reviewHasTime = false, failedInvoice = false, language = "en", mobile = false } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 1000 }, acceptDownloads: true });
  const user = { id: company, email: "synthetic@example.invalid", role: "authenticated", aud: "authenticated", app_metadata: {}, user_metadata: {} };
  const expires = 2082758400;
  const token = [{alg: "HS256", typ: "JWT"}, {sub: company, exp: expires, role: "authenticated"}, "fake"]
    .map((part) => typeof part === "string" ? part : Buffer.from(JSON.stringify(part)).toString("base64url")).join(".");
  await context.addInitScript(({token, expires, user, language}) => {
    localStorage.setItem("i18nextLng", language);
    localStorage.setItem("sb-invoice-tests-auth-token", JSON.stringify({ access_token: token, refresh_token: "fake", expires_at: expires,
      expires_in: 3600, token_type: "bearer", user }));
  }, {token, expires, user, language});
  const calls = [];
  await context.route("**/*", async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === base) return route.continue();
    const json = (value, status = 200) => route.fulfill({status, contentType: "application/json", body: JSON.stringify(value)});
    if (url.pathname === "/rest/v1/clients") return json(clients);
    if (url.pathname === "/rest/v1/companies") return json({ enabled_modules: invoicingEnabled ? ["leave_attachments", "invoicing"] : ["leave_attachments"] });
    const body = request.postDataJSON();
    if (url.pathname.endsWith("/batch-review")) {
      calls.push({operation: "review", body});
      return json(clients.map((client, index) => ({client_id: client.id,
        review: allSkipped || (!allEligible && index === 1) ? null : {
          ...review(client),
          items: emptyReport ? [{...review(client).items[0], quantity: "1", unit: "month", net_unit_price: "100"}] : review(client).items,
          approved_entries: reviewHasTime ? [{id: company, project_id: company, project_name: "Services",
            work_date: "2026-10-01", hours_logged: 2, billing_multiplier: 1, description: "Approved work"}] : [],
        },
        reason: allSkipped || (!allEligible && index === 1) ? "Complete the client's billing profile before invoicing. Missing: billing_address." : null })));
    }
    if (url.pathname.endsWith("/generate-szamlamelleklet")) {
      calls.push({operation: "attachment", body});
      if (failedDownload) return json({detail: "Report conflict"}, 409);
      if (reportFailureStatus !== null) return json({detail: "Report unavailable"}, reportFailureStatus);
      if (emptyReport) return json({detail: "No approved or previously invoiced time entries were found for the selected clients and date range."}, 404);
      return route.fulfill({ status: 200, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers: {"content-disposition": "attachment; filename=attachments.xlsx", "access-control-expose-headers": "Content-Disposition"}, body: "synthetic-workbook" });
    }
    if (url.pathname.endsWith("/client-issue")) {
      calls.push({operation: "issue", body});
      if (allEligible) await new Promise((resolve) => setTimeout(resolve, 200));
      if (failedInvoice && body.client_id === clients[0].id) return json({detail: "The provider outcome is uncertain. Do not retry; reconcile from invoice history."}, 502);
      return json({ ...review(clients.find((client) => client.id === body.client_id)), invoice_number: `TEST-${body.client_id.slice(-1)}` });
    }
    throw new Error(`Unexpected external request: ${url.origin}${url.pathname}`);
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/tests/invoice-attachment-ui/`);
  try {
    await expect(page.getByText("Ready client", {exact: true})).toBeVisible();
  } catch (error) {
    console.error({ errors, body: await page.locator("body").innerText() });
    throw error;
  }
  return {context, page, calls};
}
async function preflight(page) {
  await page.getByRole("checkbox", {name: /Create real invoices automatically|Valódi számlák automatikus/}).check();
  await page.getByRole("button", {name: /Check invoices and continue|Számlák ellenőrzése és tovább/}).click();
  await expect(page.getByRole("heading", {name: /Review automatic invoices|Automatikus számlák áttekintése/})).toBeVisible();
}
try {
  // Existing path stays opt-in and never preflights or issues an invoice.
  {
    const {context, page, calls} = await open();
    await expect(page.getByRole("checkbox", {name: /Create real invoices automatically/})).not.toBeChecked();
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", {name: "Generate Invoice Attachments", exact: true}).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    assert.equal((await downloaded).suggestedFilename(), "attachments.xlsx");
    assert.deepEqual(calls.map((call) => call.operation), ["attachment"]);
    await context.close();
  }
  // Mixed eligibility requires explicit acknowledgement and preserves all attachment clients.
  {
    const {context, page, calls} = await open();
    await page.getByRole("checkbox", {name: /Finalize this month/}).check();
    await preflight(page);
    assert.deepEqual(calls.map((call) => call.operation), ["review"]);
    await expect(page.getByText(/Missing: billing_address/)).toBeVisible();
    const confirm = page.getByRole("button", {name: "Generate attachments and issue invoices"});
    await expect(confirm).toBeDisabled();
    await page.screenshot({path: `${output}/review-desktop.png`, fullPage: true, animations: "disabled"});
    await page.getByRole("button", {name: "Cancel", exact: true}).click();
    assert.equal(calls.length, 1);
    await preflight(page);
    await page.getByRole("checkbox", {name: /I have read/}).check();
    await confirm.click();
    await expect(page.getByRole("heading", {name: "Invoice generation results"})).toBeVisible();
    await expect(page.getByText(/Invoices processed: 2 \/ 2/)).toBeVisible();
    assert.deepEqual(calls.map((call) => call.operation), ["review", "review", "attachment", "issue", "issue"]);
    const attachment = calls.find((call) => call.operation === "attachment");
    assert.deepEqual(attachment.body.client_ids, clients.map((client) => client.id));
    assert.equal(attachment.body.update_remaining_hours, true);
    assert.deepEqual(calls.filter((call) => call.operation === "issue").map((call) => call.body.client_id), [clients[0].id, clients[2].id]);
    assert.ok(calls.filter((call) => call.operation === "issue").every((call) => call.body.confirm && call.body.review_fingerprint === "a".repeat(64)));
    await expect(page.getByRole("button", {name: "Generate attachments and issue invoices"})).toHaveCount(0);
    await context.close();
  }
  // A report failure cannot issue any invoice.
  {
    const {context, page, calls} = await open({failedDownload: true});
    await preflight(page);
    await page.getByRole("checkbox", {name: /I have read/}).check();
    await page.getByRole("button", {name: "Generate attachments and issue invoices"}).click();
    await expect(page.getByRole("alert")).toBeVisible();
    assert.deepEqual(calls.map((call) => call.operation), ["review", "attachment"]);
    await context.close();
  }
  // Recurring-only batches proceed without a timesheet export, in both UI languages.
  for (const language of ["en", "hu"]) {
    const {context, page, calls} = await open({allEligible: true, emptyReport: true, language, mobile: language === "hu"});
    const downloads = [];
    page.on("download", (download) => downloads.push(download));
    await preflight(page);
    assert.deepEqual(calls.map((call) => call.operation), ["review"]);
    const confirm = page.getByRole("button", {name: /Generate attachments and issue invoices|Mellékletek készítése és számlák kiállítása/});
    await expect(confirm).toBeDisabled();
    await page.getByRole("checkbox", {name: /I have read|Elolvastam/}).check();
    await confirm.evaluate((button) => { button.click(); button.click(); });
    await expect(page.getByText(/Invoices processed: 3 \/ 3|Feldolgozott számlák: 3 \/ 3/)).toBeVisible();
    await expect(page.getByText(/No time entries were available|Nem volt exportálható időbejegyzés/)).toBeVisible();
    await expect(page.getByText(/Timesheet export downloaded|Az időbejegyzések exportja letöltve/)).toHaveCount(0);
    assert.deepEqual(calls.map((call) => call.operation), ["review", "attachment", "issue", "issue", "issue"]);
    assert.equal(downloads.length, 0);
    assert.ok(calls.filter((call) => call.operation === "issue").every((call) => call.body.confirm && call.body.review_fingerprint === "a".repeat(64)));
    await page.screenshot({path: `${output}/recurring-only-${language}.png`, fullPage: true, animations: "disabled"});
    await context.close();
  }
  // Other 404s, permission errors and outages still stop before issuance.
  for (const reportFailureStatus of [401, 403, 404, 500]) {
    const {context, page, calls} = await open({allEligible: true, reportFailureStatus});
    await preflight(page);
    await page.getByRole("checkbox", {name: /I have read/}).check();
    await page.getByRole("button", {name: "Generate attachments and issue invoices"}).click();
    await expect(page.getByRole("alert")).toBeVisible();
    assert.deepEqual(calls.map((call) => call.operation), ["review", "attachment"]);
    await context.close();
  }
  // An empty report cannot bypass an inconsistent review or an attachment-only run.
  for (const options of [{allEligible: true, reviewHasTime: true}, {allSkipped: true}]) {
    const {context, page, calls} = await open({...options, emptyReport: true});
    await preflight(page);
    await page.getByRole("checkbox", {name: /I have read/}).check();
    await page.getByRole("dialog").getByRole("button", {name: /Generate attachments and issue invoices|Generate Invoice Attachments/}).click();
    await expect(page.getByRole("alert")).toBeVisible();
    assert.deepEqual(calls.map((call) => call.operation), ["review", "attachment"]);
    await context.close();
  }
  {
    const {context, page, calls} = await open({emptyReport: true});
    await page.getByRole("button", {name: "Generate Invoice Attachments", exact: true}).click();
    await expect(page.getByText("No approved or previously invoiced time entries were found for the selected clients and date range.", {exact: true})).toBeVisible();
    assert.deepEqual(calls.map((call) => call.operation), ["attachment"]);
    await context.close();
  }
  // An uncertain result is never retried; other eligible clients still complete.
  {
    const {context, page, calls} = await open({failedInvoice: true});
    await preflight(page);
    await page.getByRole("checkbox", {name: /I have read/}).check();
    await page.getByRole("button", {name: "Generate attachments and issue invoices"}).click();
    await expect(page.getByText(/Invoices processed: 2 \/ 2/)).toBeVisible();
    await expect(page.getByText(/Do not retry; reconcile/)).toBeVisible();
    assert.equal(calls.filter((call) => call.operation === "issue").length, 2);
    await expect(page.getByText(/TEST-4/)).toBeVisible();
    await context.close();
  }
  // Hungarian/mobile and all-ineligible path still allow attachments after acknowledgement.
  {
    const {context, page, calls} = await open({allSkipped: true, language: "hu", mobile: true});
    await page.screenshot({path: `${output}/selection-mobile-hu.png`, fullPage: true, animations: "disabled"});
    await preflight(page);
    const confirm = page.getByRole("button", {name: "Számlamellékletek generálása", exact: true});
    await expect(confirm).toBeDisabled();
    await page.screenshot({path: `${output}/review-mobile-hu.png`, fullPage: true, animations: "disabled"});
    await page.getByRole("checkbox", {name: /Elolvastam/}).check();
    await confirm.click();
    await expect(page.getByRole("heading", {name: "A számlakészítés eredménye"})).toBeVisible();
    assert.deepEqual(calls.map((call) => call.operation), ["review", "attachment"]);
    await context.close();
  }
  // All eligible: repeated activation cannot duplicate requests; Escape cannot dismiss a running batch.
  {
    const {context, page, calls} = await open({allEligible: true});
    await preflight(page);
    await expect(page.getByText(/Clients skipped for real invoicing/)).toHaveCount(0);
    await page.getByRole("checkbox", {name: /I have read/}).check();
    await page.getByRole("button", {name: "Generate attachments and issue invoices"}).evaluate((button) => {
      button.click();
      button.click();
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/Invoices processed: 3 \/ 3/)).toBeVisible();
    assert.deepEqual(calls.map((call) => call.operation), ["review", "attachment", "issue", "issue", "issue"]);
    await context.close();
  }
  // The attachment-only module never offers real invoicing.
  {
    const {context, page, calls} = await open({invoicingEnabled: false});
    await expect(page.getByRole("checkbox", {name: /Create real invoices automatically/})).toHaveCount(0);
    await page.getByRole("button", {name: "Generate Invoice Attachments", exact: true}).click();
    await expect.poll(() => calls.length).toBe(1);
    assert.deepEqual(calls.map((call) => call.operation), ["attachment"]);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log("PASS: attachment-only/download, recurring-only batches (EN/HU), preflight/cancel, mixed/all eligibility, report/permission/outage failures, partial invoice failure, Hungarian/mobile, all skipped, repeated clicks and Escape");
} finally {
  await browser.close();
}
