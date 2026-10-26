import React from "react";
import type { TimesheetEntryStatus } from "../../types/timesheet";

export const StatusBadge: React.FC<{
  status: TimesheetEntryStatus;
  label: string;
}> = React.memo(({ status, label }) => {
  const styles: Record<
    TimesheetEntryStatus,
    { container: string; dot: string }
  > = {
    draft: {
      container: "border border-border-strong bg-slate-100 text-slate-800",
      dot: "bg-slate-500",
    },
    submitted: {
      container: "border border-info-border bg-info-bg text-info",
      dot: "bg-info",
    },
    approved: {
      container: "border border-success-border bg-success-bg text-success",
      dot: "bg-success",
    },
    rejected: {
      container: "border border-rose-200 bg-rose-50 text-rose-800",
      dot: "bg-rose-600",
    },
    invoiced: {
      container: "border border-purple-200 bg-purple-50 text-purple-800",
      dot: "bg-purple-600",
    },
  };

  const style = styles[status] || styles.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.container}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
});

StatusBadge.displayName = "StatusBadge";
