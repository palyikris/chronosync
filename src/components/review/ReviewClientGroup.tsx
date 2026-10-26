import React from "react";
import type { TFunction } from "i18next";
import { Building2, ChevronDown, FolderGit2 } from "lucide-react";
import { EntryRow } from "./EntryRow";
import { Checkbox } from "../shared/Checkbox";
import { REVIEW_PROJECT_TONE } from "./projectTones";
import type { ClientGroup, TimesheetReviewRecord } from "./types";

interface ReviewClientGroupProps {
  client: ClientGroup;
  selectedIds: string[];
  collapsedProjects: Record<string, boolean>;
  onToggleProject: (groupKey: string) => void;
  onSelectGroup: (groupEntries: TimesheetReviewRecord[]) => void;
  onApproveProject: (ids: string[]) => void;
  t: TFunction;
  getStatusLabel: (status: "draft" | "submitted" | "approved" | "rejected" | "invoiced") => string;
  handleSelectRow: (id: string) => void;
  handleApproveSingle: (id: string) => void;
  handleRevertSingle: (id: string) => void;
  handleOpenReject: (id: string) => void;
  isActionPending: boolean;
}

export const ReviewClientGroup: React.FC<ReviewClientGroupProps> = ({
  client,
  selectedIds,
  collapsedProjects,
  onToggleProject,
  onSelectGroup,
  onApproveProject,
  t,
  getStatusLabel,
  handleSelectRow,
  handleApproveSingle,
  handleRevertSingle,
  handleOpenReject,
  isActionPending,
}) => {
  const allClientEntries = client.projects.flatMap((project) => project.entries);
  const submittedClientEntries = allClientEntries.filter(
    (entry) => entry.status === "submitted",
  );
  const isAllClientSelected =
    submittedClientEntries.length > 0 &&
    submittedClientEntries.every((entry) => selectedIds.includes(entry.id));

  return (
    <React.Fragment key={client.clientId}>
      <tr className="bg-slate-100/80 border-t border-b border-slate-200">
        <td className="p-2.5 text-center">
          <Checkbox
            checked={isAllClientSelected}
            disabled={submittedClientEntries.length === 0 || isActionPending}
            aria-label={t("timesheetReview.selectAllClient", {
              clientName: client.clientName,
            })}
            onChange={() => onSelectGroup(submittedClientEntries)}
            className="h-3.5 w-3.5 cursor-pointer disabled:opacity-40"
          />
        </td>
        <td colSpan={6} className="py-2.5 pr-4">
          <div className="flex min-w-0 items-center justify-between gap-4 text-xs font-semibold text-slate-800">
            <div className="flex min-w-0 items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              <span className="truncate">{client.clientName}</span>
              <span className="shrink-0 text-slate-400 font-normal">
                ({client.totalEntriesCount}{" "}
                {client.totalEntriesCount === 1
                  ? t("common.entry", "entry")
                  : t("common.entries", "entries")}
                )
              </span>
            </div>
            <span className="shrink-0 font-mono text-slate-600">
              {t("timesheetReview.hoursTotal", {
                hours: client.totalHours.toFixed(2),
              })}
            </span>
          </div>
        </td>
      </tr>

      {client.projects.map((project) => {
        const groupKey = `${client.clientId}-${project.projectId}`;
        const isCollapsed = !!collapsedProjects[groupKey];
        const projectTone = REVIEW_PROJECT_TONE;
        const submittedEntries = project.entries.filter(
          (entry) => entry.status === "submitted",
        );
        const isAllProjectSelected =
          submittedEntries.length > 0 &&
          submittedEntries.every((entry) => selectedIds.includes(entry.id));

        return (
          <React.Fragment key={groupKey}>
            <tr
              className={`border-y ${projectTone.header} ${
                isCollapsed ? projectTone.end : ""
              }`}
            >
              <td
                className={`border-l-2 p-2 text-center ${projectTone.rail}`}
              >
                <Checkbox
                  checked={isAllProjectSelected}
                  disabled={submittedEntries.length === 0 || isActionPending}
                  aria-label={t("timesheetReview.selectAllProject", {
                    projectName: project.projectName,
                  })}
                  onChange={() => onSelectGroup(submittedEntries)}
                  className="h-3.5 w-3.5 cursor-pointer disabled:opacity-40"
                />
              </td>
              <td colSpan={6} className="py-2.5 pr-4">
                <div className="flex min-w-0 items-center justify-between gap-4 text-xs">
                  <button
                    type="button"
                    onClick={() => onToggleProject(groupKey)}
                    aria-expanded={!isCollapsed}
                    className="flex min-w-0 items-center gap-2.5 text-left font-medium text-slate-700 transition-colors hover:text-slate-900"
                  >
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                        isCollapsed ? "-rotate-90" : ""
                      }`}
                    />
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${projectTone.icon}`}
                    >
                      <FolderGit2 className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        {t("timesheetReview.projectLabel")}
                      </span>
                      <span className="block truncate text-[13px] font-bold text-slate-900">
                        {project.projectName}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full border border-current/10 bg-white/55 px-2 py-0.5 font-normal text-slate-500">
                      {project.entries.length}
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-slate-600 font-medium">
                      {t("timesheetReview.hoursShort", {
                        hours: project.totalHours.toFixed(2),
                      })}
                    </span>
                    {submittedEntries.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onApproveProject(
                            submittedEntries.map((entry) => entry.id),
                          )
                        }
                        disabled={isActionPending}
                        className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors disabled:opacity-50"
                      >
                        {t("timesheetReview.approveProject", {
                          count: submittedEntries.length,
                        })}
                      </button>
                    )}
                  </div>
                </div>
              </td>
            </tr>

            {!isCollapsed &&
              project.entries.map((entry, entryIndex) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  isSelected={selectedIds.includes(entry.id)}
                  statusLabel={getStatusLabel(entry.status)}
                  rejectLabel={t("common.reject", "Reject")}
                  approveLabel={t("common.approve", "Approve")}
                  revertLabel={t("common.revert", "Revert")}
                  selectLabel={t("timesheetReview.selectEntry", {
                    user: entry.profiles?.full_name || entry.user_id,
                  })}
                  onSelect={handleSelectRow}
                  onApprove={handleApproveSingle}
                  onRevert={handleRevertSingle}
                  onOpenReject={handleOpenReject}
                  isActionPending={isActionPending}
                  projectTone={projectTone}
                  isProjectEnd={entryIndex === project.entries.length - 1}
                />
              ))}
          </React.Fragment>
        );
      })}
    </React.Fragment>
  );
};
