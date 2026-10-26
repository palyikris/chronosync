import React from "react";
import { Check, Undo2, X } from "lucide-react";
import { Tooltip } from "../shared/Tooltip";
import { Checkbox } from "../shared/Checkbox";
import { StatusBadge } from "./StatusBadge";
import type { ReviewProjectTone } from "./projectTones";
import type { TimesheetReviewRecord } from "./types";

export interface EntryRowProps {
  entry: TimesheetReviewRecord;
  isSelected: boolean;
  statusLabel: string;
  rejectLabel: string;
  approveLabel: string;
  revertLabel: string;
  selectLabel: string;
  onSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onRevert: (id: string) => void;
  onOpenReject: (id: string) => void;
  isActionPending: boolean;
  projectTone: ReviewProjectTone;
  isProjectEnd: boolean;
}

export const EntryRow: React.FC<EntryRowProps> = React.memo(
  ({
    entry,
    isSelected,
    statusLabel,
    rejectLabel,
    approveLabel,
    revertLabel,
    selectLabel,
    onSelect,
    onApprove,
    onRevert,
    onOpenReject,
    isActionPending,
    projectTone,
    isProjectEnd,
  }) => {
    const userDisplay = entry.profiles?.full_name || entry.user_id;

    return (
      <tr
        className={`bg-white transition-colors hover:bg-slate-50/80 ${
          isProjectEnd
            ? `border-b ${projectTone.end}`
            : "border-b border-slate-100"
        } ${
          isSelected ? "bg-primary/5" : ""
        }`}
      >
        <td
          className={`w-12 border-l-2 p-3.5 text-center ${projectTone.rail}`}
        >
          <Checkbox
            checked={isSelected}
            disabled={entry.status !== "submitted" || isActionPending}
            aria-label={selectLabel}
            onChange={() => onSelect(entry.id)}
            className="cursor-pointer disabled:opacity-40"
          />
        </td>

        <td className="p-3.5 font-medium text-slate-900 w-[200px]">
          <Tooltip content={userDisplay}>
            <span className="truncate block max-w-[190px]">{userDisplay}</span>
          </Tooltip>
        </td>

        <td className="p-3.5 text-slate-500 font-mono text-xs whitespace-nowrap w-[110px]">
          {entry.work_date}
        </td>

        <td className="p-3.5 text-slate-600">
          <Tooltip content={entry.description || "—"}>
            <span className="block truncate">
              {entry.description || "—"}
            </span>
          </Tooltip>
        </td>

        <td className="p-3.5 text-right font-mono font-bold text-slate-900 w-[100px]">
          {entry.hours_logged}h
        </td>

        <td className="p-3.5 whitespace-nowrap w-[120px]">
          <StatusBadge status={entry.status} label={statusLabel} />
        </td>

        <td className="p-3.5 text-right w-[110px]">
          <div className="flex items-center justify-end gap-1">
            {entry.status === "submitted" && (
              <>
                <Tooltip content={rejectLabel}>
                  <button
                    type="button"
                    onClick={() => onOpenReject(entry.id)}
                    disabled={isActionPending}
                    className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </Tooltip>
                <Tooltip content={approveLabel}>
                  <button
                    type="button"
                    onClick={() => onApprove(entry.id)}
                    disabled={isActionPending}
                    className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </Tooltip>
              </>
            )}
            {entry.status === "approved" && (
              <Tooltip content={revertLabel}>
                <button
                  type="button"
                  onClick={() => onRevert(entry.id)}
                  disabled={isActionPending}
                  className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
          </div>
        </td>
      </tr>
    );
  },
);

EntryRow.displayName = "EntryRow";
