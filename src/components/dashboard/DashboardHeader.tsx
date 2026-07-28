import React from "react";
import { Calendar, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { downloadSzamlamellekletReport } from "../../utils/downloadExcelReport";

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
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const previousMonthStartDate = (() => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  })();
  const previousMonthEndDate = (() => {
    const date = new Date();
    date.setDate(0);
    return date.toISOString().split("T")[0];
  })();

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text">
          {t("dashboard.pageTitle")}
        </h1>
        <p className="text-sm text-muted mt-1">{t("dashboard.pageSubtitle")}</p>
      </div>

      <div className="flex items-center gap-2 bg-white p-1.5 border border-border-strong rounded-2xl shadow-sm text-sm">
        <Calendar className="w-4 h-4 text-muted ml-2" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="border-none bg-transparent outline-none text-text font-semibold text-xs cursor-pointer"
        />
        <span className="text-border-strong">—</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="border-none bg-transparent outline-none text-text font-semibold text-xs cursor-pointer pr-2"
        />
      </div>

      <div className="w-full flex items-center justify-end fixed bottom-0 left-0 right-0 px-8 py-4">
        <Button
          onClick={() => {
            downloadSzamlamellekletReport({
              companyId,
              startDate: previousMonthStartDate,
              endDate: previousMonthEndDate,
              language,
            });
          }}
          icon={<Download className="h-4 w-4" />}
        >
          {t("dashboard.downloadReport")}
        </Button>
      </div>
    </header>
  );
};
