import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "../types/auth";
import type { ClientInvoiceReview } from "../types/client-billing";
import type { DemoSnapshot } from "./protocol";

// The demo uses a reserved, non-routable origin. This transport never falls back
// to network fetch, even for an endpoint that has not been implemented here.
export const DEMO_ORIGIN = "https://demo.chronosync.invalid";
export const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000002";
export const DEMO_CLIENT_ID = "00000000-0000-4000-8000-000000000003";
export const DEMO_PROJECT_ID = "00000000-0000-4000-8000-000000000004";
export const DEMO_DATE = "2026-10-22";
export const DEMO_PERIOD = { start: "2026-10-01", end: "2026-10-31" };

export const demoProfile: UserProfile = {
  id: DEMO_USER_ID, company_id: DEMO_COMPANY_ID, email: "jamie@example.invalid",
  full_name: "Jamie Davis", role: "company_admin", is_active: true,
  weekly_work_hours: 40, show_timesheet_timer: true, created_at: "2026-10-01T00:00:00Z",
  companies: { name: "ChronoSync demo" },
};

export const demoUser: User = {
  id: DEMO_USER_ID, email: demoProfile.email, aud: "authenticated",
  role: "authenticated", app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {}, created_at: demoProfile.created_at,
};

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

function initialTables(): Tables {
  const common = { company_id: DEMO_COMPANY_ID, created_at: "2026-10-01T00:00:00Z" };
  return {
    profiles: [{ ...demoProfile }],
    companies: [{ id: DEMO_COMPANY_ID, name: "ChronoSync demo", billing_email: "team@example.invalid",
      szamlazz_test_mode: true, is_active: true, is_deleted: false, deleted_at: null,
      enabled_modules: ["leave_attachments", "invoicing"], leave_client_id: null, leave_project_id: null, created_at: common.created_at }],
    clients: [{ ...common, id: DEMO_CLIENT_ID, name: "Acme Studio", client_code: "ACME",
      is_active: true, is_default: true, invoice_attachment_language: "en",
      available_hours_per_month: 80, hours_from_previous_month: 0 }],
    projects: [{ ...common, id: DEMO_PROJECT_ID, client_id: DEMO_CLIENT_ID,
      name: "Brand exploration", estimated_hours_per_month: 40, is_payroll: false, is_active: true }],
    timesheets: [
      ["2026-10-19", 8, "Brand research"],
      ["2026-10-20", 8, "Creative direction"],
      ["2026-10-21", 6, "Concept development"],
    ].map(([date, hours, description], index) => ({
      ...common, id: `00000000-0000-4000-8000-00000000001${index}`,
      user_id: DEMO_USER_ID, client_id: DEMO_CLIENT_ID, project_id: DEMO_PROJECT_ID,
      work_date: date, hours_logged: hours, billing_multiplier: 1, description, status: "draft",
      approved_at: null, approved_by: null, submitted_at: null, rejection_reason: null,
    })),
    client_billing_profiles: [{ ...common, client_id: DEMO_CLIENT_ID,
      billing_name: "Acme Studio", billing_country_code: "HU", billing_postal_code: "1011",
      billing_city: "Budapest", billing_address: "Sample street 1 (fictional)", tax_subject: 1,
      tax_number: "12345678-2-41", eu_vat_number: null, group_tax_number: null,
      billing_email: "billing@example.invalid", send_invoice_email: false,
      invoice_language: "en", payment_method: "Bank transfer", payment_term_days: 8,
      vat_code: "27", automatic_invoicing_enabled: false, invoice_schedule_day: 1,
      attach_timesheet_report: true, updated_at: common.created_at }],
    project_pricing: [{ ...common, project_id: DEMO_PROJECT_ID, pricing_year: 2026,
      original_fee: 75, original_fee_text: "75", original_currency: "EUR", original_unit: "hour",
      indexed_fee: 75, currency: "EUR", unit: "hour", index_code: "none" }],
    leave_requests: [], user_favorite_projects: [], company_price_indexes: [],
  };
}

function matches(row: Row, key: string, expression: string): boolean {
  const separator = expression.indexOf(".");
  const operator = expression.slice(0, separator);
  const argument = expression.slice(separator + 1);
  const value = key.split(".").reduce<unknown>((current, part) =>
    current && typeof current === "object" ? (current as Row)[part] : undefined, row);
  if (operator === "eq") return String(value) === argument;
  if (operator === "neq") return String(value) !== argument;
  if (operator === "in") return argument.replace(/^\(|\)$/g, "").split(",").includes(String(value));
  if (operator === "gte") return String(value) >= argument;
  if (operator === "gt") return String(value) > argument;
  if (operator === "lte") return String(value) <= argument;
  if (operator === "lt") return String(value) < argument;
  if (operator === "is") return argument === "null" ? value == null : String(value) === argument;
  return false;
}

