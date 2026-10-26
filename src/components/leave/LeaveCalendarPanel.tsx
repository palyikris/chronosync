import React, { useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader } from "../shared/Card";
import { Button } from "../shared/Button";
import { Select } from "../shared/Select";
import {
  getLeaveRequestBadgeClasses,
  getLocalDateValue,
  getMonthKey,
  isRequestInMonth,
} from "./leaveRequestHelpers";
import { getLeaveDateRange } from "../../services/leaveService";
import type {
  LeaveCalendarPanelProps,
  LeaveRequestEmployeeOption,
} from "./types";

const pad = (value: number) => String(value).padStart(2, "0");

export const LeaveCalendarPanel: React.FC<LeaveCalendarPanelProps> = ({
  currentDate,
  leaveRequests,
  currentUserId,
  isAdmin,
  selectedEmployeeId,
  onEmployeeChange,
  onPreviousMonth,
  onNextMonth,
}) => {
  const { t, i18n } = useTranslation();

  const currentMonthLabel = currentDate.toLocaleString(i18n.language, {
    month: "long",
    year: "numeric",
  });

  const todayDateStr = getLocalDateValue(new Date());

  const monthRequests = useMemo(() => {
    const monthKey = getMonthKey(currentDate);

    return leaveRequests.filter((request) =>
      isRequestInMonth(request, monthKey),
    );
  }, [currentDate, leaveRequests]);

  const employeeOptions = useMemo<LeaveRequestEmployeeOption[]>(() => {
    const uniqueEmployees = new Map<string, LeaveRequestEmployeeOption>();

    for (const request of monthRequests) {
      if (!uniqueEmployees.has(request.user_id)) {
        uniqueEmployees.set(request.user_id, {
          id: request.user_id,
          fullName: request.profiles?.full_name ?? t("common.unknown"),
        });
      }
    }

    return Array.from(uniqueEmployees.values()).sort((left, right) =>
      left.fullName.localeCompare(right.fullName),
    );
  }, [monthRequests, t]);

  useEffect(() => {
    if (
      selectedEmployeeId &&
      !employeeOptions.some((employee) => employee.id === selectedEmployeeId)
    ) {
      onEmployeeChange("");
    }
  }, [employeeOptions, onEmployeeChange, selectedEmployeeId]);

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

    const visibleMonthRequests = selectedEmployeeId
      ? monthRequests.filter(
          (request) => request.user_id === selectedEmployeeId,
        )
      : monthRequests;

    const dateMap = new Map<string, typeof visibleMonthRequests>();

    for (const request of visibleMonthRequests) {
      for (const date of getLeaveDateRange(request.start_date, request.end_date)) {
        const existing = dateMap.get(date) ?? [];
        existing.push(request);
        dateMap.set(date, existing);
      }
    }

    return { daysInMonth, startDayOfWeek, weekDays, dateMap };
  }, [currentDate, i18n.language, monthRequests, selectedEmployeeId]);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-muted">
            {t("common.monthView")}
          </div>
          <div key={getMonthKey(currentDate)} className="calendar-label flex flex-wrap items-center gap-3">
            <span className="text-[14px] font-semibold tracking-[-0.015em] text-text">
              {currentMonthLabel}
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
          <Select
            value={selectedEmployeeId}
            onChange={(event) => onEmployeeChange(event.target.value)}
            label={t("leave.employeeFilterLabel")}
            className="w-full sm:w-64"
          >
            <option value="">{t("leave.allEmployees")}</option>
            {employeeOptions.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName}
              </option>
            ))}
          </Select>

          <div className="flex items-center gap-1 self-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPreviousMonth}
              aria-label={t("common.previousMonth")}
              icon={<ChevronLeft className="text-muted" />}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={onNextMonth}
              aria-label={t("common.nextMonth")}
              icon={<ChevronRight className="text-muted" />}
            />
          </div>
        </div>
      </CardHeader>

      <div key={`calendar-${getMonthKey(currentDate)}`} className="calendar-month overflow-x-auto">
        <div className="min-w-140">
          <div className="grid grid-cols-7 border-b border-border bg-transparent py-2 text-center text-[11px] font-medium text-muted">
            {monthMatrix.weekDays.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <CardContent className="p-0">
            <div className="grid min-h-96 grid-cols-7 auto-rows-fr text-sm sm:min-h-105">
              {Array.from({ length: monthMatrix.startDayOfWeek }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="border-b border-r border-border bg-bg-accent/35 p-2 opacity-40"
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
                    className={`relative flex min-h-14 flex-col justify-between border-b border-r border-border p-1.5 text-left transition-colors duration-300 ease-[cubic-bezier(0.22,0.7,0.24,1)] sm:min-h-17.5 sm:p-2 ${isToday ? "bg-primary/5" : ""}`}
                  >
                    {isToday ? (
                      <span
                        aria-hidden="true"
                        className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary-strong shadow-sm"
                      />
                    ) : null}
                    <span className="text-xs text-text">{dayNumber}</span>

                    <div className="mt-1 space-y-1">
                      {dayRequests.slice(0, 2).map((request) => {
                        const isVisible =
                          request.status === "APPROVED" ||
                          (request.status === "PENDING" &&
                            (isAdmin || request.user_id === currentUserId)) ||
                          (request.status === "REJECTED" && request.user_id === currentUserId);
                        const isOwnRequest = request.user_id === currentUserId;

                        if (!isVisible) {
                          return null;
                        }

                        return (
                          <div
                            key={request.id}
                            className={getLeaveRequestBadgeClasses(
                              request.status,
                              isOwnRequest,
                            )}
                          >
                            {isOwnRequest ? (
                              <span
                                title="My request"
                                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-primary-strong text-white shadow-sm"
                                aria-label="My request"
                              >
                                <User className="h-2.5 w-2.5" />
                              </span>
                            ) : null}

                            <div className="truncate">
                              {request.status === "APPROVED"
                                ? (request.profiles?.full_name ??
                                  t("common.unknown"))
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
