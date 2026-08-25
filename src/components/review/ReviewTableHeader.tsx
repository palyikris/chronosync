import React from "react";

interface ReviewTableHeaderProps {
  t: any;
  isAllActivePageSelected: boolean;
  onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ReviewTableHeader: React.FC<ReviewTableHeaderProps> = ({
  t,
  isAllActivePageSelected,
  onSelectAll,
}) => (
  <thead>
    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
      <th className="p-3.5 w-12 text-center">
        <input
          type="checkbox"
          checked={isAllActivePageSelected}
          aria-label={t(
            "timesheetReview.selectAllVisible",
            "Select all entries on this page",
          )}
          onChange={onSelectAll}
          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer accent-primary"
        />
      </th>
      <th className="p-3.5 font-medium w-[200px]">
        {t("review.colEmployee", "Employee")}
      </th>
      <th className="p-3.5 font-medium w-[110px]">
        {t("review.colDate", "Date")}
      </th>
      <th className="p-3.5 font-medium">
        {t("review.colDescription", "Description")}
      </th>
      <th className="p-3.5 font-medium text-right w-[100px]">
        {t("review.colDuration", "Duration")}
      </th>
      <th className="p-3.5 font-medium w-[120px]">
        {t("review.colStatus", "Status")}
      </th>
      <th className="p-3.5 font-medium text-right w-[110px]">
        {t("review.colActions", "Actions")}
      </th>
    </tr>
  </thead>
);
