// src/components/review/TimesheetReviewTable.tsx

import React, { useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  Undo2
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/useAuth";
import type {
  TimesheetEntry,
  TimesheetEntryStatus,
} from "../../types/timesheet";
import { approveEntries, rejectEntry } from "../../services/reviewService";
import { revertSubmittedTimesheetEntries } from "../../services/timesheetService";
import { RejectionModal } from "./RejectionModal";

export interface TimesheetReviewRecord extends Omit<TimesheetEntry, "client_id"> {
  profiles?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
  } | null;
  projects?: {
    id: string;
    name: string;
  } | null;
  clients?: {
    id: string;
    name: string;
  } | null;
}

interface TimesheetReviewTableProps {
  entries: TimesheetReviewRecord[];
  isLoading?: boolean;
}

const ITEMS_PER_PAGE = 8;

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
    mutationFn: ({
      entryId,
      reason,
    }: {
      entryId: string;
      reason: string;
    }) =>
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

  const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEntries = entries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const isAllSelected =
    paginatedEntries.length > 0 &&
    paginatedEntries.every((entry) => selectedIds.includes(entry.id));

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const currentPageIds = paginatedEntries.map((entry) => entry.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
      return;
    }

    const currentPageIds = new Set(paginatedEntries.map((entry) => entry.id));
    setSelectedIds((prev) => prev.filter((id) => !currentPageIds.has(id)));
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const openRejectModal = (entryId: string) => {
    setTargetRejectId(entryId);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    if (rejectMutation.isPending) return;
    setIsRejectModalOpen(false);
    setTargetRejectId(null);
    setRejectionReason("");
  };

  const handleConfirmRejection = () => {
    if (!targetRejectId || !rejectionReason.trim()) return;

    rejectMutation.mutate({
      entryId: targetRejectId,
      reason: rejectionReason.trim(),
    });
  };

  const renderStatusBadge = (status: TimesheetEntryStatus) => {
    const statusColorClass = (() => {
      switch (status) {
        case "draft":
          return "bg-gray-200 text-gray-800";
        case "submitted":
          return "bg-blue-200 text-blue-800";
        case "approved":
          return "bg-green-200 text-green-800";
        case "rejected":
          return "bg-red-200 text-red-800";
        case "invoiced":
          return "bg-purple-200 text-purple-800";
        default:
          return "bg-gray-200 text-gray-800";
      }
    })();

    const statusDotClass = (() => {
      switch (status) {
        case "draft":
          return "bg-gray-500";
        case "submitted":
          return "bg-blue-600";
        case "approved":
          return "bg-green-600";
        case "rejected":
          return "bg-red-600";
        case "invoiced":
          return "bg-purple-600";
        default:
          return "bg-gray-500";
      }
    })();

    const statusLabel = (() => {
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
    })();

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusColorClass}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`} />
        {statusLabel}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 && (
        <div className="sticky top-20 z-30 flex items-center justify-between bg-white rounded-xl p-4 shadow-md border border-gray-200 transition-all">
          <div className="flex items-center gap-3 text-gray-900 font-medium text-sm">
            <span className="w-5 h-5 rounded bg-primary text-white flex items-center justify-center text-xs font-bold">
              {selectedIds.length}
            </span>
            <span>{t("common.itemsSelected", "items selected")}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => approveMutation.mutate(selectedIds)}
              disabled={rejectMutation.isPending || approveMutation.isPending}
              className="h-9 px-5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-xs font-medium flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {t("review.approveSelected", "Approve Selected")} (
              {selectedIds.length})
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <th className="p-4 w-[60px] text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                  />
                </th>
                <th className="p-4 font-medium w-[220px]">
                  {t("review.colEmployee", "Employee")}
                </th>
                <th className="p-4 font-medium w-[120px]">
                  {t("review.colDate", "Date")}
                </th>
                <th className="p-4 font-medium w-[220px]">
                  {t("review.colProjectClient", "Project & Client")}
                </th>
                <th className="p-4 font-medium w-[280px]">
                  {t("review.colDescription", "Description")}
                </th>
                <th className="p-4 font-medium text-right w-[110px]">
                  {t("review.colDuration", "Duration")}
                </th>
                <th className="p-4 font-medium w-[120px]">
                  {t("review.colStatus", "Status")}
                </th>
                <th className="p-4 font-medium text-right w-[120px]">
                  {t("review.colActions", "Actions")}
                </th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-800 divide-y divide-gray-100">
              {paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    {t(
                      "timesheetReview.noEntriesFound",
                      "No timesheet entries found for review.",
                    )}
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((entry) => {
                  const isSelected = selectedIds.includes(entry.id);
                  const durationHours = entry.hours_logged;
                  const userEmail = entry.profiles?.full_name || entry.user_id;
                  const projectName =
                    entry.projects?.name || "Unassigned Project";
                  const clientName = entry.clients?.name || "Internal";

                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(entry.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                        />
                      </td>

                      <td className="p-4">
                        <span
                          className="font-medium text-gray-900 truncate block max-w-[200px]"
                          title={userEmail}
                        >
                          {userEmail}
                        </span>
                      </td>

                      <td className="p-4 text-gray-600 font-mono text-xs whitespace-nowrap">
                        {entry.work_date}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-medium text-gray-900 truncate max-w-[200px]">
                            {projectName}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-gray-100 text-gray-600 border border-gray-200">
                            {clientName}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div
                          className="text-gray-600 truncate max-w-[260px]"
                          title={entry.description || ""}
                        >
                          {entry.description || "—"}
                        </div>
                      </td>

                      <td className="p-4 text-right font-mono font-bold text-gray-900">
                        {durationHours}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        {renderStatusBadge(entry.status)}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {entry.status === "submitted" && (
                            <>
                              <button
                                type="button"
                                onClick={() => openRejectModal(entry.id)}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                title={t("common.reject", "Reject")}
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  approveMutation.mutate([entry.id])
                                }
                                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                title={t("common.approve", "Approve")}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {entry.status === "approved" && (
                            <button
                              type="button"
                              onClick={() => revertMutation.mutate([entry.id])}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                              title={t("common.revert", "Revert")}
                            >
                              <Undo2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {entries.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
            <div>
              {t("common.showingResults", {
                start: startIndex + 1,
                end: Math.min(startIndex + ITEMS_PER_PAGE, entries.length),
                total: entries.length,
                defaultValue: `Showing ${startIndex + 1} to ${Math.min(
                  startIndex + ITEMS_PER_PAGE,
                  entries.length,
                )} of ${entries.length} entries`,
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 font-medium text-xs">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 flex items-center justify-center rounded ${
                        currentPage === page
                          ? "bg-primary text-white font-bold"
                          : "bg-white border border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <RejectionModal
        isRejectModalOpen={isRejectModalOpen}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        closeRejectModal={closeRejectModal}
        handleConfirmRejection={handleConfirmRejection}
        rejectMutation={rejectMutation}
        targetRejectId={targetRejectId}
      />
    </div>
  );
};
