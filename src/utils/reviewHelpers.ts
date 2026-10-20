import type { TimesheetEntryStatus } from "../types/timesheet";

interface ReviewKpiEntry {
  status: TimesheetEntryStatus;
  hours_logged: number | string | null;
  user_id: string;
}

export const calculateReviewKpis = (entries: ReviewKpiEntry[]) => {
  const submittedEntries = entries.filter(
    (entry) => entry.status === "submitted",
  );

  const sumHours = (status: TimesheetEntryStatus) =>
    entries
      .filter((entry) => entry.status === status)
      .reduce((sum, entry) => {
        const hours = Number(entry.hours_logged);
        return sum + (Number.isFinite(hours) ? hours : 0);
      }, 0);

  return {
    totalSubmittedHours: sumHours("submitted"),
    totalApprovedHours: sumHours("approved"),
    totalRejected: entries.filter((entry) => entry.status === "rejected")
      .length,
    employeesPendingReview: new Set(
      submittedEntries.map((entry) => entry.user_id),
    ).size,
  };
};

export const clampReviewPage = (page: number, totalPages: number) =>
  Math.min(Math.max(page, 1), Math.max(totalPages, 1));
