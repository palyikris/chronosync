import React from "react";
import { Search, SlidersHorizontal } from "lucide-react";

interface CompanyManagementHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterActiveOnly: boolean;
  onFilterToggle: () => void;
}

export const CompanyManagementHeader: React.FC<CompanyManagementHeaderProps> = ({
  searchQuery,
  onSearchChange,
  filterActiveOnly,
  onFilterToggle,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-[#C4C7C5] bg-white px-6 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4e6700] text-white">
            <span className="material-symbols-outlined">account_tree</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#191c1d]">ChronoTrack</p>
            <p className="text-xs text-[#5e5e62]">Company directory</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
          <div className="relative flex-1 w-full sm:min-w-[280px]">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#C4C7C5]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search companies..."
              className="w-full pl-10 pr-4 py-2.5 border border-[#C4C7C5] rounded-xl bg-white focus:ring-2 focus:ring-[#4e6700] outline-none text-sm"
            />
          </div>

          <button
            type="button"
            onClick={onFilterToggle}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl transition text-sm font-medium ${
              filterActiveOnly
                ? "border-[#4e6700] bg-[#e8f5c2] text-[#4e6700]"
                : "border-[#C4C7C5] bg-white text-[#5e5e62] hover:bg-[#e7e8e9]"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {filterActiveOnly ? "Active Only" : "All Companies"}
          </button>
        </div>
      </div>
    </header>
  );
};
