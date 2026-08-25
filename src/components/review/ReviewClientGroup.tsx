import React from "react";
import { Building2, ChevronDown, FolderGit2 } from "lucide-react";
import { EntryRow } from "./EntryRow";
import type { ClientGroup, TimesheetReviewRecord } from "./types";

interface ReviewClientGroupProps {
  client: ClientGroup;
  selectedIds: string[];
  collapsedProjects: Record<string, boolean>;
  onToggleProject: (groupKey: string) => void;
  onSelectGroup: (groupEntries: TimesheetReviewRecord[]) => void;
  onApproveProject: (ids: string[]) => void;
  t: any;
  getStatusLabel: (status: "draft" | "submitted" | "approved" | "rejected" | "invoiced") => string;
  handleSelectRow: (id: string) => void;
  handleApproveSingle: (id: string) => void;
  handleRevertSingle: (id: string) => void;
  handleOpenReject: (id: string) => void;
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
}) => {
  const allClientEntries = client.projects.flatMap((project) => project.entries);
  const isAllClientSelected = allClientEntries.every((entry) =>
    selectedIds.includes(entry.id),
  );

  return (
    <React.Fragment key={client.clientId}>
      <tr className="bg-slate-100/80 border-t border-b border-slate-200">
        <td className="p-2.5 text-center">
          <input
            type="checkbox"
            checked={isAllClientSelected}
            aria-label={t("timesheetReview.selectAllClient", {
              clientName: client.clientName,
            })}
            onChange={() => onSelectGroup(allClientEntries)}
            className="w-3.5 h-3.5 rounded border-slate-300 text-primary cursor-pointer accent-primary"
          />
        </td>
        <td colSpan={6} className="py-2.5 pr-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              <span>{client.clientName}</span>
              <span className="text-slate-400 font-normal">
                ({client.totalEntriesCount}{" "}
                {client.totalEntriesCount === 1
                  ? t("common.entry", "entry")
                  : t("common.entries", "entries")}
                )
              </span>
            </div>
            <span className="font-mono text-slate-600">
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
        const submittedEntries = project.entries.filter(
          (entry) => entry.status === "submitted",
        );
        const isAllProjectSelected = project.entries.every((entry) =>
          selectedIds.includes(entry.id),
        );

        return (
          <React.Fragment key={groupKey}>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <td className="p-2 text-center">
                <input
                  type="checkbox"
                  checked={isAllProjectSelected}
                  aria-label={t("timesheetReview.selectAllProject", {
                    projectName: project.projectName,
                  })}
                  onChange={() => onSelectGroup(project.entries)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-primary cursor-pointer accent-primary"
                />
              </td>
              <td colSpan={6} className="py-2 pr-4">
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => onToggleProject(groupKey)}
                    className="flex items-center gap-2 font-medium text-slate-700 hover:text-slate-900 transition-colors"
                  >
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                        isCollapsed ? "-rotate-90" : ""
                      }`}
                    />
                    <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{project.projectName}</span>
                    <span className="text-slate-400 font-normal">
                      ({project.entries.length})
                    </span>
                  </button>

                  <div className="flex items-center gap-3">
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
                        disabled={false}
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
              project.entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  isSelected={selectedIds.includes(entry.id)}
                  statusLabel={getStatusLabel(entry.status)}
                  rejectLabel={t("common.reject", "Reject")}
                  approveLabel={t("common.approve", "Approve")}
                  revertLabel={t("common.revert", "Revert")}
                  selectLabel={t("timesheetReview.selectEntry", {
                    user:
                      entry.profiles?.full_name ||
                      entry.profiles?.email ||
                      entry.user_id,
                  })}
                  onSelect={handleSelectRow}
                  onApprove={handleApproveSingle}
                  onRevert={handleRevertSingle}
                  onOpenReject={handleOpenReject}
                />
              ))}
          </React.Fragment>
        );
      })}
    </React.Fragment>
  );
};
