import React from "react";
import { Check } from "lucide-react";

interface ReviewBulkActionsBarProps {
  selectedCount: number;
  isPending: boolean;
  onApprove: () => void;
  t: any;
}

export const ReviewBulkActionsBar: React.FC<ReviewBulkActionsBarProps> = ({
  selectedCount,
  isPending,
  onApprove,
  t,
}) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="sticky top-4 z-20 flex items-center justify-between bg-slate-900 text-white rounded-xl px-5 py-3 shadow-lg transition-all">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="bg-white/20 px-2.5 py-0.5 rounded text-xs font-bold">
          {selectedCount}
        </span>
        <span>{t("common.itemsSelected", "items selected")}</span>
      </div>
      <button
        type="button"
        onClick={onApprove}
        disabled={isPending}
        className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
      >
        <Check className="w-4 h-4" />
        {t("review.approveSelected", "Approve Selected")}
      </button>
    </div>
  );
};
