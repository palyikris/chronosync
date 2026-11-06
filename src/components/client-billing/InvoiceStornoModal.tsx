import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { InvoiceHistoryItem, InvoiceStornoParams } from "../../types/client-billing";
import { Button } from "../shared/Button";
import { Checkbox } from "../shared/Checkbox";
import { Input } from "../shared/Input";
import { Modal } from "../shared/Modal";
import { Select } from "../shared/Select";

export function InvoiceStornoModal({ item, reconcile, busy, onClose, onSubmit }: {
  item: InvoiceHistoryItem;
  reconcile: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (params: InvoiceStornoParams) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const formId = useId();
  const [reason, setReason] = useState(item.reversal?.reason ?? "");
  const [originalNumber, setOriginalNumber] = useState("");
  const [reversalNumber, setReversalNumber] = useState("");
  const [resolution, setResolution] = useState<"reversed" | "not_reversed">("reversed");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsReversalNumber = reconcile && resolution === "reversed";
  return (
    <Modal open title={t(reconcile ? "clientBilling.storno.reconcileTitle" : "clientBilling.storno.title")}
      onClose={() => { if (!busy) onClose(); }} className="sm:max-w-lg">
      <form onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !confirmed || originalNumber.trim() !== item.invoice_number || !reason.trim()
          || (needsReversalNumber && !reversalNumber.trim())) return;
        setError(null);
        try {
          await onSubmit({ companyId: item.company_id, invoiceId: item.id,
            originalInvoiceNumber: originalNumber.trim(), reason: reason.trim(),
            ...(reconcile ? { resolution, ...(needsReversalNumber ? { reversalInvoiceNumber: reversalNumber.trim() } : {}) } : {}),
          });
          onClose();
        } catch (error) {
          setError(error instanceof Error ? error.message : t("clientBilling.storno.failed"));
        }
      }}>
        <div className="space-y-4 p-5">
          <p className="rounded-xl border border-warning/20 bg-warning-bg/60 p-3 text-xs leading-5 text-warning">
            {t(reconcile ? "clientBilling.storno.reconcileDescription" : "clientBilling.storno.description",
              { invoiceNumber: item.invoice_number })}
          </p>
          <p className="text-xs text-muted-strong">{item.client_name} · {item.invoice_number} · {item.period_start} – {item.period_end}</p>
          <Input id={`${formId}-original`} label={t("clientBilling.storno.originalNumber")}
            value={originalNumber} maxLength={100} disabled={busy}
            onChange={(event) => setOriginalNumber(event.target.value)} required />
          <Input id={`${formId}-reason`} label={t("clientBilling.storno.reason")}
            value={reason} maxLength={500} disabled={busy}
            onChange={(event) => setReason(event.target.value)} required />
          {reconcile && item.reversal?.status === "uncertain" ? (
            <Select id={`${formId}-resolution`} label={t("clientBilling.storno.resolution")}
              value={resolution} disabled={busy}
              onChange={(event) => setResolution(event.target.value as typeof resolution)}>
              <option value="reversed">{t("clientBilling.storno.wasReversed")}</option>
              <option value="not_reversed">{t("clientBilling.storno.notReversed")}</option>
            </Select>
          ) : null}
          {needsReversalNumber ? (
            <Input id={`${formId}-reversal`} label={t("clientBilling.storno.reversalNumber")}
              value={reversalNumber} maxLength={100} disabled={busy}
              onChange={(event) => setReversalNumber(event.target.value)} required />
          ) : null}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border p-3">
            <Checkbox checked={confirmed} disabled={busy} className="mt-0.5"
              onChange={(event) => setConfirmed(event.target.checked)} />
            <span className="text-[11.5px] leading-5 text-muted-strong">
              {t(reconcile ? "clientBilling.storno.reconcileConfirmation" : "clientBilling.storno.confirmation")}
            </span>
          </label>
          {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={busy || !confirmed || !reason.trim()
            || originalNumber.trim() !== item.invoice_number || (needsReversalNumber && !reversalNumber.trim())}>
            {t(busy ? "common.loading" : reconcile ? "clientBilling.storno.verify" : "clientBilling.storno.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
