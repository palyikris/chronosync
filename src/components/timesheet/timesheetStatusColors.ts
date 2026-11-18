import type { TimesheetEntryStatus } from "../../types/timesheet";

export const timesheetStatusColors: Record<TimesheetEntryStatus, string> = {
  draft: "border border-slate-300 bg-slate-100 text-slate-800",
  submitted: "border border-blue-200 bg-blue-50 text-blue-800",
  approved: "border border-green-200 bg-green-100 text-green-800",
  rejected: "border border-red-300 bg-red-50 text-red-800",
  invoiced: "border border-purple-200 bg-purple-50 text-purple-800",
};
