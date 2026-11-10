import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, ReceiptText, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ClientInvoiceReview, InvoiceDateOverrides } from "../../types/client-billing";
import { Button } from "../shared/Button";
import { Checkbox } from "../shared/Checkbox";
import { Modal } from "../shared/Modal";
import { InvoiceDateFields } from "./InvoiceDateFields";

interface InvoiceReviewModalProps {
  open: boolean;
  review: ClientInvoiceReview | null;
  issuing: boolean;
  canIssue: boolean;
  error: string | null;
  onClose: () => void;
  onIssue: () => void;
  attachmentDownloading?: boolean;
  attachmentError?: string | null;
  onDownloadAttachment?: () => void;
  reviewing?: boolean;
  onReviewDates?: (overrides: InvoiceDateOverrides) => Promise<void>;
  onDownloadPreview?: () => void;
  previewDownloading?: boolean;
}

const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "HUF" ? 0 : 2,
  }).format(value);

export const InvoiceReviewModal: React.FC<InvoiceReviewModalProps> = ({
  open,
  review,
  issuing,
  canIssue,
  error,
  onClose,
  onIssue,
  attachmentDownloading = false,
  attachmentError = null,
  onDownloadAttachment,
  reviewing = false,
  onReviewDates,
  onDownloadPreview,
  previewDownloading = false,
}) => {
  const { t } = useTranslation();
  const [confirmed, setConfirmed] = useState(false);
  const [dueDate, setDueDate] = useState(review?.due_date ?? "");
  const [fulfillmentDate, setFulfillmentDate] = useState(review?.fulfillment_date ?? "");

  if (!review) return null;
  const items = review.items ?? [];
  const dateDirty = dueDate !== review.due_date || fulfillmentDate !== review.fulfillment_date;
  const busy = issuing || reviewing;
  const hasOverrides = Boolean(review.date_overrides?.due_date || review.date_overrides?.fulfillment_date);
  const datesValid = Boolean(dueDate && fulfillmentDate && dueDate >= review.issue_date);
  const refreshDates = (overrides: InvoiceDateOverrides) => {
    setConfirmed(false);
    void onReviewDates?.(overrides);
  };

  const handleClose = () => {
    setConfirmed(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={t("clientBilling.reviewModalTitle")}
      onClose={busy ? () => undefined : handleClose}
      closeDisabled={busy}
      className="sm:max-w-3xl"
    >
      <div className="overflow-y-auto p-5">
        <div className="flex flex-col gap-3 rounded-xl border border-primary-strong/15 bg-primary/[0.045] p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-primary-strong">
              {t("clientBilling.reviewRecipient")}
            </p>
            <h3 className="mt-1 text-sm font-semibold text-text">
              {review.recipient.name}
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              {review.recipient.postal_code} {review.recipient.city},{" "}
              {review.recipient.address}
              {review.recipient.country ? ` · ${review.recipient.country}` : ""}
            </p>
            <p className="text-xs text-muted">
              {review.recipient.email ?? t("clientBilling.noBillingEmail")}
            </p>
            <p className="mt-1 text-[10.5px] text-muted">
              {t("clientBilling.reviewTaxSubject", {
                value: review.recipient.tax_subject,
              })}
              {review.recipient.tax_number || review.recipient.eu_tax_number
                ? ` · ${t("clientBilling.reviewTaxNumber", {
                    value:
                      review.recipient.tax_number ??
                      review.recipient.eu_tax_number,
                  })}`
                : ""}
              {review.recipient.group_tax_number
                ? ` · ${t("clientBilling.reviewGroupTaxNumber", {
                    value: review.recipient.group_tax_number,
                  })}`
                : ""}
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-white/60 px-2.5 py-1 text-[10.5px] font-medium text-muted-strong">
            <ShieldCheck className="h-3.5 w-3.5" />
            {review.recipient.send_email
              ? t("clientBilling.reviewEmailEnabled")
              : t("clientBilling.reviewEmailDisabled")}
          </span>
        </div>

        {review.attachment ? (
          <div className="mt-3 rounded-xl border border-border p-3 text-xs text-muted-strong">
            <p className="font-medium text-text">{t("clientBilling.annex.title")}</p>
            <p className="mt-1 break-all">{review.attachment.filename} · {Math.ceil(review.attachment.size_bytes / 1024)} KB</p>
            <p className="mt-1">{t(review.recipient.send_email ? "clientBilling.annex.emailIncluded" : "clientBilling.annex.savedOnly")}</p>
            {onDownloadAttachment ? (
              <Button className="mt-2" size="sm" variant="outline" disabled={busy || dateDirty || attachmentDownloading}
                onClick={onDownloadAttachment}>
                {t(attachmentDownloading ? "common.loading" : "clientBilling.annex.downloadReview")}
              </Button>
            ) : null}
            {attachmentError ? <p role="alert" className="mt-2 text-danger">{attachmentError}</p> : null}
          </div>
        ) : null}

        <div className="mt-3 rounded-xl border border-border bg-white/35 px-3.5 py-3 text-[11px] leading-5 text-muted">
          <span className="font-semibold text-text">{review.item_name}</span>
          {" · "}
          {t("clientBilling.reviewFulfillment", {
            date: review.fulfillment_date,
          })}
          {" · "}
          {t("clientBilling.reviewDue", { date: review.due_date })}
          {" · "}
          {review.payment_method} · {review.language.toUpperCase()}
          {" · "}{t(review.e_invoice ? "clientBilling.electronicInvoice" : "clientBilling.paperInvoice")}
          {review.invoice_prefix && ` · ${review.invoice_prefix}`}
        </div>
        {(review.invoice_comment || review.seller_bank_account) && <div className="mt-3 text-xs leading-5 text-muted">
          {review.invoice_comment && <p className="whitespace-pre-wrap break-words">{review.invoice_comment}</p>}
          {review.seller_bank_account && <p>{review.seller_bank_name} · {review.seller_bank_account}</p>}
        </div>}

        {onReviewDates && <details className="mt-3 rounded-xl border border-border bg-bg-accent/25 p-3.5">
          <summary className="cursor-pointer text-xs font-semibold text-text">{t("clientBilling.terms.adjustDates")}</summary>
          <p className="mt-2 text-xs leading-5 text-muted">{t("clientBilling.terms.overrideHelp")}</p>
          <div className="mt-3">
            <InvoiceDateFields fulfillmentDate={fulfillmentDate} dueDate={dueDate} issueDate={review.issue_date}
              disabled={busy} required onDueChange={value => { setDueDate(value); setConfirmed(false); }}
              onFulfillmentChange={value => { setFulfillmentDate(value); setConfirmed(false); }} />
          </div>
          {hasOverrides && <p className="mt-2 text-xs text-muted-strong">{t("clientBilling.terms.customDates")}</p>}
          {dateDirty && <p role="status" className="mt-2 text-xs text-muted-strong">{t("clientBilling.terms.reviewRequired")}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!dateDirty || !datesValid || busy}
              onClick={() => refreshDates({
                due_date: dueDate !== review.due_date ? dueDate : review.date_overrides?.due_date,
                fulfillment_date: fulfillmentDate !== review.fulfillment_date ? fulfillmentDate : review.date_overrides?.fulfillment_date,
              })}>{t(reviewing ? "common.loading" : "clientBilling.terms.applyDates")}</Button>
            {dateDirty && <Button size="sm" variant="ghost" disabled={busy} onClick={() => {
              setDueDate(review.due_date); setFulfillmentDate(review.fulfillment_date); setConfirmed(false);
            }}>{t("clientBilling.terms.discardDates")}</Button>}
            {hasOverrides && <Button size="sm" variant="ghost" disabled={busy}
              onClick={() => refreshDates({})}>{t("clientBilling.terms.resetDates")}</Button>}
          </div>
        </details>}

        {review.exchange_rate_bank ? (
          <p className="mt-3 text-xs text-muted">
            {t("clientBilling.exchangeRatePolicy", { bank: review.exchange_rate_bank })}
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {[
            {
              label: t("clientBilling.reviewQuantity"),
              value: t("clientBilling.projectLineCount", { count: items.length }),
            },
            {
              label: t("clientBilling.reviewNet"),
              value: formatMoney(review.net_total, review.currency),
            },
            {
              label: t("clientBilling.reviewVat", { vat: review.vat_code }),
              value: formatMoney(review.vat_total, review.currency),
            },
            {
              label: t("clientBilling.reviewGross"),
              value: formatMoney(review.gross_total, review.currency),
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-bg-accent/35 p-3">
              <p className="text-[10.5px] font-medium text-muted">{item.label}</p>
              <p className="mt-1 text-[13px] font-semibold text-text">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-accent/45 text-muted"><tr>
              {["reviewProject", "reviewQuantity", "netUnitPrice", "reviewNet"].map(key =>
                <th key={key} className="px-3 py-2 font-medium">{t(`clientBilling.${key}`)}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-border">{items.map(item => <tr key={`${item.project_id}-${item.pricing_year}`}>
              <td className="px-3 py-2 font-medium">
                {item.invoice_name || item.project_name}
                {item.invoice_note && <span className="mt-1 block text-xs text-muted">{item.invoice_note}</span>}
                {item.po_number && <span className="mt-1 block text-xs text-muted">PO: {item.po_number}</span>}
                {item.is_payroll && <span className="mt-1 block text-xs text-primary-strong">
                  {t("companySettings.payrollProject")}
                </span>}
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                {item.quantity} {item.unit}
                {(item.is_payroll || Number(item.quantity) !== Number(item.logged_hours)) && item.logged_hours != null &&
                  <span className="mt-1 block text-xs text-muted-strong">
                    {t("companySettings.payrollEntryCalculation", { hours: item.logged_hours })}
                  </span>}
              </td>
              <td className="whitespace-nowrap px-3 py-2">{new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(item.net_unit_price)} {item.currency}</td>
              <td className="whitespace-nowrap px-3 py-2">{formatMoney(item.net_total, item.currency)}</td>
            </tr>)}</tbody>
          </table>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between bg-bg-accent/45 px-3.5 py-2.5">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-text">
              <ReceiptText className="h-4 w-4 text-primary-strong" />
              {t("clientBilling.reviewEntries")}
            </p>
            <span className="text-[10.5px] text-muted">
              {t("clientBilling.reviewEntryCount", {
                count: review.approved_entries.length,
              })}
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {review.approved_entries.length > 0 ? (
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-surface-strong text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("clientBilling.reviewDate")}</th>
                    <th className="px-3 py-2 font-medium">{t("clientBilling.reviewProject")}</th>
                    <th className="px-3 py-2 font-medium">{t("clientBilling.reviewDescription")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("clientBilling.reviewHours")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {review.approved_entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-strong">{entry.work_date}</td>
                      <td className="px-3 py-2 text-text">{entry.project_name}</td>
                      <td className="max-w-64 truncate px-3 py-2 text-muted" title={entry.description}>
                        {entry.description}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-text">
                        {entry.hours_logged}
                        {(entry.billing_multiplier ?? 1) !== 1 ? ` × ${entry.billing_multiplier}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-4 py-6 text-center text-xs text-muted">
                {t("clientBilling.reviewNoEntries")}
              </p>
            )}
          </div>
        </div>

        {!canIssue ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/20 bg-warning-bg/60 p-3 text-xs leading-5 text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {t("clientBilling.liveModeRequired")}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-bg p-3 text-xs leading-5 text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-border p-3.5">
          <Checkbox
            checked={confirmed}
            disabled={!canIssue || busy || dateDirty}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="block text-[12px] font-semibold text-text">
              {t("clientBilling.confirmIssueTitle")}
            </span>
            <span className="mt-0.5 block text-[11px] leading-5 text-muted">
              {t("clientBilling.confirmIssueDescription")}
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-bg-accent/35 px-5 py-3.5">
        {onDownloadPreview && <Button variant="outline" disabled={busy || dateDirty || previewDownloading}
          onClick={onDownloadPreview}>{t(previewDownloading ? "common.loading" : "clientBilling.generatePreview")}</Button>}
        <Button variant="outline" onClick={handleClose} disabled={busy}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="primary"
          icon={issuing ? undefined : <CheckCircle2 />}
          disabled={!canIssue || !confirmed || busy || dateDirty}
          onClick={() => {
            setConfirmed(false);
            onIssue();
          }}
        >
          {issuing
            ? t("clientBilling.issuingInvoice")
            : t("clientBilling.issueInvoice")}
        </Button>
      </div>
    </Modal>
  );
};
