import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader } from "../shared/Card";
import { Button } from "../shared/Button";
import { getLocalDateValue, getMonthKey, requestStatusClasses } from "./leaveRequestHelpers";
import { getLeaveDateRange } from "../../services/leaveService";
import type { LeaveCalendarPanelProps } from "./types";

const pad = (value: number) => String(value).padStart(2, "0");

export const LeaveCalendarPanel: React.FC<LeaveCalendarPanelProps> = ({
  currentDate,
  leaveRequests,
  currentUserId,
  isAdmin,
  onPreviousMonth,
  onNextMonth,
}) => {
  const { t, i18n } = useTranslation();

  const currentMonthLabel = currentDate.toLocaleString(i18n.language, {
    month: "long",
    year: "numeric",
  });

  const todayDateStr = getLocalDateValue(new Date());

  const monthMatrix = useMemo(() => {
    const daysInMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    ).getDate();
    const startDayOfWeek =
      (new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() +
        6) %
      7;

    const weekDays = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(Date.UTC(2024, 0, 1 + index));
      return new Intl.DateTimeFormat(i18n.language, { weekday: "short" }).format(
        day,
      );
    });

    const monthKey = getMonthKey(currentDate);
    const monthRequests = leaveRequests.filter((request) =>
      request.start_date <= `${monthKey}-31` && request.end_date >= `${monthKey}-01`,
    );

    const dateMap = new Map<string, typeof monthRequests>();

    for (const request of monthRequests) {
      for (const date of getLeaveDateRange(request.start_date, request.end_date)) {
        const existing = dateMap.get(date) ?? [];
        existing.push(request);
        dateMap.set(date, existing);
      }
    }

    return { daysInMonth, startDayOfWeek, weekDays, dateMap };
  }, [currentDate, i18n.language, leaveRequests]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            {t("common.monthView")}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-text">{currentMonthLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPreviousMonth}
            aria-label={t("common.previousMonth")}
            icon={<ChevronLeft className="h-5 w-5 text-muted" />}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={onNextMonth}
            aria-label={t("common.nextMonth")}
            icon={<ChevronRight className="h-5 w-5 text-muted" />}
          />
        </div>
      </CardHeader>

      <div className="overflow-x-auto">
        <div className="min-w-140">
          <div className="grid grid-cols-7 border-b border-border-strong bg-surface-strong py-2 text-center text-xs font-semibold text-muted">
            {monthMatrix.weekDays.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <CardContent className="p-0">
            <div className="grid min-h-96 grid-cols-7 auto-rows-fr text-sm sm:min-h-105">
              {Array.from({ length: monthMatrix.startDayOfWeek }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="border-b border-r border-border-strong bg-bg-accent p-2 opacity-40"
                />
              ))}

              {Array.from({ length: monthMatrix.daysInMonth }).map((_, index) => {
                const dayNumber = index + 1;
                const dateStr = `${getMonthKey(currentDate)}-${pad(dayNumber)}`;
                const dayRequests = monthMatrix.dateMap.get(dateStr) ?? [];
                const isToday = dateStr === todayDateStr;

                return (
                  <div
                    key={dateStr}
                    className={`flex min-h-20 flex-col justify-between border-b border-r border-border-strong p-2 text-left transition-all ${isToday ? "bg-bg-accent/60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-text">
                        {dayNumber}
                      </span>
                      {isToday ? (
                        <span className="rounded-full bg-primary-strong px-2 py-0.5 text-[10px] font-semibold text-white">
                          {t("leave.today")}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 space-y-1">
                      {dayRequests.slice(0, 2).map((request) => {
                        const isVisible =
                          request.status === "APPROVED" ||
                          (request.status === "PENDING" &&
                            (isAdmin || request.user_id === currentUserId)) ||
                          (request.status === "REJECTED" && request.user_id === currentUserId);

                        if (!isVisible) {
                          return null;
                        }

                        return (
                          <div
                            key={request.id}
                            className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${requestStatusClasses[request.status]}`}
                          >
                            <div className="truncate">
                              {request.status === "APPROVED"
                                ? request.profiles?.full_name ?? t("common.unknown")
                                : request.status === "PENDING"
                                  ? t("leave.pendingApproval")
                                  : t("leave.rejected")}
                            </div>
                          </div>
                        );
                      })}

                      {dayRequests.length > 2 ? (
                        <div className="text-[10px] font-semibold text-muted">
                          +{dayRequests.length - 2} {t("common.entries")}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
};
