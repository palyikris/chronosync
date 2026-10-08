import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../shared/Card";
import { Select } from "../shared/Select";
import {
  formatDateRange,
  getMonthKey,
  isRequestInMonth,
  requestStatusClasses,
} from "./leaveRequestHelpers";
import { getLeaveWorkingDayCount } from "../../services/leaveService";
import type {
  LeaveRequest,
  LeaveRequestEmployeeOption,
  LeaveRequestListProps,
} from "./types";

const statusOrder: Record<LeaveRequest["status"], number> = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
};

const compareRequests = (left: LeaveRequest, right: LeaveRequest) => {
  const statusDelta = statusOrder[left.status] - statusOrder[right.status];

  if (statusDelta !== 0) {
    return statusDelta;
  }

  const startDateDelta = right.start_date.localeCompare(left.start_date);

  if (startDateDelta !== 0) {
    return startDateDelta;
  }

  const createdAtDelta = right.created_at.localeCompare(left.created_at);

  if (createdAtDelta !== 0) {
    return createdAtDelta;
  }

  return (left.profiles?.full_name ?? "").localeCompare(
    right.profiles?.full_name ?? "",
  );
};

export const LeaveRequestList: React.FC<LeaveRequestListProps> = ({
  currentDate,
  leaveRequests,
  currentUserId,
  isAdmin,
  selectedEmployeeId,
  onEmployeeChange,
  onEditRequest,
  onApproveRequest,
  onRejectRequest,
  onDeleteRequest,
  isApproving,
  isRejecting,
  isDeleting,
}) => {
  const { t, i18n } = useTranslation();

  const monthRequests = useMemo(() => {
    const monthKey = getMonthKey(currentDate);
    return leaveRequests
      .filter((request) => isRequestInMonth(request, monthKey))
      .slice()
      .sort(compareRequests);
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
    if (!selectedEmployeeId) {
      return;
    }

    const selectedEmployeeExists = employeeOptions.some(
      (employee) => employee.id === selectedEmployeeId,
    );

    if (!selectedEmployeeExists) {
      onEmployeeChange("");
    }
  }, [employeeOptions, onEmployeeChange, selectedEmployeeId]);

  const visibleRequests = useMemo(() => {
    const filteredRequests = selectedEmployeeId
      ? monthRequests.filter(
          (request) => request.user_id === selectedEmployeeId,
        )
      : monthRequests;

    return filteredRequests.slice(0, 5);
  }, [monthRequests, selectedEmployeeId]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <CardTitle>{t("leave.requestList")}</CardTitle>

        <Select
          value={selectedEmployeeId}
          onChange={(event) => onEmployeeChange(event.target.value)}
          label={t("leave.employeeFilterLabel")}
          className="w-full sm:w-72"
        >
          <option value="">{t("leave.allEmployees")}</option>
          {employeeOptions.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.fullName}
            </option>
          ))}
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleRequests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-strong bg-bg-accent px-4 py-6 text-sm text-muted">
            {t("leave.noRequests")}
          </div>
        ) : (
          visibleRequests.map((request) => {
            const canEdit =
              request.user_id === currentUserId && request.status === "PENDING";
            const canDelete = Boolean(
              currentUserId && (request.user_id === currentUserId || isAdmin),
            );
            const canReview = Boolean(isAdmin && request.status === "PENDING");

            return (
              <div
                key={request.id}
                className="rounded-2xl border border-border-strong bg-surface-strong p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-text">
                      {request.profiles?.full_name ?? t("common.unknown")}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {formatDateRange(
                        request.start_date,
                        request.end_date,
                        i18n.language,
                      )}
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${requestStatusClasses[request.status]}`}
                  >
                    {t(`leave.status.${request.status.toLowerCase()}`)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
                  <span>
                    {t("leave.workingDays")}:{" "}
                    {getLeaveWorkingDayCount(
                      request.start_date,
                      request.end_date,
                    )}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {canEdit ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditRequest(request)}
                    >
                      {t("common.edit")}
                    </Button>
                  ) : null}

                  {canReview ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onApproveRequest(request.id)}
                      disabled={isApproving}
                    >
                      {t("common.approve")}
                    </Button>
                  ) : null}

                  {canReview ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onRejectRequest(request.id)}
                      disabled={isRejecting}
                    >
                      {t("common.reject")}
                    </Button>
                  ) : null}

                  {canDelete ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDeleteRequest(request.id)}
                      disabled={isDeleting}
                    >
                      {t("common.delete")}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
