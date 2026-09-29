import React from "react";
import { Check, Undo2, X } from "lucide-react";
import { Tooltip } from "../shared/Tooltip";
import { StatusBadge } from "./StatusBadge";
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
  }) => {
    const userDisplay =
      entry.profiles?.full_name || entry.profiles?.email || entry.user_id;

    return (
      <tr
        className={`hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0 ${
          isSelected ? "bg-primary/5" : ""
        }`}
      >
        <td className="p-3.5 text-center w-12">
          <input
            type="checkbox"
            checked={isSelected}
            aria-label={selectLabel}
            onChange={() => onSelect(entry.id)}
            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer accent-primary"
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
            <span className="truncate block max-w-[340px]">
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
                    className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </Tooltip>
                <Tooltip content={approveLabel}>
                  <button
                    type="button"
                    onClick={() => onApprove(entry.id)}
                    className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
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
                  className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
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
