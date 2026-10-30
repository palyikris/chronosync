import { useTranslation } from "react-i18next";
import { Checkbox } from "../shared/Checkbox";

interface Props {
  id: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function ProjectPayrollFields({ id, enabled, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3 rounded-xl border border-border bg-bg-accent/40 p-3">
      <Checkbox id={`${id}-enabled`} label={t("companySettings.payrollProject")}
        checked={enabled} onChange={event => onChange(event.target.checked)}
        aria-controls={`${id}-details`} aria-expanded={enabled} />
      {enabled && <div id={`${id}-details`} className="space-y-2">
        <p className="text-xs text-muted-strong">
          {t("companySettings.payrollHint")}
        </p>
      </div>}
    </div>
  );
}
