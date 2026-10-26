import React from "react";
import { Filter, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/useAuth";
import { PopoverPanel } from "../shared/PopoverPanel";
import { usePopoverDismiss } from "../../hooks/usePopoverDismiss";

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
  const root = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const popoverId = React.useId();
  usePopoverDismiss(isOpen, root, trigger, onToggle);
  const hasActiveFilters = filters.role !== "all" || filters.status !== "all" || Boolean(filters.company?.trim());
  const { profile } = useAuth();

  return (
    <div ref={root} className="relative inline-block text-left">
      <button
        ref={trigger}
        id={`${popoverId}-trigger`}
        type="button"
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
        onClick={onToggle}
        className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition text-sm font-medium ${
          hasActiveFilters
            ? "border-primary-strong bg-primary/30 text-primary-foreground font-semibold"
            : "border-border-strong bg-white hover:bg-slate-100 text-muted"
        }`}
      >
        <Filter className="w-4 h-4" />
        {t("users.filters")}
        {hasActiveFilters && (
          <span className="h-2 w-2 rounded-full bg-primary-strong" />
        )}
      </button>

      {isOpen && (
        <PopoverPanel id={popoverId} trigger={trigger} title={t("users.filterMembers")} width={256}>
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
            <span className="text-sm font-bold text-text">
              {t("users.filterMembers")}
            </span>
            {hasActiveFilters && (
              <button
                onClick={onReset}
                className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" /> {t("users.resetFilters")}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Filter by Role */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">
                {t("users.role")}
              </label>
              <select
                aria-label={t("users.role")}
                value={filters.role}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    role: e.target.value as UserFilterState["role"],
                  })
                }
                className="w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary-strong"
              >
                <option value="all">{t("users.allRoles")}</option>
                <option value="regular">{t("users.regularUsers")}</option>
                <option value="company_admin">{t("users.companyAdmins")}</option>
              </select>
            </div>

            {/* Filter by Status */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted">
                {t("users.status")}
              </label>
              <select
                aria-label={t("users.status")}
                value={filters.status}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    status: e.target.value as UserFilterState["status"],
                  })
                }
                className="w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary-strong"
              >
                <option value="all">{t("users.allStatuses")}</option>
                <option value="active">{t("users.activeOnly")}</option>
                <option value="inactive">{t("users.inactiveOnly")}</option>
              </select>
            </div>

            {/* Optional Filter by Company for Super Admins */}
            {profile?.role === "super_admin" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted">
                  {t("users.company")}
                </label>
                <input
                  type="text"
                  aria-label={t("users.company")}
                  value={filters.company ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...filters,
                      company: e.target.value,
                    })
                  }
                  placeholder={t("users.companyPlaceholder")}
                  className="w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary-strong"
                />
              </div>
            )}
          </div>
        </PopoverPanel>
      )}
    </div>
  );
};
