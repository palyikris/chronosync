import React from "react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DatePicker } from "../shared/DatePicker";

interface DashboardHeaderProps {
  startDate: string;
  endDate: string;
  isDateRangeValid: boolean;
  isRefreshing: boolean;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  startDate,
  endDate,
  isDateRangeValid,
  isRefreshing,
  onStartDateChange,
  onEndDateChange,
}) => {
  const { t } = useTranslation();

  return (
    <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-text sm:text-[28px]">
          {t("dashboard.pageTitle")}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {t("dashboard.pageSubtitle")}
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end xl:w-auto">
        <div
          className={`flex min-w-0 flex-1 flex-col gap-2 rounded-2xl border p-2.5 shadow-[0_1px_2px_rgba(75,87,57,0.04)] sm:flex-none sm:flex-row sm:items-end ${
            isDateRangeValid
              ? "border-border bg-surface/55"
              : "border-danger-border bg-danger-bg/45"
          }`}
        >
          <DatePicker
            value={startDate}
            max={endDate || undefined}
            invalid={!isDateRangeValid}
            ariaLabel={t("dashboard.startDateLabel")}
            label={t("dashboard.startDateLabel")}
            onChange={onStartDateChange}
            className="min-w-0 flex-1 sm:w-[10.5rem] sm:flex-none"
            buttonClassName="bg-white/55"
          />

          <span
            className="flex h-6 shrink-0 items-center justify-center text-primary-strong/65 sm:mb-0 sm:h-11 sm:w-6"
            aria-hidden="true"
          >
            <ArrowRight className="h-4 w-4 rotate-90 sm:rotate-0" />
          </span>

          <DatePicker
            value={endDate}
            min={startDate || undefined}
            invalid={!isDateRangeValid}
            ariaLabel={t("dashboard.endDateLabel")}
            label={t("dashboard.endDateLabel")}
            onChange={onEndDateChange}
            align="end"
            className="min-w-0 flex-1 sm:w-[10.5rem] sm:flex-none"
            buttonClassName="bg-white/55"
          />
        </div>
        {isRefreshing ? (
          <span
            role="status"
            aria-live="polite"
            className="text-center text-[11px] font-medium text-muted sm:text-left"
          >
            {t("dashboard.refreshing")}
          </span>
        ) : null}
      </div>
    </header>
  );
};
