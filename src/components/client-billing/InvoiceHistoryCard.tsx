import React, { useState } from "react";
import { AlertTriangle, Download, FileClock, RefreshCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { InvoiceHistoryItem, InvoiceHistoryScope, InvoiceStornoParams } from "../../types/client-billing";
import { InvoiceStornoModal } from "./InvoiceStornoModal";
import { cn } from "../../utils/cn";
import { Button } from "../shared/Button";
import { Card } from "../shared/Card";
import { Checkbox } from "../shared/Checkbox";
import { Input } from "../shared/Input";
import { Modal } from "../shared/Modal";
import { SegmentedControl } from "../shared/SegmentedControl";

interface InvoiceHistoryCardProps {
  scope: InvoiceHistoryScope;
  onScopeChange: (scope: InvoiceHistoryScope) => void;
  selectedClientName: string | null;
  history: InvoiceHistoryItem[];
  loading: boolean;
  error: boolean;
  downloadingId: string | null;
  downloadingAttachmentId: string | null;
  onDownloadAttachment: (item: InvoiceHistoryItem) => void;
  reconciling: boolean;
  reversing: boolean;
  canReverse: boolean;
  onStorno: (params: InvoiceStornoParams) => Promise<unknown>;
  onDownloadStorno: (item: InvoiceHistoryItem) => void;
  onDownload: (item: InvoiceHistoryItem) => void;
  onResolveNotIssued: (item: InvoiceHistoryItem) => void;
  onResolveIssued: (
    item: InvoiceHistoryItem,
    invoiceNumber: string,
    netTotal: number,
    grossTotal: number,
  ) => Promise<unknown>;
}

const statusClasses: Record<InvoiceHistoryItem["status"], string> = {
  issued: "border-success/20 bg-success-bg text-success",
  failed: "border-danger/20 bg-danger-bg text-danger",
  uncertain: "border-warning/25 bg-warning-bg text-warning",
  issuing: "border-primary-strong/15 bg-primary/10 text-primary-strong",
  reversed: "border-muted/20 bg-bg-accent text-muted-strong",
};

const money = (value: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "HUF" ? 0 : 2,
  }).format(value);

