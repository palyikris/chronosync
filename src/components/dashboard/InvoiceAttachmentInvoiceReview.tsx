import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { InvoiceBatchResult, InvoiceBatchReviewItem } from "../../types/client-billing";
import { Button } from "../shared/Button";
import { Checkbox } from "../shared/Checkbox";
import { Modal } from "../shared/Modal";

interface Props {
  items: InvoiceBatchReviewItem[];
  clientNames: Record<string, string>;
  startDate: string;
  endDate: string;
  generating: boolean;
  results: InvoiceBatchResult[] | null;
  timesheetExportMissing?: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function InvoiceAttachmentInvoiceReview({
  items, clientNames, startDate, endDate, generating, results, timesheetExportMissing = false, error, onConfirm, onClose,
}: Props) {
  const { t, i18n } = useTranslation();
  const [confirmed, setConfirmed] = useState(false);
  const eligible = items.flatMap((item) => item.review ? [item.review] : []);
  const skipped = items.filter((item) => !item.review);
  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat(i18n.language, { style: "currency", currency }).format(amount);
  const close = () => { if (!generating) onClose(); };

  return (
    <Modal open title={t(results === null ? "dashboard.invoiceBatchReviewTitle" : "dashboard.invoiceBatchResultsTitle")}
      onClose={close} className="max-w-4xl">
      <div className="space-y-5 p-4 sm:p-6">
        <p className="text-sm text-muted">{startDate} – {endDate}</p>
        {results === null ? (
          <>
            <p className="text-sm text-text">{t("dashboard.invoiceBatchReviewHint")}</p>
            <section aria-label={t("dashboard.invoiceBatchEligible", { count: eligible.length })}>
              <h3 className="mb-3 font-semibold text-text">{t("dashboard.invoiceBatchEligible", { count: eligible.length })}</h3>
              <div className="space-y-3">
                {eligible.map((review) => (
                  <div key={review.client_id} className="rounded-2xl border border-border-strong bg-surface p-4 text-sm">
                    <div className="flex flex-wrap justify-between gap-2 font-semibold text-text">
                      <span>{review.client_name} · {review.client_code}</span>
                      <span>{t("clientBilling.reviewGross")}: {money(review.gross_total, review.currency)}</span>
                    </div>
                    <p className="mt-2 text-muted">{review.recipient.name} · {review.recipient.postal_code} {review.recipient.city}, {review.recipient.address} · {review.recipient.country}</p>
                    <p className="mt-1 text-muted">{review.recipient.send_email
                      ? `${t("clientBilling.reviewEmailEnabled")} · ${review.recipient.email}`
                      : t("clientBilling.reviewEmailDisabled")}</p>
                    <details className="mt-3">
                      <summary className="cursor-pointer font-medium text-primary-strong">{t("dashboard.invoiceBatchDetails")}</summary>
                      <div className="mt-2 space-y-2 text-muted">
                        <p>{t("clientBilling.reviewFulfillment", { date: review.fulfillment_date })} · {t("clientBilling.reviewDue", { date: review.due_date })} · {review.payment_method} · {review.language.toUpperCase()}</p>
                        <p>{t(review.e_invoice ? "clientBilling.electronicInvoice" : "clientBilling.paperInvoice")}{review.invoice_prefix ? ` · ${review.invoice_prefix}` : ""}</p>
                        {review.invoice_comment && <p>{review.invoice_comment}</p>}
                        {review.attachment && <p className="break-all">{t("clientBilling.annex.title")}: {review.attachment.filename} · {t(review.recipient.send_email ? "clientBilling.annex.emailIncluded" : "clientBilling.annex.savedOnly")}</p>}
                        {review.seller_bank_account && <p>{review.seller_bank_name} · {review.seller_bank_account}</p>}
                        <p>{t("clientBilling.reviewTaxSubject", { value: review.recipient.tax_subject })} · {review.recipient.tax_number ?? review.recipient.eu_tax_number ?? "—"}{review.recipient.group_tax_number ? ` · ${review.recipient.group_tax_number}` : ""}</p>
                        {review.items.map((line) => (
                          <div key={line.project_id}>
                            <p>{line.invoice_name || line.project_name}: {line.quantity} {line.unit} × {money(line.net_unit_price, line.currency)} · {t("clientBilling.reviewVat", { vat: line.vat_code })} · {money(line.gross_total, line.currency)}</p>
                            {line.invoice_note && <p>{line.invoice_note}</p>}
                            {line.po_number && <p>PO: {line.po_number}</p>}
                          </div>
                        ))}
                        <p>{t("clientBilling.reviewNet")}: {money(review.net_total, review.currency)} · {t("clientBilling.reviewVat", { vat: review.vat_code })}: {money(review.vat_total, review.currency)}</p>
                        {review.exchange_rate_bank ? <p>{t("clientBilling.exchangeRatePolicy", { bank: review.exchange_rate_bank })}</p> : null}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section aria-live="polite" className="space-y-3">
            <p className="text-sm text-muted">{t(timesheetExportMissing
              ? "dashboard.invoiceBatchNoTimesheetExport" : "dashboard.invoiceBatchAttachmentsDownloaded")}</p>
            <p className="text-sm text-text">{t(generating ? "dashboard.invoiceBatchProgress" : "dashboard.invoiceBatchFinished", { count: results.length, total: eligible.length })}</p>
            {results.map((result) => (
              <div key={result.clientId} className={`rounded-2xl border p-4 text-sm ${result.error ? "border-red-200 bg-red-50 text-red-800" : "border-border-strong bg-surface text-text"}`}>
                <p className="font-semibold">{clientNames[result.clientId]} · {result.error ? t("dashboard.invoiceBatchFailed") : result.invoiceNumber}</p>
                {result.error ? <p className="mt-1">{result.error}</p> : null}
              </div>
            ))}
            {results.some((result) => result.error) ? <p className="text-sm text-muted">{t("dashboard.invoiceBatchCheckHistory")}</p> : null}
          </section>
        )}
        {skipped.length > 0 ? (
          <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <h3 className="font-semibold">{t("dashboard.invoiceBatchSkipped", { count: skipped.length })}</h3>
            <p className="mt-1">{t("dashboard.invoiceBatchSkippedHint")}</p>
            <ul className="mt-3 space-y-2">
              {skipped.map((item) => <li key={item.client_id}><strong>{clientNames[item.client_id]}</strong>: {item.reason}</li>)}
            </ul>
          </section>
        ) : null}
        {error ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
        {results === null ? (
          <label className="flex items-start gap-3 rounded-2xl border border-border-strong p-4 text-sm text-text">
            <Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={generating} className="mt-0.5" />
            <span>{t(eligible.length > 0 ? "dashboard.invoiceBatchConfirm" : "dashboard.invoiceBatchConfirmAttachmentsOnly")}</span>
          </label>
        ) : null}
        <div className="flex flex-wrap justify-end gap-3 border-t border-border-strong pt-4">
          <Button variant="outline" onClick={close} disabled={generating}>{t(results === null ? "common.cancel" : "common.close")}</Button>
          {results === null ? <Button onClick={onConfirm} disabled={!confirmed || generating}>
            {t(generating ? "common.loading" : eligible.length > 0 ? "dashboard.invoiceBatchGenerate" : "dashboard.generateInvoiceAttachments")}
          </Button> : null}
        </div>
      </div>
    </Modal>
  );
}
