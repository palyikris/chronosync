import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { InvoiceBatchResult, InvoiceBatchReviewItem } from "../../types/client-billing";
import { Button } from "../shared/Button";
import { Checkbox } from "../shared/Checkbox";
import { Modal } from "../shared/Modal";
import { InvoiceBatchReviewCard } from "./InvoiceBatchReviewCard";

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
  const { t } = useTranslation();
  const [confirmed, setConfirmed] = useState(false);
  const eligible = items.flatMap((item) => item.review ? [item.review] : []);
  const skipped = items.filter((item) => !item.review);
  const close = () => { if (!generating) onClose(); };

  return (
    <Modal open title={t(results === null ? "dashboard.invoiceBatchReviewTitle" : "dashboard.invoiceBatchResultsTitle")}
      onClose={close} className="max-w-4xl" footer={
        <div className="space-y-4">
          {results === null ? (
            <label className="flex items-start gap-3 text-xs leading-5 text-muted-strong">
              <Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={generating} className="mt-0.5 shrink-0" />
              <span>{t(eligible.length > 0 ? "dashboard.invoiceBatchConfirm" : "dashboard.invoiceBatchConfirmAttachmentsOnly")}</span>
            </label>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button variant="outline" onClick={close} disabled={generating}>{t(results === null ? "common.cancel" : "common.close")}</Button>
            {results === null ? <Button onClick={onConfirm} disabled={!confirmed || generating} className="py-2 leading-5 [&>span]:justify-center [&>span]:whitespace-normal">
              {t(generating ? "common.loading" : eligible.length > 0 ? "dashboard.invoiceBatchGenerate" : "dashboard.generateInvoiceAttachments")}
            </Button> : null}
          </div>
        </div>
      }>
      <div className="space-y-5 p-4 sm:p-6">
        <p className="text-sm text-muted">{startDate} – {endDate}</p>
        {results === null ? (
          <>
            <p className="text-xs leading-5 text-muted">{t("dashboard.invoiceBatchReviewHint")}</p>
            <section aria-label={t("dashboard.invoiceBatchEligible", { count: eligible.length })}>
              <h3 className="mb-3 text-sm font-semibold text-text">{t("dashboard.invoiceBatchEligible", { count: eligible.length })}</h3>
              <div className="space-y-4">
                {eligible.map((review) => (
                  <InvoiceBatchReviewCard key={review.client_id} review={review} />
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
      </div>
    </Modal>
  );
}
