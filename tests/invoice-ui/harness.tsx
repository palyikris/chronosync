import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import i18n from "../../src/lib/i18n";
import { InvoiceReviewModal } from "../../src/components/client-billing/InvoiceReviewModal";
import { InvoiceHistoryCard } from "../../src/components/client-billing/InvoiceHistoryCard";
import type { ClientInvoiceReview, InvoiceHistoryItem } from "../../src/types/client-billing";

void i18n.changeLanguage("en");
const review: ClientInvoiceReview = {
  company_id: "company", client_id: "client", client_code: "TEST", client_name: "Test client",
  period_start: "2026-09-01", period_end: "2026-09-30", issue_date: "2026-10-26",
  fulfillment_date: "2026-09-30", due_date: "2026-11-03", payment_method: "Átutalás",
  language: "en", billing_model: "project", item_name: "Development services",
  quantity: 1, unit: "számla", net_unit_price: 250, vat_code: "27", currency: "EUR",
  exchange_rate_bank: "MNB", net_total: 250, vat_total: 67.5, gross_total: 317.5,
  recipient: {name: "Test & Partners GmbH", country: "DE", postal_code: "10115", city: "Berlin",
    address: "Teststraße 1", email: "test@example.invalid", send_email: true, tax_subject: 6,
    tax_number: null, eu_tax_number: "DE123456789", group_tax_number: null},
  project_quantities: {},
  items: [{project_id: "project", project_name: "Project", pricing_year: 2026,
    pricing_updated_at: "2026-10-26T00:00:00Z", quantity: 2.5, unit: "hour", net_unit_price: 100,
    vat_code: "27", currency: "EUR", net_total: 250, vat_total: 67.5, gross_total: 317.5}],
  approved_entries: [{id: "entry", project_id: "project", work_date: "2026-09-15", hours_logged: 2.5,
    description: "Development and testing", project_name: "Project"}], review_fingerprint: "a".repeat(64),
};
const history: InvoiceHistoryItem = {
  id: "invoice", company_id: "company", client_id: "client", client_name: "Test client",
  period_start: review.period_start, period_end: review.period_end, status: "uncertain", provider: "szamlazz_hu",
  external_id: "chronosync-test-invoice", recipient_name: review.recipient.name, recipient_email: review.recipient.email,
  send_email: true, quantity: 2.5, unit: "hour", net_unit_price: 100, vat_code: "27", currency: "EUR",
  net_total: 250, vat_total: 67.5, gross_total: 317.5, invoice_number: null, pdf_available: false,
  provider_error_code: "timeout", provider_error_message: "Check the external id before retrying.", attempt_count: 1,
  issued_at: null, created_at: "2026-10-26T08:00:00Z", updated_at: "2026-10-26T08:00:00Z",
};
const pause = () => new Promise((resolve) => setTimeout(resolve, 250));
export function Harness() {
  const mode = new URLSearchParams(window.location.search).get("mode");
  const selectedReview: ClientInvoiceReview = mode === "payroll" ? {
    ...review, net_total: 1250, vat_total: 337.5, gross_total: 1587.5,
    items: [{...review.items[0], is_payroll: true, logged_hours: 2.5,
      quantity: 12.5, net_total: 1250, vat_total: 337.5, gross_total: 1587.5}],
    approved_entries: [3, 7].map((billing_multiplier, index) => ({...review.approved_entries[0],
      id: `entry-${index}`, hours_logged: 1.25, billing_multiplier})),
  } : review;
  const [open, setOpen] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState([history]);
  const [issuedCalls, setIssuedCalls] = useState(0);
  const reconcileCalls = useRef(0);
  return <main className="p-5">
    <output data-testid="issue-count">{issuedCalls}</output>
    {mode === "history" ? <InvoiceHistoryCard history={items} loading={false} error={false} downloadingId={null}
      reconciling={pending} onDownload={() => undefined} onResolveNotIssued={() => undefined}
      onResolveIssued={async () => {
        setPending(true);
        await pause();
        setPending(false);
        if (reconcileCalls.current++ === 0) throw new Error("Provider totals do not match");
        setItems([{...history, status: "issued", invoice_number: "TEST-1"}]);
      }} /> : <InvoiceReviewModal key={selectedReview.review_fingerprint} open={open} review={selectedReview} issuing={pending}
      canIssue={mode !== "preview"} error={error} onClose={() => setOpen(false)}
      onIssue={() => {
        setIssuedCalls((calls) => calls + 1);
        setPending(true);
        void pause().then(() => { setPending(false); setError("Uncertain outcome. Reconcile from invoice history."); });
      }} />}
  </main>;
}
createRoot(document.getElementById("root")!).render(<Harness />);
