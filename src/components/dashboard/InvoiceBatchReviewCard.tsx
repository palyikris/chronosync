import { useId } from "react";
import { ChevronDown, FileSpreadsheet, Info, Mail, MailMinus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ClientInvoiceReview, InvoiceReviewProjectLine } from "../../types/client-billing";

function LineDescription({ line }: { line: InvoiceReviewProjectLine }) {
  return (
    <div className="min-w-0 space-y-1 [overflow-wrap:anywhere]">
      <p className="font-medium text-text">{line.invoice_name || line.project_name}</p>
      {line.invoice_note ? <p className="text-xs font-normal leading-5 text-muted">{line.invoice_note}</p> : null}
      {line.po_number ? <p className="text-xs font-normal text-muted">PO: {line.po_number}</p> : null}
    </div>
  );
}

export function InvoiceBatchReviewCard({ review }: { review: ClientInvoiceReview }) {
  const { t, i18n } = useTranslation();
  const titleId = useId();
  const money = (amount: number, currency = review.currency, unitPrice = false) =>
    new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency,
      ...(unitPrice ? { maximumFractionDigits: 4 } : {}),
    }).format(amount);
  const quantity = (amount: number) =>
    new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 4 }).format(amount);
  const date = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { year: "numeric", month: "short", day: "numeric" })
      .format(new Date(`${value}T12:00:00`));
  const metadata = [
    { label: t("dashboard.invoiceBatchFulfillmentDate"), value: date(review.fulfillment_date) },
    { label: t("dashboard.invoiceBatchDueDate"), value: date(review.due_date) },
    { label: t("clientBilling.paymentMethod"), value: review.payment_method },
    { label: t("clientBilling.invoiceLanguage"), value: review.language.toUpperCase() },
    { label: t("dashboard.invoiceBatchFormat"), value: t(review.e_invoice ? "clientBilling.electronicInvoice" : "clientBilling.paperInvoice") },
    ...(review.invoice_prefix ? [{ label: t("clientBilling.invoicePrefix"), value: review.invoice_prefix }] : []),
  ];
  const DeliveryIcon = review.recipient.send_email ? Mail : MailMinus;

  return (
    <article aria-labelledby={titleId} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="min-w-0 flex-1">
            <span className="inline-flex rounded-md border border-border bg-bg-accent px-2 py-0.5 text-[11px] font-semibold tracking-wide text-muted-strong">
              {review.client_code}
            </span>
            <h4 id={titleId} className="mt-2 text-base font-semibold leading-6 tracking-tight text-text [overflow-wrap:anywhere]">
              {review.client_name}
            </h4>
            {review.recipient.name !== review.client_name ? (
              <p className="mt-1 text-sm text-muted [overflow-wrap:anywhere]">{review.recipient.name}</p>
            ) : null}
            <p className="mt-1 text-xs leading-5 text-muted [overflow-wrap:anywhere]">
              {review.recipient.postal_code} {review.recipient.city}, {review.recipient.address}
              {review.recipient.country ? ` · ${review.recipient.country}` : ""}
            </p>
          </div>
          <div className="shrink-0 border-t border-border pt-3 sm:border-0 sm:pt-0 sm:text-right">
            <p className="text-xs text-muted">{t("clientBilling.reviewGross")}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-text tabular-nums [overflow-wrap:anywhere]">
              {money(review.gross_total)}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium ${review.recipient.send_email ? "bg-info-bg text-info" : "bg-bg-accent text-muted-strong"}`}>
            <DeliveryIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t(review.recipient.send_email ? "dashboard.invoiceBatchEmailOn" : "dashboard.invoiceBatchEmailOff")}
          </span>
          {review.recipient.send_email ? (
            <span className="min-w-0 text-muted [overflow-wrap:anywhere]">{review.recipient.email ?? t("clientBilling.noBillingEmail")}</span>
          ) : null}
          <span className="text-muted">{t("clientBilling.projectLineCount", { count: review.items.length })}</span>
        </div>
      </div>

      <details className="group border-t border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-bg-accent/60 px-4 py-3 text-xs font-medium text-muted-strong transition-colors hover:bg-bg-accent sm:px-5 [&::-webkit-details-marker]:hidden">
          {t("dashboard.invoiceBatchDetails")}
          <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-border">
          <div className="space-y-4 px-4 py-5 sm:px-5">
            <dl className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
              {metadata.map(({ label, value }) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-1 text-sm font-medium text-text [overflow-wrap:anywhere]">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs leading-5 text-muted [overflow-wrap:anywhere]">
              <span>{t("clientBilling.reviewTaxSubject", { value: review.recipient.tax_subject })}</span>
              <span>{t("clientBilling.reviewTaxNumber", { value: review.recipient.tax_number ?? review.recipient.eu_tax_number ?? "—" })}</span>
              {review.recipient.group_tax_number ? <span>{t("clientBilling.reviewGroupTaxNumber", { value: review.recipient.group_tax_number })}</span> : null}
            </div>
            {review.invoice_comment ? <p className="whitespace-pre-line text-xs leading-5 text-muted [overflow-wrap:anywhere]">{review.invoice_comment}</p> : null}
            {review.seller_bank_account ? <p className="text-xs leading-5 text-muted [overflow-wrap:anywhere]">{review.seller_bank_name} · {review.seller_bank_account}</p> : null}
          </div>

          <table className="hidden w-full table-fixed border-y border-border text-left text-xs sm:table">
            <caption className="sr-only">{t("dashboard.invoiceBatchLineItems")}</caption>
            <thead className="bg-bg-accent/70 text-muted">
              <tr>
                <th scope="col" className="w-[36%] py-2.5 pr-3 pl-5 font-medium">{t("clientBilling.reviewProject")}</th>
                <th scope="col" className="w-[14%] px-2 py-2.5 text-right font-medium">{t("clientBilling.reviewQuantity")}</th>
                <th scope="col" className="w-[20%] px-2 py-2.5 text-right font-medium">{t("clientBilling.netUnitPrice")}</th>
                <th scope="col" className="w-[12%] px-2 py-2.5 text-right font-medium">{t("clientBilling.vatCode")}</th>
                <th scope="col" className="w-[18%] py-2.5 pr-5 pl-2 text-right font-medium">{t("clientBilling.reviewGross")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {review.items.map((line) => (
                <tr key={`${line.project_id}-${line.pricing_year}`} className="align-top">
                  <td className="py-4 pr-3 pl-5"><LineDescription line={line} /></td>
                  <td className="px-2 py-4 text-right text-muted-strong tabular-nums [overflow-wrap:anywhere]">{quantity(line.quantity)} {line.unit}</td>
                  <td className="px-2 py-4 text-right text-muted-strong tabular-nums [overflow-wrap:anywhere]">{money(line.net_unit_price, line.currency, true)}</td>
                  <td className="px-2 py-4 text-right text-muted-strong [overflow-wrap:anywhere]">{line.vat_code}</td>
                  <td className="py-4 pr-5 pl-2 text-right font-semibold text-text tabular-nums [overflow-wrap:anywhere]">{money(line.gross_total, line.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-y border-border sm:hidden">
            <h5 className="bg-bg-accent/70 px-4 py-2.5 text-xs font-medium text-muted">{t("dashboard.invoiceBatchLineItems")}</h5>
            <ul className="divide-y divide-border">
              {review.items.map((line) => (
                <li key={`${line.project_id}-${line.pricing_year}`} className="space-y-3 p-4 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <LineDescription line={line} />
                    <span className="max-w-[45%] shrink-0 text-right font-semibold text-text tabular-nums [overflow-wrap:anywhere]">{money(line.gross_total, line.currency)}</span>
                  </div>
                  <dl className="grid grid-cols-3 gap-3 text-xs">
                    {[
                      { label: t("clientBilling.reviewQuantity"), value: `${quantity(line.quantity)} ${line.unit}` },
                      { label: t("clientBilling.netUnitPrice"), value: money(line.net_unit_price, line.currency, true) },
                      { label: t("clientBilling.vatCode"), value: line.vat_code },
                    ].map(({ label, value }) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-muted">{label}</dt>
                        <dd className="mt-1 text-muted-strong tabular-nums [overflow-wrap:anywhere]">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-bg-accent/35 px-4 py-4 sm:px-5">
            <dl className="space-y-2 text-xs sm:ml-auto sm:max-w-64">
              <div className="flex justify-between gap-4 text-muted">
                <dt>{t("clientBilling.reviewNet")}</dt><dd className="text-text tabular-nums">{money(review.net_total)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-muted">
                <dt>{t("clientBilling.reviewVat", { vat: review.vat_code })}</dt><dd className="text-text tabular-nums">{money(review.vat_total)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-2 text-sm font-semibold text-text">
                <dt>{t("clientBilling.reviewGross")}</dt><dd className="tabular-nums">{money(review.gross_total)}</dd>
              </div>
            </dl>
          </div>

          {review.attachment || review.exchange_rate_bank ? (
            <div className="space-y-3 border-t border-border px-4 py-4 sm:px-5">
              {review.attachment ? (
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-primary-strong" aria-hidden="true" />
                  <div className="min-w-0 text-xs leading-5">
                    <p className="font-medium text-text">{t("clientBilling.annex.title")}</p>
                    <p className="text-muted [overflow-wrap:anywhere]">{review.attachment.filename}</p>
                    <p className="text-muted">{t(review.recipient.send_email ? "clientBilling.annex.emailIncluded" : "clientBilling.annex.savedOnly")}</p>
                  </div>
                </div>
              ) : null}
              {review.exchange_rate_bank ? (
                <p className="flex items-start gap-3 text-xs leading-5 text-muted">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {t("clientBilling.exchangeRatePolicy", { bank: review.exchange_rate_bank })}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </details>
    </article>
  );
}
