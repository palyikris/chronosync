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
    draft: { container: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
    submitted: { container: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
    approved: {
      container: "bg-emerald-50 text-emerald-700",
      dot: "bg-emerald-500",
    },
    rejected: { container: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
    invoiced: {
      container: "bg-purple-50 text-purple-700",
      dot: "bg-purple-500",
    },
  };

  const style = styles[status] || styles.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.container}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
});

StatusBadge.displayName = "StatusBadge";
