import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { Card, CardContent, CardHeader } from "../shared/Card";
import { timesheetStatusColors } from "./timesheetStatusColors";
import { formatHours } from "../../utils/formatHours";
import { COMPANY_CALENDAR_STATUSES } from "../../types/timesheet";
import type {
  TimesheetCalendarProps,
  TimesheetEntryStatus,
} from "../../types/timesheet";

const dailyStatusPriority = ["rejected", "invoiced", "submitted", "approved"] as const;

export const TimesheetCalendar: React.FC<TimesheetCalendarProps> = ({
  currentDate,
  selectedDate,
  timesheets,
  totalMonthlyHours,
  showStatusBreakdown = false,
  loading = false,
  lockedDates = [],
  copyModeActive = false,
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
  const lockedDateSet = new Set(lockedDates);

  const totalsByDate = React.useMemo(() => {
    const days = new Map<string, {
      total: number;
      byStatus: Partial<Record<TimesheetEntryStatus, number>>;
    }>();
    for (const entry of timesheets) {
      const day = days.get(entry.work_date) ?? { total: 0, byStatus: {} };
      const hours = Number(entry.hours_logged);
      day.total += hours;
      day.byStatus[entry.status] = (day.byStatus[entry.status] ?? 0) + hours;
      days.set(entry.work_date, day);
    }
    return days;
  }, [timesheets]);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-strong">
            {t("common.monthView")}
          </div>
          <div key={yearMonth} className="calendar-label flex flex-wrap items-center gap-3">
            <span className="text-[14px] font-semibold tracking-[-0.015em] text-text">{monthLabel}</span>
            <span role={loading ? "status" : undefined} className="rounded-full border border-border-strong bg-white/55 px-2.5 py-1 text-xs font-semibold text-muted-strong">
              {loading ? t("timesheet.loadingEntries") : (
                <>{t("timesheet.totalLogged")}: {formatHours(totalMonthlyHours)} hrs</>
              )}
            </span>
          </div>
          {showStatusBreakdown ? (
            <ul className="flex flex-wrap gap-1.5 pt-1 text-xs">
              {COMPANY_CALENDAR_STATUSES.map((status) => (
                <li key={status} className={`rounded-md px-2 py-0.5 ${timesheetStatusColors[status]}`}>
                  {t(`timesheet.${status}`)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPreviousMonth}
            aria-label={t("common.previousMonth")}
            icon={<ChevronLeft className="text-muted" />}
          ></Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNextMonth}
            aria-label={t("common.nextMonth")}
            icon={<ChevronRight className="text-muted" />}
          ></Button>
        </div>
      </CardHeader>

      <div key={`calendar-${yearMonth}`} className="calendar-month min-w-0" aria-busy={loading}>
        <div className="w-full min-w-0">
          <div className="grid grid-cols-7 border-b border-border bg-transparent py-2.5 text-center text-xs font-semibold text-muted-strong">
            {weekDays.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <CardContent className="p-0">
            <div className="grid min-h-80 grid-cols-7 auto-rows-fr text-sm sm:min-h-105">
              {Array.from({ length: startDayOfWeek }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="border-b border-r border-border bg-bg-accent/35 p-2 opacity-40"
                />
              ))}

              {Array.from({ length: daysInMonth }).map((_, index) => {
                const dayNumber = index + 1;
                const formattedDay =
                  dayNumber < 10 ? `0${dayNumber}` : `${dayNumber}`;
                const dateStr = `${yearMonth}-${formattedDay}`;
                const day = totalsByDate.get(dateStr);
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === todayDateStr;
                const isLocked = lockedDateSet.has(dateStr);
                const isCopyTargetDisabled = copyModeActive && isLocked;

                const statusHours = showStatusBreakdown && day
                  ? COMPANY_CALENDAR_STATUSES.flatMap((status) => {
                      const hours = day.byStatus[status];
                      return hours === undefined ? [] : [{ status, hours: formatHours(hours) }];
                    })
                  : [];
                const totalStatus = dailyStatusPriority.find((status) => day?.byStatus[status] !== undefined) ?? "draft";
                const hoursLabel = showStatusBreakdown
                  ? statusHours.map(({ status, hours }) => t("timesheet.statusHours", { status: t(`timesheet.${status}`), hours })).join(", ")
                  : day ? `${formatHours(day.total)} hours logged` : "";

                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={isCopyTargetDisabled}
                    onClick={() => onSelectDate(dateStr)}
                    aria-label={`${dateStr}${hoursLabel ? `, ${hoursLabel}` : ""}${isLocked ? `, ${t("leave.lockedDay")}` : ""}`}
                    aria-pressed={showStatusBreakdown ? isSelected : undefined}
                    className={`relative flex min-h-14 min-w-0 flex-col justify-between border-b border-r border-border p-1 text-left transition-[background-color,box-shadow,opacity] duration-300 ease-[cubic-bezier(0.22,0.7,0.24,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-strong/45 focus-visible:ring-inset sm:min-h-17.5 sm:p-2 ${
                      isCopyTargetDisabled
                        ? "cursor-not-allowed bg-slate-100/80 opacity-70"
                        : isLocked
                          ? "cursor-pointer bg-slate-100/80 opacity-70 hover:opacity-90"
                        : copyModeActive
                          ? "cursor-pointer bg-primary/5 ring-1 ring-inset ring-primary/20 hover:bg-primary/10 hover:ring-primary/40"
                          : "cursor-pointer hover:bg-black/[0.025]"
                    } ${
                      isToday
                        ? "bg-primary/5"
                        : ""
                    } ${
                      isSelected
                        ? "bg-primary/10 font-semibold ring-1 ring-primary-strong/30 ring-inset"
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
                    {isLocked ? (
                      <span className="max-w-full truncate rounded-full bg-slate-800 px-1 py-0.5 text-[8px] font-bold text-white sm:px-2 sm:text-[10px]">
                        {t("leave.lockedDay")}
                      </span>
                    ) : null}
                    {statusHours.length > 0 ? (
                      <div className="mt-1 w-full space-y-0.5">
                        {statusHours.map(({ status, hours }) => (
                          <div
                            key={status}
                            title={t("timesheet.statusHours", { status: t(`timesheet.${status}`), hours })}
                            className={`break-all rounded-md px-0.5 py-0.5 text-center text-[10px] font-semibold leading-tight tabular-nums sm:px-1 sm:text-[11px] ${timesheetStatusColors[status]}`}
                          >
                            {hours}h
                          </div>
                        ))}
                      </div>
                    ) : day && !showStatusBreakdown ? (
                      <div className={`w-full truncate rounded-md px-1 py-0.5 text-center text-[11px] font-semibold ${timesheetStatusColors[totalStatus]}`}>
                        {formatHours(day.total)}h
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
};