const json = (data: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } });

// A small, clearly marked sample PDF. Its hours and totals come from the same
// approved rows as the real review dialog, including edits made in the sandbox.
export function createDemoInvoicePdf(review: ClientInvoiceReview): Uint8Array {
  const escape = (value: string) => value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "")
    .replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  const lines = ["ChronoSync / invoice preview", "DEMO - FICTIONAL DATA - NOT A TAX INVOICE", "",
    `Client: ${review.client_name}`, `Period: ${review.period_start} to ${review.period_end}`, "",
    ...review.approved_entries.map(entry => `${entry.work_date}    ${entry.description.slice(0, 50)}    ${entry.hours_logged} h`), "",
    `${review.quantity} hours x ${review.net_unit_price.toFixed(2)} ${review.currency}`,
    `Net total: ${review.net_total.toFixed(2)} ${review.currency}`,
    `VAT (${review.vat_code}%): ${review.vat_total.toFixed(2)} ${review.currency}`,
    `Gross total: ${review.gross_total.toFixed(2)} ${review.currency}`, "",
    "Generated locally from the ChronoSync demo. Nothing is issued or sent."];
  const stream = `BT /F1 11 Tf 48 780 Td 19 TL ${lines.map((line, index) => `${index ? "T* " : ""}(${escape(line)}) Tj`).join("\n")} ET`;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let document = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(document.length); document += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = document.length;
  document += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(document);
}

