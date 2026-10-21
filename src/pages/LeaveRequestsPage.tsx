import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/useAuth";
import {
  createLeaveRequest,
  deleteLeaveRequest,
  fetchLeaveRequests,
  getLeaveDateRange,
  getLeaveWorkingDayCount,
  LeaveRequestConflictError,
  updateLeaveRequest,
  updateLeaveRequestStatus,
} from "../services/leaveService";
import { LeaveCalendarPanel } from "../components/leave/LeaveCalendarPanel";
import { LeaveErrorBanner } from "../components/leave/LeaveErrorBanner";
import { LeaveRequestList } from "../components/leave/LeaveRequestList";
import { LeaveRequestModal } from "../components/leave/LeaveRequestModal";
import { LeaveStatsCards } from "../components/leave/LeaveStatsCards";
import { getLocalDateValue } from "../components/leave/leaveRequestHelpers";
import type { LeaveFormState } from "../components/leave/types";
import { Button } from "../components/shared/Button";
import { Plus } from "lucide-react";
import type { LeaveRequest } from "../types/leave";

export const LeaveRequestsPage: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(
    null,
  );
  const [formState, setFormState] = useState<LeaveFormState>({
    start_date: getLocalDateValue(today),
    end_date: getLocalDateValue(today),
    weekly_work_hours: profile?.weekly_work_hours ?? 40,
  });
  const [pageError, setPageError] = useState<string | null>(null);
  const [conflictingDates, setConflictingDates] = useState<string[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const isAdmin = profile?.role === "company_admin";
  const isRegularUser = profile?.role === "regular";

  const { data: leaveRequests = [], isLoading } = useQuery({
    queryKey: ["leave-requests", profile?.company_id, profile?.id],
    queryFn: fetchLeaveRequests,
    enabled: Boolean(profile),
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: string) =>
      updateLeaveRequestStatus(requestId, { status: "APPROVED" }),
    onSuccess: () => {
      setPageError(null);
      setConflictingDates([]);
      void queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
    onError: (error: unknown) => {
      if (error instanceof LeaveRequestConflictError) {
        setConflictingDates(error.conflictingDates);
        setPageError(t("leave.cannotApproveWithLoggedHours"));
        return;
      }

      setPageError(error instanceof Error ? error.message : t("leave.actionFailed"));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) =>
      updateLeaveRequestStatus(requestId, { status: "REJECTED" }),
    onSuccess: () => {
      setPageError(null);
      setConflictingDates([]);
      void queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
    onError: (error: unknown) => {
      setPageError(error instanceof Error ? error.message : t("leave.actionFailed"));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: LeaveFormState) => {
      if (editingRequest) {
        return updateLeaveRequest(editingRequest.id, payload);
      }

      return createLeaveRequest(payload);
    },
    onSuccess: () => {
      setPageError(null);
      setConflictingDates([]);
      setIsModalOpen(false);
      setEditingRequest(null);
      void queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
    onError: (error: unknown) => {
      setPageError(error instanceof Error ? error.message : t("leave.actionFailed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLeaveRequest,
    onSuccess: () => {
      setPageError(null);
      setConflictingDates([]);
      void queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
    onError: (error: unknown) => {
      setPageError(error instanceof Error ? error.message : t("leave.actionFailed"));
    },
  });

  const workingDayCount = useMemo(
    () => getLeaveWorkingDayCount(formState.start_date, formState.end_date),
    [formState.end_date, formState.start_date],
  );

  const openCreateModal = () => {
    setEditingRequest(null);
    setFormState({
      start_date: getLocalDateValue(today),
      end_date: getLocalDateValue(today),
      weekly_work_hours: profile?.weekly_work_hours ?? 40,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (request: LeaveRequest) => {
    setEditingRequest(request);
    setFormState({
      start_date: request.start_date,
      end_date: request.end_date,
      weekly_work_hours:
        request.weekly_work_hours ?? profile?.weekly_work_hours ?? 40,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRequest(null);
  };

  const selectedDates = useMemo(
    () => getLeaveDateRange(formState.start_date, formState.end_date),
    [formState.end_date, formState.start_date],
  );

  const totalRequests = leaveRequests.length;
  const pendingRequests = leaveRequests.filter(
    (request) => request.status === "PENDING",
  ).length;
  const approvedRequests = leaveRequests.filter(
    (request) => request.status === "APPROVED",
  ).length;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-strong" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1.5 text-[11px] font-medium text-primary-strong">
            {t("navigation.leaveRequests")}
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-text sm:text-[28px]">{t("leave.title")}</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">
            {t("leave.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={openCreateModal}
            className="rounded-xl px-4 shadow-[0_10px_22px_rgba(96,120,42,0.22)] ring-2 ring-primary/15 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(96,120,42,0.28)]"
            icon={<Plus className="h-4 w-4" />}
          >
            {t("leave.newRequest")}
          </Button>
        </div>
      </div>

      {!isRegularUser ? (
        <LeaveStatsCards
          totalRequests={totalRequests}
          pendingRequests={pendingRequests}
          approvedRequests={approvedRequests}
        />
      ) : null}

      <LeaveErrorBanner error={pageError} conflictingDates={conflictingDates} />

      <div
        className={
          isRegularUser
            ? "grid grid-cols-1 gap-5"
            : "grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.9fr]"
        }
      >
        <LeaveCalendarPanel
          currentDate={currentDate}
          leaveRequests={leaveRequests}
          currentUserId={profile?.id}
          isAdmin={isAdmin}
          selectedEmployeeId={selectedEmployeeId}
          onEmployeeChange={setSelectedEmployeeId}
          onPreviousMonth={() =>
            setCurrentDate(
              new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() - 1,
                1,
              ),
            )
          }
          onNextMonth={() =>
            setCurrentDate(
              new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() + 1,
                1,
              ),
            )
          }
        />

        {!isRegularUser ? (
          <LeaveRequestList
            currentDate={currentDate}
            leaveRequests={leaveRequests}
            currentUserId={profile?.id}
            isAdmin={isAdmin}
            selectedEmployeeId={selectedEmployeeId}
            onEditRequest={openEditModal}
            onApproveRequest={(requestId) => approveMutation.mutate(requestId)}
            onRejectRequest={(requestId) => rejectMutation.mutate(requestId)}
            onDeleteRequest={(requestId) => deleteMutation.mutate(requestId)}
            isApproving={approveMutation.isPending}
            isRejecting={rejectMutation.isPending}
            isDeleting={deleteMutation.isPending}
          />
        ) : null}
      </div>

      <LeaveRequestModal
        open={isModalOpen}
        editingRequest={editingRequest}
        formState={formState}
        onClose={closeModal}
        onSubmit={() => saveMutation.mutate(formState)}
        onFormStateChange={setFormState}
        isSaving={saveMutation.isPending}
        workingDayCount={workingDayCount}
        selectedDates={selectedDates}
      />
    </div>
  );
};

export default LeaveRequestsPage;
