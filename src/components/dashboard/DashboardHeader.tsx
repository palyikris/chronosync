import React from "react";
import { Calendar, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { InvoiceAttachmentModal } from "./InvoiceAttachmentModal";

interface DashboardHeaderProps {
  startDate: string;
  endDate: string;
  isDateRangeValid: boolean;
  isRefreshing: boolean;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  companyId: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  startDate,
  endDate,
  isDateRangeValid,
  isRefreshing,
  onStartDateChange,
  onEndDateChange,
  companyId,
}) => {
  const { t, i18n } = useTranslation();
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = React.useState(false);
  const language = i18n.resolvedLanguage || i18n.language || "en";

  return (
    <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-text sm:text-[28px]">
          {t("dashboard.pageTitle")}
        </h1>
        <p className="mt-1.5 text-sm text-muted">{t("dashboard.pageSubtitle")}</p>
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto">
        <div
          className={`flex min-h-10 min-w-0 flex-1 items-center gap-1 rounded-[10px] border bg-white/50 p-1 text-[12px] shadow-[0_1px_2px_rgba(75,87,57,0.04)] sm:flex-none sm:gap-2 ${
            isDateRangeValid ? "border-border-strong" : "border-red-300"
          }`}
        >
          <Calendar
            className="ml-1 hidden h-4 w-4 shrink-0 text-primary-strong min-[390px]:block sm:ml-2"
            aria-hidden="true"
          />
          <label className="min-w-0 flex-1 sm:flex-none">
            <span className="sr-only">{t("dashboard.startDateLabel")}</span>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              aria-invalid={!isDateRangeValid}
              onChange={(event) => onStartDateChange(event.target.value)}
              className="w-full min-w-0 border-none bg-transparent px-1 text-xs font-semibold text-text outline-none sm:w-[8.4rem]"
            />
          </label>
          <span className="shrink-0 text-border-strong" aria-hidden="true">
            —
          </span>
          <label className="min-w-0 flex-1 sm:flex-none">
            <span className="sr-only">{t("dashboard.endDateLabel")}</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              aria-invalid={!isDateRangeValid}
              onChange={(event) => onEndDateChange(event.target.value)}
              className="w-full min-w-0 border-none bg-transparent px-1 text-xs font-semibold text-text outline-none sm:w-[8.4rem]"
            />
          </label>
        </div>
        <Button
          onClick={() => setIsInvoiceModalOpen(true)}
          icon={<Download className="h-4 w-4" />}
          className="w-full sm:w-auto"
          disabled={!isDateRangeValid}
        >
          {t("dashboard.downloadReport")}
        </Button>
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

      <InvoiceAttachmentModal
        open={isInvoiceModalOpen}
        companyId={companyId}
        startDate={startDate}
        endDate={endDate}
        language={language}
        onClose={() => setIsInvoiceModalOpen(false)}
      />
    </header>
  );
};
