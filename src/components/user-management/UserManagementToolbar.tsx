import React from "react";
import { Search, Download } from "lucide-react";
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
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative flex-1 w-full max-w-md">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#C4C7C5]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-2.5 border border-[#C4C7C5] rounded-xl bg-white focus:ring-2 focus:ring-[#4e6700] outline-none text-sm"
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
          className="flex items-center gap-2 px-4 py-2.5 border border-[#C4C7C5] bg-white rounded-xl hover:bg-[#e7e8e9] transition text-sm font-medium text-[#5e5e62]"
        >
          <Download className="w-4 h-4" /> Export
        </button>
      </div>
    </div>
  );
};
