import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Project } from "../../types/client-project";
import type { ProjectPricing } from "../../types/project-pricing";
import { saveProjectPricing } from "../../services/projectPricingService";
import { Modal } from "../shared/Modal";
import { Input } from "../shared/Input";
import { Button } from "../shared/Button";
import { Select } from "../shared/Select";

interface Props {
  project: Project;
  year: number;
  price: ProjectPricing | undefined;
  onClose: () => void;
  onSaved: () => void;
}

export function ProjectPricingModal({ project, year, price, onClose, onSaved }: Props) {
  const { t, i18n } = useTranslation();
  const [amount, setAmount] = useState(price?.indexed_fee == null ? "" : String(price.indexed_fee));
  const [currency, setCurrency] = useState(price?.currency ?? "HUF");
  const [unit, setUnit] = useState(price?.unit ?? "óra");
  const [indexCode, setIndexCode] = useState<NonNullable<ProjectPricing["index_code"]> | "">(price?.index_code ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await saveProjectPricing({ company_id: project.company_id, project_id: project.id,
        pricing_year: year, indexed_fee: amount.trim() === "" ? null : Number(amount), currency, unit,
        index_code: indexCode === "" ? null : indexCode }, Boolean(price));
      onSaved();
      onClose();
    } catch {
      setError(t("projectPricing.saveError"));
    } finally {
      setSaving(false);
    }
  };
  const original = price?.original_fee == null ? price?.original_fee_text ?? t("projectPricing.unset")
    : `${new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language, { maximumFractionDigits: 4 }).format(price.original_fee)} ${price.original_currency ?? price.currency} · ${price.original_unit ?? price.unit}`;

  return <Modal open size="content" className="w-lg max-w-full" title={t("projectPricing.editTitle", { year })} onClose={() => { if (!saving) onClose(); }}>
    <form onSubmit={save} className="space-y-4 p-4">
      <p className="break-words font-semibold text-text">{project.name}</p>
      <div className="rounded-xl border border-border bg-bg-accent p-3 text-sm">
        <p className="text-muted">{t("projectPricing.originalFee")}</p>
        <p className="mt-1 font-medium text-text">{original}</p>
      </div>
      <fieldset disabled={saving} className="min-w-0 space-y-4">
        <Input type="number" min="0" max="9999999999" step="0.0001"
          label={t("projectPricing.indexedFee", { year })} value={amount}
          onChange={event => setAmount(event.target.value)} />
        <p className="text-sm text-muted">{t("projectPricing.blankHint")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t("projectPricing.currency")} value={currency} required minLength={3} maxLength={3} pattern="[A-Z]{3}"
            onChange={event => setCurrency(event.target.value.toUpperCase())} />
          <Input label={t("projectPricing.unit")} value={unit} required maxLength={32}
            onChange={event => setUnit(event.target.value)} />
        </div>
        <Select label={t("projectPricing.annualIndex")} value={indexCode}
          onChange={event => setIndexCode(event.target.value as typeof indexCode)}>
          <option value="">{t("projectPricing.manualIndex")}</option>
          <option value="none">{t("projectPricing.noIndex")}</option>
          <option value="ksh">{t("projectPricing.kshIndex")}</option>
          <option value="eu">{t("projectPricing.euIndex")}</option>
        </Select>
        <p className="text-xs text-muted">{t("projectPricing.rolloverHint", { year: year + 1 })}</p>
        {error && <p role="alert" className="rounded-lg bg-danger-bg p-3 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit">{t(saving ? "common.saving" : "common.save")}</Button>
        </div>
      </fieldset>
    </form>
  </Modal>;
}