export const InvoiceHistoryCard: React.FC<InvoiceHistoryCardProps> = ({
  scope,
  onScopeChange,
  selectedClientName,
  history,
  loading,
  error,
  downloadingId,
  downloadingAttachmentId,
  onDownloadAttachment,
  reconciling,
  reversing,
  canReverse,
  onStorno,
  onDownloadStorno,
  onDownload,
  onResolveNotIssued,
  onResolveIssued,
}) => {
  const { t } = useTranslation();
  const formId = React.useId();
  const [reconcileTarget, setReconcileTarget] = useState<InvoiceHistoryItem | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [netTotal, setNetTotal] = useState("");
  const [grossTotal, setGrossTotal] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [stornoTarget, setStornoTarget] = useState<{ item: InvoiceHistoryItem; reconcile: boolean } | null>(null);

  const openReconciliation = (item: InvoiceHistoryItem) => {
    setReconcileTarget(item);
    setInvoiceNumber("");
    setNetTotal(String(item.net_total));
    setGrossTotal(String(item.gross_total));
    setConfirmed(false);
    setReconcileError(null);
  };

  const closeReconciliation = () => {
    if (!reconciling) setReconcileTarget(null);
  };

  return (
    <>
      <Card>
        <div className="flex flex-col gap-3 border-b border-primary-strong/20 bg-primary/15 px-4.5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-text">
              <FileClock className="h-4 w-4 text-primary-strong" />
              {t("clientBilling.historyTitle")}
            </h2>
            <p className="mt-1 text-[11.5px] text-muted">
              {t(scope === "global" ? "clientBilling.historyDescription"
                : selectedClientName ? "clientBilling.historyClientDescription" : "clientBilling.historySelectClient",
              { clientName: selectedClientName })}
            </p>
          </div>
          <SegmentedControl
            value={scope}
            onChange={onScopeChange}
            ariaLabel={t("clientBilling.historyView")}
            density="compact"
            className="shrink-0"
            options={[
              { value: "client", label: t("clientBilling.historyClientView") },
              { value: "global", label: t("clientBilling.historyGlobalView") },
            ]}
          />
        </div>
        {loading ? (
          <div className="p-6 text-center text-xs text-muted">{t("common.loading")}</div>
        ) : error ? (
          <div className="p-5 text-xs text-danger">{t("clientBilling.historyLoadFailed")}</div>
        ) : history.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted">
            {t(scope === "global" ? "clientBilling.historyEmpty"
              : selectedClientName ? "clientBilling.historyClientEmpty" : "clientBilling.historySelectClient")}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {history.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 px-4.5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[12.5px] font-semibold text-text">
                      {item.client_name}
                    </p>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[9.5px] font-medium", statusClasses[item.status])}>
                      {t(`clientBilling.invoiceStatus.${item.status}`)}
                    </span>
                    {item.invoice_number ? (
                      <span className="text-[10.5px] font-medium text-muted-strong">{item.invoice_number}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[10.5px] text-muted">
                    {item.period_start} – {item.period_end} · {money(item.gross_total, item.currency)}
                  </p>
                  {item.provider_error_message ? (
                    <p className="mt-1 max-w-2xl text-[10.5px] leading-4 text-warning">
                      {item.provider_error_message}
                    </p>
                  ) : null}
                  {item.reversal ? (
                    <div className="mt-1 space-y-1 text-[10.5px] leading-4 text-muted-strong">
                      <p>{t(`clientBilling.storno.status.${item.reversal.status}`)}
                        {item.reversal.invoice_number ? ` · ${item.reversal.invoice_number}` : ""}
                        {item.reversal.gross_total !== null ? ` · ${money(item.reversal.gross_total, item.currency)}` : ""}
                      </p>
                      <p>{item.reversal.reason}</p>
                      {item.reversal.error_message ? <p className="text-warning">{item.reversal.error_message}</p> : null}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {item.attachment_available && item.attachment ? (
                    <Button variant="outline" size="sm" icon={<Download />}
                      disabled={downloadingAttachmentId === item.id} onClick={() => onDownloadAttachment(item)}>
                      {t("clientBilling.annex.downloadSaved")}
                    </Button>
                  ) : null}
                  {item.status === "issued" || item.status === "reversed" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Download />}
                      disabled={downloadingId === item.id}
                      onClick={() => onDownload(item)}
                    >
                      {t(item.pdf_available ? "clientBilling.downloadInvoicePdf" : "clientBilling.recoverInvoicePdf")}
                    </Button>
                  ) : null}
                  {item.status === "reversed" && item.reversal?.pdf_available ? (
                    <Button variant="outline" size="sm" icon={<Download />}
                      disabled={downloadingId === item.id} onClick={() => onDownloadStorno(item)}>
                      {t("clientBilling.storno.download")}
                    </Button>
                  ) : null}
                  {item.status === "issued" && item.invoice_number ? (
                    <>
                      {(!item.reversal || item.reversal.status === "failed") ? (
                        <Button variant="outline" size="sm" disabled={reversing || !canReverse}
                          title={!canReverse ? t("clientBilling.storno.previewBlocked") : undefined}
                          onClick={() => setStornoTarget({ item, reconcile: false })}>
                          {t("clientBilling.storno.action")}
                        </Button>
                      ) : null}
                      {item.reversal?.status !== "reversing" ? (
                        <Button variant="outline" size="sm" disabled={reversing}
                          onClick={() => setStornoTarget({ item, reconcile: true })}>
                          {t("clientBilling.storno.recordExisting")}
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                  {item.status === "uncertain" ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reconciling}
                        onClick={() => onResolveNotIssued(item)}
                      >
                        {t("clientBilling.resolveNotIssued")}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<RefreshCcw />}
                        disabled={reconciling}
                        onClick={() => openReconciliation(item)}
                      >
                        {t("clientBilling.resolveIssued")}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {stornoTarget ? (
        <InvoiceStornoModal key={`${stornoTarget.item.id}-${stornoTarget.reconcile}`}
          item={stornoTarget.item} reconcile={stornoTarget.reconcile} busy={reversing}
          onClose={() => setStornoTarget(null)} onSubmit={onStorno} />
      ) : null}

      <Modal
        open={Boolean(reconcileTarget)}
        title={t("clientBilling.reconcileTitle")}
        onClose={closeReconciliation}
        className="sm:max-w-lg"
      >
        {reconcileTarget ? (
          <>
            <div className="space-y-4 p-5">
              <div className="flex items-start gap-2.5 rounded-xl border border-warning/20 bg-warning-bg/60 p-3 text-[11.5px] leading-5 text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {t("clientBilling.reconcileWarning", {
                  externalId: reconcileTarget.external_id,
                })}
              </div>
              <Input
                id={`${formId}-number`}
                disabled={reconciling}
                label={t("clientBilling.reconcileInvoiceNumber")}
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
              />
              {reconcileError ? (
                <p role="alert" className="text-xs text-danger">{reconcileError}</p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id={`${formId}-net`}
                  disabled={reconciling}
                  type="number"
                  step="0.01"
                  label={t("clientBilling.reviewNet")}
                  value={netTotal}
                  onChange={(event) => setNetTotal(event.target.value)}
                />
                <Input
                  id={`${formId}-gross`}
                  disabled={reconciling}
                  type="number"
                  step="0.01"
                  label={t("clientBilling.reviewGross")}
                  value={grossTotal}
                  onChange={(event) => setGrossTotal(event.target.value)}
                />
              </div>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border p-3">
                <Checkbox
                  checked={confirmed}
                  disabled={reconciling}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-[11.5px] leading-5 text-muted-strong">
                  {t("clientBilling.reconcileConfirmation")}
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-border bg-bg-accent/35 px-5 py-3.5">
              <Button variant="outline" disabled={reconciling} onClick={closeReconciliation}>
                {t("common.cancel")}
              </Button>
              <Button
                disabled={
                  reconciling ||
                  !confirmed ||
                  !invoiceNumber.trim() ||
                  !netTotal.trim() || !grossTotal.trim() ||
                  !Number.isFinite(Number(netTotal)) ||
                  !Number.isFinite(Number(grossTotal))
                }
                onClick={async () => {
                  try {
                    await onResolveIssued(
                      reconcileTarget, invoiceNumber.trim(), Number(netTotal), Number(grossTotal),
                    );
                    setReconcileTarget(null);
                  } catch (error) {
                    setReconcileError(error instanceof Error ? error.message : t("clientBilling.reconciliationFailed"));
                  }
                }}
              >
                {t("clientBilling.confirmReconciliation")}
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </>
  );
};
