import React from "react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";

interface CompanyManagementHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterActiveOnly: boolean;
  onFilterToggle: () => void;
  onAddClick: () => void;
}

export const CompanyManagementHeader: React.FC<CompanyManagementHeaderProps> = ({
  searchQuery,
  onSearchChange,
  filterActiveOnly,
  onFilterToggle,
  onAddClick,
}) => {
  const { t } = useTranslation();

  return (
    <header className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-medium text-primary-strong">
            {t("companyManagement.directory")}
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-text sm:text-[28px]">
            {t("companyManagement.title")}
          </h1>
          <p className="mt-1.5 text-sm text-muted">{t("companyManagement.subtitle")}</p>
        </div>
        <Button onClick={onAddClick} icon={<Plus className="h-4 w-4" />}>
          {t("companyManagement.addCompany")}
        </Button>
      </div>

      <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface-strong/80 p-2.5 shadow-card backdrop-blur-xl sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("companyManagement.searchPlaceholder")}
              className="h-9 w-full rounded-[10px] border border-border-strong bg-white/45 pl-9 pr-3 text-[13px] outline-none transition focus:border-primary-strong/40 focus:bg-white/80 focus:ring-3 focus:ring-primary/12"
            />
          </div>

          <button
            type="button"
            onClick={onFilterToggle}
            className={`flex h-9 items-center justify-center gap-1.5 rounded-[10px] border px-3 text-[12px] font-medium transition ${
              filterActiveOnly
                ? "border-primary-strong/30 bg-primary/20 text-primary-strong"
                : "border-border-strong bg-white text-muted-strong hover:bg-bg"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {filterActiveOnly
              ? t("companyManagement.activeOnly")
              : t("companyManagement.allCompanies")}
          </button>
      </div>
    </header>
  );
};
