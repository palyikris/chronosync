import React from "react";
import { Filter, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/useAuth";

export interface UserFilterState {
  role: "all" | "company_admin" | "regular";
  status: "all" | "active" | "inactive";
  company?: string; // Optional company filter for super_admins
}

interface UserFilterPopoverProps {
  filters: UserFilterState;
  onChange: (newFilters: UserFilterState) => void;
  isOpen: boolean;
  onToggle: () => void;
  onReset: () => void;
}

export const UserFilterPopover: React.FC<UserFilterPopoverProps> = ({
  filters,
  onChange,
  isOpen,
  onToggle,
  onReset,
}) => {
  const { t } = useTranslation();
  const hasActiveFilters = filters.role !== "all" || filters.status !== "all";
  const { profile } = useAuth();

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition text-sm font-medium ${
          hasActiveFilters
            ? "border-[#4e6700] bg-[#abdb11]/20 text-[#151f00] font-semibold"
            : "border-[#C4C7C5] bg-white hover:bg-[#e7e8e9] text-[#5e5e62]"
        }`}
      >
        <Filter className="w-4 h-4" />
        {t("users.filters")}
        {hasActiveFilters && (
          <span className="w-2 h-2 rounded-full bg-[#4e6700]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-[#C4C7C5] shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
            <span className="font-bold text-sm text-[#191c1d]">
              {t("users.filterMembers")}
            </span>
            {hasActiveFilters && (
              <button
                onClick={onReset}
                className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" /> {t("common.cancel")}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Filter by Role */}
            <div>
              <label className="block text-xs font-semibold text-[#5e5e62] mb-1.5">
                {t("users.role")}
              </label>
              <select
                value={filters.role}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    role: e.target.value as UserFilterState["role"],
                  })
                }
                className="w-full px-3 py-2 border border-[#C4C7C5] rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#4e6700] bg-white"
              >
                <option value="all">{t("users.allRoles")}</option>
                <option value="regular">{t("users.regularUsers")}</option>
                <option value="admin">{t("users.companyAdmins")}</option>
              </select>
            </div>

            {/* Filter by Status */}
            <div>
              <label className="block text-xs font-semibold text-[#5e5e62] mb-1.5">
                {t("users.status")}
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    status: e.target.value as UserFilterState["status"],
                  })
                }
                className="w-full px-3 py-2 border border-[#C4C7C5] rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#4e6700] bg-white"
              >
                <option value="all">{t("users.allStatuses")}</option>
                <option value="active">{t("users.activeOnly")}</option>
                <option value="inactive">{t("users.inactiveOnly")}</option>
              </select>
            </div>

            {/* Optional Filter by Company for Super Admins */}
            {profile?.role === "super_admin" && (
              <div>
                <label className="block text-xs font-semibold text-[#5e5e62] mb-1.5">
                  {t("users.company")}
                </label>
                <input
                  type="text"
                  value={filters.company}
                  onChange={(e) =>
                    onChange({
                      ...filters,
                      company: e.target.value,
                    })
                  }
                  placeholder={t("users.companyPlaceholder")}
                  className="w-full px-3 py-2 border border-[#C4C7C5] rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#4e6700] bg-white"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
