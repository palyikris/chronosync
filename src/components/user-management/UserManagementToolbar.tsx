import React from "react";
import { Search, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserFilterPopover } from "./UserFilterPopover";
import type { UserFilterState } from "./UserFilterPopover";

interface UserManagementToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: UserFilterState;
  onFiltersChange: (value: UserFilterState) => void;
  isFilterPopoverOpen: boolean;
  onFilterPopoverToggle: () => void;
  onFiltersReset: () => void;
}

export const UserManagementToolbar: React.FC<UserManagementToolbarProps> = ({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  isFilterPopoverOpen,
  onFilterPopoverToggle,
  onFiltersReset,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative flex-1 w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("users.searchPlaceholder")}
          className="w-full rounded-xl border border-border-strong bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary-strong"
        />
      </div>

      <div className="flex gap-2 w-full sm:w-auto">
        <UserFilterPopover
          filters={filters}
          onChange={onFiltersChange}
          isOpen={isFilterPopoverOpen}
          onToggle={onFilterPopoverToggle}
          onReset={onFiltersReset}
        />
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-border-strong bg-white px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-slate-100"
        >
          <Download className="w-4 h-4" /> {t("users.export")}
        </button>
      </div>
    </div>
  );
};
