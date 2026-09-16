import type { LeaveRequest } from "../../types/leave";

const pad = (value: number) => String(value).padStart(2, "0");

export const getLocalDateValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const getMonthKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

export const formatDateRange = (
  startDate: string,
  endDate: string,
  locale: string,
) => {
  const format = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${format.format(new Date(`${startDate}T00:00:00`))} - ${format.format(
    new Date(`${endDate}T00:00:00`),
  )}`;
};

export const requestStatusClasses: Record<LeaveRequest["status"], string> = {
  PENDING: "border-blue-200 bg-blue-200 text-blue-800",
  APPROVED: "border-green-200 bg-green-200 text-green-800",
  REJECTED: "border-red-200 bg-red-200 text-red-800 line-through",
};

export const isRequestInMonth = (
  request: LeaveRequest,
  monthKey: string,
) => {
  const monthStart = `${monthKey}-01`;
  const monthEnd = `${monthKey}-31`;

  return request.start_date <= monthEnd && request.end_date >= monthStart;
};
