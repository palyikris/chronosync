import React from "react";
import { Calendar, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { InvoiceAttachmentModal } from "./InvoiceAttachmentModal";

interface DashboardHeaderProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  companyId: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  startDate,
  endDate,
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
        <div className="flex min-h-9 flex-1 items-center gap-2 rounded-[10px] border border-border-strong bg-white/50 p-1 text-[12px] shadow-[0_1px_2px_rgba(75,87,57,0.04)] sm:flex-none">
          <Calendar className="ml-2 h-4 w-4 shrink-0 text-primary-strong" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="min-w-0 border-none bg-transparent text-xs font-bold text-text outline-none"
          />
          <span className="text-border-strong">—</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="min-w-0 border-none bg-transparent pr-2 text-xs font-bold text-text outline-none"
          />
        </div>
        <Button
          onClick={() => setIsInvoiceModalOpen(true)}
          icon={<Download className="h-4 w-4" />}
          className="w-full sm:w-auto"
        >
          {t("dashboard.downloadReport")}
        </Button>
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