export function createDemoTransport() {
  let tables = initialTables();
  let reviewed = false;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  const sum = (rows: Row[]) => rows.reduce((total, row) => total + Number(row.hours_logged), 0);
  const snapshot = (): DemoSnapshot => ({
    hours: sum(tables.timesheets), draftHours: sum(tables.timesheets.filter(row => ["draft", "rejected"].includes(String(row.status)))),
    submittedHours: sum(tables.timesheets.filter(row => row.status === "submitted")),
    approvedHours: sum(tables.timesheets.filter(row => row.status === "approved")),
    entryCount: tables.timesheets.length, reviewed,
  });
  const join = (table: string, row: Row): Row => {
    if (table === "timesheets") return { ...row, profiles: tables.profiles[0], clients: tables.clients[0], projects: tables.projects[0] };
    if (table === "projects") return { ...row, clients: tables.clients[0] };
    if (table === "user_favorite_projects") return { ...row, project: { ...tables.projects[0], client: tables.clients[0] } };
    return row;
  };

  const invoiceReview = (body: Row): ClientInvoiceReview | null => {
    const rows = tables.timesheets.filter(row => row.status === "approved"
      && row.client_id === body.client_id && String(row.work_date) >= String(body.period_start)
      && String(row.work_date) <= String(body.period_end));
    if (!rows.length) return null;
    const hours = sum(rows);
    const price = Number(tables.project_pricing[0].indexed_fee);
    const profile = tables.client_billing_profiles[0];
    const net = Math.round(hours * price * 100) / 100;
    const vatRate = /^\d+(\.\d+)?$/.test(String(profile.vat_code)) ? Number(profile.vat_code) : 0;
    const vat = Math.round(net * vatRate) / 100;
    return {
      company_id: DEMO_COMPANY_ID, client_id: DEMO_CLIENT_ID, client_code: "ACME", client_name: "Acme Studio",
      period_start: String(body.period_start), period_end: String(body.period_end), issue_date: DEMO_DATE,
      fulfillment_date: String(body.period_end), due_date: "2026-11-08", payment_method: String(profile.payment_method),
      language: "en", billing_model: "project", item_name: "Brand exploration", quantity: hours, unit: "hour",
      net_unit_price: price, vat_code: String(profile.vat_code), currency: "EUR", net_total: net, vat_total: vat, gross_total: net + vat,
      recipient: { name: String(profile.billing_name), country: String(profile.billing_country_code), postal_code: String(profile.billing_postal_code),
        city: String(profile.billing_city), address: String(profile.billing_address), email: String(profile.billing_email), send_email: false,
        tax_subject: 1, tax_number: String(profile.tax_number), eu_tax_number: null, group_tax_number: null },
      approved_entries: rows.map(row => ({ id: String(row.id), work_date: String(row.work_date), hours_logged: Number(row.hours_logged),
        billing_multiplier: Number(row.billing_multiplier ?? 1), description: String(row.description), project_id: DEMO_PROJECT_ID, project_name: "Brand exploration" })),
      project_quantities: { [DEMO_PROJECT_ID]: hours },
      items: [{ project_id: DEMO_PROJECT_ID, project_name: "Brand exploration", is_payroll: false, logged_hours: hours,
        pricing_year: 2026, pricing_updated_at: "2026-10-01T00:00:00Z", quantity: hours, unit: "hour", net_unit_price: price,
        vat_code: String(profile.vat_code), currency: "EUR", net_total: net, vat_total: vat, gross_total: net + vat }],
      review_fingerprint: "local-demo-preview",
    };
  };

  const fetch: typeof globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin !== DEMO_ORIGIN) return json({ detail: "External requests are unavailable in this local demo." }, 403);
    const body = request.method === "GET" || request.method === "HEAD" ? {} : await request.json().catch(() => ({})) as Row;
    if (url.pathname === "/auth/v1/user") return json(demoUser);
    if (url.pathname === "/api/company/invoice-settings") return json({ invoice_provider: "szamlazz_hu", api_key_configured: true });
    if (url.pathname === "/api/invoices/history") return json([]);
    if (["/api/invoices/client-review", "/api/invoices/client-preview"].includes(url.pathname) && request.method === "POST") {
      const review = invoiceReview(body);
      if (!review) return json({ detail: "No approved hours in this period. Submit and approve the entries first." }, 404);
      reviewed = true;
      notify();
      if (url.pathname.endsWith("client-preview")) return new Response(createDemoInvoicePdf(review) as BodyInit, { headers: { "Content-Type": "application/pdf" } });
      return json(review);
    }
    if (url.pathname === "/rest/v1/rpc/ensure_company_project_pricing") return json(null);
    const table = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/)?.[1];
    if (!table || !Object.hasOwn(tables, table)) return json({ detail: "This action is outside the guided demo. Nothing was sent." }, 403);
    const query = url.searchParams;
    const match = (row: Row) => [...query.entries()].every(([key, value]) =>
      ["select", "order", "limit", "offset", "on_conflict"].includes(key) || matches(join(table, row), key, value));
    let rows = tables[table].filter(match);
    if (request.method !== "GET" && request.method !== "HEAD") {
      // Only the same three workflows have mutable fictional data.
      if (!["timesheets", "user_favorite_projects", "client_billing_profiles"].includes(table)) return json({ detail: "This page is read-only in the demo." }, 403);
      if (request.method === "POST") {
        const inputs: Row[] = Array.isArray(body) ? body : [body];
        rows = inputs.map(value => {
          const conflictKeys = (query.get("on_conflict") ?? "id").split(",");
          const existing = tables[table].find(row => conflictKeys.every(key => value[key] !== undefined && value[key] === row[key]));
          if (existing) { Object.assign(existing, value); return existing; }
          const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            ...(table === "timesheets" ? { status: "draft", billing_multiplier: 1 } : {}), ...value };
          tables[table].push(row);
          return row;
        });
      } else if (request.method === "PATCH") rows.forEach(row => Object.assign(row, body));
      else if (request.method === "DELETE") tables[table] = tables[table].filter(row => !rows.includes(row));
      else return json({ detail: "Unsupported demo operation." }, 405);
      reviewed = false;
      notify();
    }
    const orders = (query.get("order") ?? "").split(",").filter(Boolean);
    rows = [...rows].sort((a, b) => {
      for (const order of orders) {
        const [key, direction] = order.split(".");
        const comparison = String(a[key] ?? "").localeCompare(String(b[key] ?? ""), undefined, { numeric: true });
        if (comparison) return direction === "desc" ? -comparison : comparison;
      }
      return 0;
    });
    const total = rows.length;
    const start = Number(query.get("offset") ?? 0);
    rows = rows.slice(start, start + Number(query.get("limit") ?? total));
    const headers = { "Content-Range": `${start}-${Math.max(start, start + rows.length - 1)}/${total}` };
    const single = request.headers.get("Accept")?.includes("application/vnd.pgrst.object+json");
    if (single && rows.length !== 1) return json({ code: "PGRST116", details: `The result contains ${rows.length} rows`, message: "Expected one row" }, 406);
    return json(single ? join(table, rows[0]) : rows.map(row => join(table, row)), 200, headers);
  };
  return { fetch, snapshot, reset: () => { tables = initialTables(); reviewed = false; notify(); },
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; } };
}

export const demoTransport = createDemoTransport();
