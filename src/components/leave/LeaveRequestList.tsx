import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../shared/Card";
import { formatDateRange, getMonthKey, isRequestInMonth, requestStatusClasses } from "./leaveRequestHelpers";
import { getLeaveWorkingDayCount } from "../../services/leaveService";
import type { LeaveRequestListProps } from "./types";

export const LeaveRequestList: React.FC<LeaveRequestListProps> = ({
  currentDate,
  leaveRequests,
  currentUserId,
  isAdmin,
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
    return leaveRequests.filter((request) => isRequestInMonth(request, monthKey));
  }, [currentDate, leaveRequests]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("leave.requestList")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {monthRequests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-strong bg-bg-accent px-4 py-6 text-sm text-muted">
            {t("leave.noRequests")}
          </div>
        ) : (
          monthRequests.map((request) => {
            const canEdit = request.user_id === currentUserId && request.status === "PENDING";
            const canDelete = Boolean(currentUserId && (request.user_id === currentUserId || isAdmin));
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
                      {formatDateRange(request.start_date, request.end_date, i18n.language)}
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
                    {t("leave.workingDays")}: {getLeaveWorkingDayCount(request.start_date, request.end_date)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {canEdit ? (
                    <Button variant="outline" size="sm" onClick={() => onEditRequest(request)}>
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
