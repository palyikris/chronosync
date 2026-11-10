import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { ClientBillingProfileUpsert } from "../../types/client-billing";
import { Input } from "../shared/Input";
import { Select } from "../shared/Select";
import { Textarea } from "../shared/Textarea";

interface Props {
  profile: ClientBillingProfileUpsert;
  onChange: (changes: Partial<ClientBillingProfileUpsert>) => void;
}

export function InvoiceTermsFields({ profile, onChange }: Props) {
  const { t } = useTranslation();
  const noteId = useId();
  const policy = profile.payment_due_policy ?? "days_after_issue";
  return <div className="space-y-4 sm:col-span-2">
    <div className="grid gap-4 rounded-xl border border-border bg-bg-accent/25 p-3.5 sm:grid-cols-2">
      <Select label={t("clientBilling.terms.deadlineRule")} value={policy}
        onChange={event => onChange({ payment_due_policy: event.target.value as typeof policy })}>
        <option value="days_after_issue">{t("clientBilling.terms.daysAfterIssue")}</option>
        <option value="month_end">{t("clientBilling.terms.monthEnd")}</option>
      </Select>
      {policy === "days_after_issue" ? <Input id="payment-term-days" type="number" min="0" max="365" step="1"
        label={t("clientBilling.paymentTermDays")} value={profile.payment_term_days}
        onChange={event => onChange({ payment_term_days: Number(event.target.value) })} /> : <>
        <Select label={t("clientBilling.terms.monthOffset")} value={String(profile.payment_due_month_offset ?? 1)}
          onChange={event => onChange({ payment_due_month_offset: Number(event.target.value) })}>
          {[0, 1, 2].map(offset => <option key={offset} value={offset}>{t(`clientBilling.terms.offset${offset}`)}</option>)}
        </Select>
        <Select label={t("clientBilling.terms.referenceDate")} value={profile.payment_due_reference ?? "issue_date"}
          onChange={event => onChange({ payment_due_reference: event.target.value as "issue_date" | "period_end" })}>
          <option value="issue_date">{t("clientBilling.terms.issueDate")}</option>
          <option value="period_end">{t("clientBilling.terms.periodEnd")}</option>
        </Select>
        <p className="self-center text-xs leading-5 text-muted">{t("clientBilling.terms.monthEndHelp")}</p>
      </>}
    </div>
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={noteId} className="text-xs font-semibold text-muted">{t("clientBilling.terms.invoiceNote")}</label>
        <span className="text-[11px] tabular-nums text-muted">{profile.invoice_note?.length ?? 0}/450</span>
      </div>
      <Textarea id={noteId} rows={3} maxLength={450} value={profile.invoice_note ?? ""}
        aria-describedby={`${noteId}-hint`}
        onChange={event => onChange({ invoice_note: event.target.value || null })} />
      <p id={`${noteId}-hint`} className="mt-1.5 text-xs leading-5 text-muted">{t("clientBilling.terms.noteHelp")}</p>
    </div>
  </div>;
}
