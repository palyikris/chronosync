import { useTranslation } from "react-i18next";
import { Checkbox } from "../shared/Checkbox";
import { Input } from "../shared/Input";
import { payrollHeadcountSchema } from "../../types/client-project";

interface Props {
  id: string;
  headcount: number | null;
  onChange: (headcount: number | null) => void;
}

export function ProjectPayrollFields({ id, headcount, onChange }: Props) {
  const { t } = useTranslation();
  const enabled = headcount !== null;
  const valid = payrollHeadcountSchema.safeParse(headcount).success;
  return (
    <div className="space-y-3 rounded-xl border border-border bg-bg-accent/40 p-3">
      <Checkbox id={`${id}-enabled`} label={t("companySettings.payrollProject")}
        checked={enabled} onChange={event => onChange(event.target.checked ? 1 : null)}
        aria-controls={`${id}-details`} aria-expanded={enabled} />
      {enabled && <div id={`${id}-details`} className="space-y-2">
        <Input id={`${id}-headcount`} type="number" min="1" max="2147483647" step="1" required
          label={t("companySettings.payrollHeadcount")} value={headcount === 0 ? "" : headcount}
          onChange={event => onChange(Number(event.target.value))}
          aria-invalid={!valid} aria-describedby={`${id}-hint`} />
        <p id={`${id}-hint`} className={`text-xs ${valid ? "text-muted-strong" : "text-danger"}`}>
          {t(valid ? "companySettings.payrollHint" : "companySettings.payrollInvalid")}
        </p>
      </div>}
    </div>
  );
}
