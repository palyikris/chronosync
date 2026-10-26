import React from "react";
import type { TFunction } from "i18next";
import { Checkbox } from "../shared/Checkbox";

interface ReviewTableHeaderProps {
  t: TFunction;
  isAllActivePageSelected: boolean;
  isSelectionDisabled: boolean;
  onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ReviewTableHeader: React.FC<ReviewTableHeaderProps> = ({
  t,
  isAllActivePageSelected,
  isSelectionDisabled,
  onSelectAll,
}) => (
  <thead>
    <tr className="bg-primary/15 border-b border-primary-strong/20 text-muted text-xs font-semibold uppercase tracking-wider">
      <th className="p-3.5 w-12 text-center">
        <Checkbox
          checked={isAllActivePageSelected}
          disabled={isSelectionDisabled}
          aria-label={t(
            "timesheetReview.selectAllVisible",
            "Select all entries on this page",
          )}
          onChange={onSelectAll}
          className="cursor-pointer disabled:opacity-40"
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
