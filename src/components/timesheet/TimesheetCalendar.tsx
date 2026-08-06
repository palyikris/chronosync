import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { Card, CardContent, CardHeader } from "../shared/Card";
import type {
  TimesheetCalendarProps,
  TimesheetEntryStatus,
} from "../../types/timesheet";

export const TimesheetCalendar: React.FC<TimesheetCalendarProps> = ({
  currentDate,
  selectedDate,
  timesheets,
  totalMonthlyHours,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
}) => {
  const { t, i18n } = useTranslation();

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(Date.UTC(2024, 0, 1 + index));
    return new Intl.DateTimeFormat(i18n.language, { weekday: "short" }).format(
      day,
    );
  });

  const monthLabel = currentDate.toLocaleString(i18n.language, {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  ).getDate();

  const startDayOfWeek =
    (new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() +
      6) %
    7;

  const yearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  const today = new Date();
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const formatHours = (hours: number) =>
    Number.isInteger(hours)
      ? `${hours}`
      : hours.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");

  const getColorOfEntriesForEntries = (
    entryStatuses: TimesheetEntryStatus[],
  ): string => {
    const statuses = new Set(entryStatuses);
    if (statuses.has("rejected")) {
      return "bg-red-200 text-red-800";
    } else if (statuses.has("invoiced")) {
      return "bg-purple-200 text-purple-800";
    } else if (statuses.has("submitted")) {
      return "bg-blue-200 text-blue-800";
    } else if (statuses.has("approved")) {
      return "bg-green-200 text-green-800";
    }
    return "bg-gray-200 text-gray-800"; // Default color for other statuses
  };

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            {t("common.monthView")}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-text">{monthLabel}</span>
            <span className="rounded-full border border-border-strong bg-bg-accent px-3 py-1 text-xs font-semibold text-muted-strong">
              {t("timesheet.totalLogged")}: {formatHours(totalMonthlyHours)} hrs
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPreviousMonth}
            aria-label={t("common.previousMonth")}
            icon={<ChevronLeft className="h-5 w-5 text-muted" />}
          ></Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNextMonth}
            aria-label={t("common.nextMonth")}
            icon={<ChevronRight className="h-5 w-5 text-muted" />}
          ></Button>
        </div>
      </CardHeader>

      <div className="grid grid-cols-7 border-b border-border-strong bg-surface-strong py-2 text-center text-xs font-semibold text-muted">
        {weekDays.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <CardContent className="p-0">
        <div className="grid min-h-105 grid-cols-7 auto-rows-fr text-sm">
          {Array.from({ length: startDayOfWeek }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="border-b border-r border-border-strong bg-bg-accent p-2 opacity-40"
            />
          ))}

          {Array.from({ length: daysInMonth }).map((_, index) => {
            const dayNumber = index + 1;
            const formattedDay =
              dayNumber < 10 ? `0${dayNumber}` : `${dayNumber}`;
            const dateStr = `${yearMonth}-${formattedDay}`;
            const dayLogs = timesheets.filter(
              (entry) => entry.work_date === dateStr,
            );
            const hasLogs = dayLogs.length > 0;
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === todayDateStr;

            const entryStatuses = dayLogs.map((entry) => entry.status);
            const colorClass = getColorOfEntriesForEntries(entryStatuses);

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => onSelectDate(dateStr)}
                className={`flex min-h-17.5 cursor-pointer flex-col justify-between border-b border-r border-border-strong p-2 text-left transition-all hover:bg-bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-inset ${
                  isToday
                    ? "relative bg-bg-accent/60 border border-primary"
                    : ""
                } ${
                  isSelected
                    ? "bg-primary/20 font-bold ring-2 ring-primary-strong ring-inset"
                    : ""
                }`}
              >
                {isToday ? (
                  <span
                    aria-hidden="true"
                    className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary-strong shadow-sm"
                  />
                ) : null}
                <span className="text-xs text-text">{dayNumber}</span>
                {hasLogs ? (
                  <div
                    className={`w-full truncate rounded px-1 py-0.5 text-center text-[10px] font-bold ${colorClass}`}
                  >
                    {dayLogs.reduce(
                      (sum, entry) => sum + Number(entry.hours_logged),
                      0,
                    )}
                    h
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};