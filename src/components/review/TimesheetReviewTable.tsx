// src/components/review/TimesheetReviewTable.tsx

import React, { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/useAuth";
import type { TimesheetEntryStatus } from "../../types/timesheet";
import { approveEntries, rejectEntry } from "../../services/reviewService";
import { revertSubmittedTimesheetEntries } from "../../services/timesheetService";
import { RejectionModal } from "./RejectionModal";
import { ReviewBulkActionsBar } from "./ReviewBulkActionsBar";
import { ReviewClientGroup } from "./ReviewClientGroup";
import { ReviewTableHeader } from "./ReviewTableHeader";
import { ReviewTablePagination } from "./ReviewTablePagination";
import type {
  ClientGroup,
  TimesheetReviewRecord,
  TimesheetReviewTableProps,
} from "./types";

const CLIENTS_PER_PAGE = 3;


export const TimesheetReviewTable: React.FC<TimesheetReviewTableProps> = ({
  entries = [],
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [targetRejectId, setTargetRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [collapsedProjects, setCollapsedProjects] = useState<
    Record<string, boolean>
  >({});

  const approveMutation = useMutation({
    mutationFn: (entryIds: string[]) =>
      approveEntries({
        entryIds,
        reviewerId: user?.id || "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets-for-review"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      setSelectedIds([]);
    },
  });

  const revertMutation = useMutation({
    mutationFn: (entryIds: string[]) =>
      revertSubmittedTimesheetEntries(entryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets-for-review"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      setSelectedIds([]);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: string }) =>
      rejectEntry({
        entryId,
        reviewerId: user?.id || "",
        rejectionReason: reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets-for-review"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      setSelectedIds([]);
      setIsRejectModalOpen(false);
      setRejectionReason("");
      setTargetRejectId(null);
    },
  });

  // 1. Group ALL entries globally by Client -> Project
  const allGroupedClients = useMemo(() => {
    const clientMap: Record<
      string,
      {
        clientId: string;
        clientName: string;
        projects: Record<
          string,
          {
            projectId: string;
            projectName: string;
            entries: TimesheetReviewRecord[];
            totalHours: number;
          }
        >;
      }
    > = {};

    entries.forEach((entry) => {
      const clientId = entry.clients?.id || "internal";
      const clientName =
        entry.clients?.name ||
        t("timesheetReview.defaultClientName", "Internal / Direct");
      const projectId = entry.projects?.id || "unassigned";
      const projectName =
        entry.projects?.name ||
        t("timesheetReview.defaultProjectName", "General Work");
      const hours = Number(entry.hours_logged) || 0;

      if (!clientMap[clientId]) {
        clientMap[clientId] = {
          clientId,
          clientName,
          projects: {},
        };
      }

      if (!clientMap[clientId].projects[projectId]) {
        clientMap[clientId].projects[projectId] = {
          projectId,
          projectName,
          entries: [],
          totalHours: 0,
        };
      }

      clientMap[clientId].projects[projectId].entries.push(entry);
      clientMap[clientId].projects[projectId].totalHours += hours;
    });

    return Object.values(clientMap).map((client) => {
      const projectList = Object.values(client.projects);
      const clientTotalHours = projectList.reduce(
        (sum, p) => sum + p.totalHours,
        0,
      );
      const totalEntriesCount = projectList.reduce(
        (sum, p) => sum + p.entries.length,
        0,
      );

      return {
        clientId: client.clientId,
        clientName: client.clientName,
        projects: projectList,
        totalHours: clientTotalHours,
        totalEntriesCount,
      } as ClientGroup;
    });
  }, [entries, t]);

  // 2. Paginate over unique CLIENTS
  const totalPages =
    Math.ceil(allGroupedClients.length / CLIENTS_PER_PAGE) || 1;
  const startClientIndex = (currentPage - 1) * CLIENTS_PER_PAGE;
  const paginatedClients = useMemo(
    () =>
      allGroupedClients.slice(
        startClientIndex,
        startClientIndex + CLIENTS_PER_PAGE,
      ),
    [allGroupedClients, startClientIndex],
  );

  // All entry IDs currently visible on the active page
  const activePageEntryIds = useMemo(() => {
    return paginatedClients.flatMap((client) =>
      client.projects.flatMap((project) => project.entries.map((e) => e.id)),
    );
  }, [paginatedClients]);

  const isAllActivePageSelected =
    activePageEntryIds.length > 0 &&
    activePageEntryIds.every((id) => selectedIds.includes(id));

  const toggleProject = useCallback((groupKey: string) => {
    setCollapsedProjects((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }, []);

  const handleSelectRow = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const handleSelectGroup = useCallback(
    (groupEntries: TimesheetReviewRecord[]) => {
      const groupIds = groupEntries.map((e) => e.id);
      const allSelected = groupIds.every((id) => selectedIds.includes(id));

      if (allSelected) {
        setSelectedIds((prev) => prev.filter((id) => !groupIds.includes(id)));
      } else {
        setSelectedIds((prev) => Array.from(new Set([...prev, ...groupIds])));
      }
    },
    [selectedIds],
  );

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedIds((prev) =>
        Array.from(new Set([...prev, ...activePageEntryIds])),
      );
    } else {
      const pageIdSet = new Set(activePageEntryIds);
      setSelectedIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    }
  };

  const handleApproveSingle = useCallback(
    (id: string) => {
      approveMutation.mutate([id]);
    },
    [approveMutation],
  );

  const handleRevertSingle = useCallback(
    (id: string) => {
      revertMutation.mutate([id]);
    },
    [revertMutation],
  );

  const handleOpenReject = useCallback((id: string) => {
    setTargetRejectId(id);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  }, []);

  const getStatusLabel = useCallback(
    (status: TimesheetEntryStatus) => {
      switch (status) {
        case "submitted":
          return t("timesheetReview.statusSubmitted", "Submitted");
        case "approved":
          return t("timesheetReview.statusApproved", "Approved");
        case "rejected":
          return t("timesheetReview.statusRejected", "Rejected");
        case "draft":
          return t("timesheetReview.statusDraft", "Draft");
        case "invoiced":
          return t("timesheetReview.statusInvoiced", "Invoiced");
        default:
          return status;
      }
    },
    [t],
  );

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReviewBulkActionsBar
        selectedCount={selectedIds.length}
        isPending={approveMutation.isPending}
        onApprove={() => approveMutation.mutate(selectedIds)}
        t={t}
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <ReviewTableHeader
              t={t}
              isAllActivePageSelected={isAllActivePageSelected}
              onSelectAll={handleSelectAll}
            />
            <tbody className="text-sm text-slate-800">
              {paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    {t(
                      "timesheetReview.noEntriesFound",
                      "No timesheet entries found for review.",
                    )}
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client) => (
                  <ReviewClientGroup
                    key={client.clientId}
                    client={client}
                    selectedIds={selectedIds}
                    collapsedProjects={collapsedProjects}
                    onToggleProject={toggleProject}
                    onSelectGroup={handleSelectGroup}
                    onApproveProject={(ids) => approveMutation.mutate(ids)}
                    t={t}
                    getStatusLabel={getStatusLabel}
                    handleSelectRow={handleSelectRow}
                    handleApproveSingle={handleApproveSingle}
                    handleRevertSingle={handleRevertSingle}
                    handleOpenReject={handleOpenReject}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <ReviewTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          startClientIndex={startClientIndex}
          totalClients={allGroupedClients.length}
          totalEntries={entries.length}
          clientsPerPage={CLIENTS_PER_PAGE}
          onPageChange={(page) => setCurrentPage(page)}
          onPrevPage={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          onNextPage={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          t={t}
        />
      </div>

      <RejectionModal
        isRejectModalOpen={isRejectModalOpen}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        closeRejectModal={() => {
          if (rejectMutation.isPending) return;
          setIsRejectModalOpen(false);
          setTargetRejectId(null);
          setRejectionReason("");
        }}
        handleConfirmRejection={() => {
          if (!targetRejectId || !rejectionReason.trim()) return;
          rejectMutation.mutate({
            entryId: targetRejectId,
            reason: rejectionReason.trim(),
          });
        }}
        rejectMutation={rejectMutation}
        targetRejectId={targetRejectId}
      />
    </div>
  );
};;;