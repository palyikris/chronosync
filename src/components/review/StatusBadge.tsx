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
      container: "border border-slate-300 bg-slate-100 text-slate-800",
      dot: "bg-slate-500",
    },
    submitted: {
      container: "border border-blue-200 bg-blue-50 text-blue-800",
      dot: "bg-blue-600",
    },
    approved: {
      container: "border border-emerald-200 bg-emerald-50 text-emerald-800",
      dot: "bg-emerald-600",
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
