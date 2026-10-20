import type { TimesheetEntry } from "../types/timesheet";

export type TimesheetSubmissionPeriod = "day" | "week" | "month";

const pad = (value: number) => String(value).padStart(2, "0");

export const getLocalDateValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const getRoundedTimerHours = (durationMinutes: number) =>
  Number((durationMinutes / 60).toFixed(2));

const getSubmissionBounds = (
  selectedDate: string,
  period: TimesheetSubmissionPeriod,
) => {
  const selected = new Date(`${selectedDate}T12:00:00`);

  if (period === "day") {
    return { start: selectedDate, end: selectedDate };
  }

  if (period === "week") {
    const startOfWeek = new Date(selected);
    const daysSinceMonday = (selected.getDay() + 6) % 7;
    startOfWeek.setDate(selected.getDate() - daysSinceMonday);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return {
      start: getLocalDateValue(startOfWeek),
      end: getLocalDateValue(endOfWeek),
    };
  }

  return {
    start: getLocalDateValue(
      new Date(selected.getFullYear(), selected.getMonth(), 1),
    ),
    end: getLocalDateValue(
      new Date(selected.getFullYear(), selected.getMonth() + 1, 0),
    ),
  };
};

export const getDraftEntryIdsForPeriod = (
  entries: TimesheetEntry[],
  selectedDate: string,
  period: TimesheetSubmissionPeriod,
) => {
  const { start, end } = getSubmissionBounds(selectedDate, period);

  return entries
    .filter(
      (entry) =>
        entry.status === "draft" &&
        entry.work_date >= start &&
        entry.work_date <= end,
    )
    .map((entry) => entry.id);
};
