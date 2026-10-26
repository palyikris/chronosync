import { Calendar, CircleAlert, List } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SegmentedControl } from "../shared/SegmentedControl";
import type { TimesheetViewMode } from "../../types/timesheet";

interface TimesheetViewSwitcherProps {
  value: TimesheetViewMode;
  attentionCount?: number;
  attentionLoading?: boolean;
  onChange: (view: TimesheetViewMode) => void;
}

export function TimesheetViewSwitcher({ value, attentionCount, attentionLoading = false, onChange }: TimesheetViewSwitcherProps) {
  const { t } = useTranslation();
  const views = [
    { value: "calendar", label: "timesheet.calendarView", icon: Calendar },
    { value: "list", label: "timesheet.listView", icon: List },
    { value: "attention", label: "timesheet.needsAttention", icon: CircleAlert },
  ] as const;
  const showAttention = attentionCount === undefined
    ? !attentionLoading || value === "attention" : attentionCount > 0;

  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      ariaLabel={t("timesheet.viewOptions")}
      options={views.filter(({ value: view }) => view !== "attention" || showAttention).map(({ value: view, label, icon: Icon }) => ({
        value: view,
        label: (
          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t(label)}
            {view === "attention" && attentionCount !== undefined ? (
              <span aria-hidden="true" className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold leading-none tabular-nums ${value === "attention"
                ? "bg-primary-foreground/10 text-primary-foreground"
                : attentionCount > 0 ? "bg-rose-50 text-rose-700" : "bg-primary/15 text-primary-strong"}`}>
                {attentionCount}
              </span>
            ) : null}
          </span>
        ),
      }))}
    />
  );
}
