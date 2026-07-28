import React from "react";
import { Briefcase, Clock, Users, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DashboardKPIs } from "../../types/dashboard";

interface KpiSummaryCardsProps {
  kpis?: DashboardKPIs;
}

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconClassName?: string;
  valueSuffix?: string;
  valuePrefix?: string;
  className?: string;
  footer?: React.ReactNode;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClassName = "text-[#4e6700]",
  valueSuffix,
  valuePrefix,
  className = "",
  footer,
}) => {
  return (
    <div
      className={`bg-white p-6 rounded-2xl border border-border-strong shadow-sm flex flex-col justify-between ${className}`.trim()}
    >
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
          {title}
        </span>
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary-foreground">
          <Icon className={`w-5 h-5 ${iconClassName}`} />
        </div>
      </div>
      <div className="mt-4">
        <div className="text-3xl font-extrabold text-text">
          {valuePrefix}
          {value}
          {valueSuffix}
        </div>
        {subtitle ? (
          <p className="text-xs text-muted mt-2 font-medium">{subtitle}</p>
        ) : null}
        {footer ? <div className="mt-2">{footer}</div> : null}
      </div>
    </div>
  );
};

export const KpiSummaryCards: React.FC<KpiSummaryCardsProps> = ({ kpis }) => {
  const { t } = useTranslation();
  const totalLoggedHours = kpis?.totalLoggedHours?.toFixed(1) ?? "0.0";
  const activeLoggerText = `${kpis?.activeLoggersCount ?? 0} / ${kpis?.totalActiveMembers ?? 0}`;
  const capacityUtilization = `${kpis?.capacityUtilizationPct ?? 0}%`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <KpiCard
        title={t("dashboard.kpiTotalHours")}
        value={totalLoggedHours}
        subtitle={t("dashboard.kpiTotalHoursSubtitle")}
        icon={Clock}
        valueSuffix=" hrs"
        // footer={
        //   <div className="flex items-center gap-1 text-xs text-primary-strong font-medium">
        //     <TrendingUp className="w-3.5 h-3.5" />{" "}
        //     {t("dashboard.kpiTotalHoursFooter")}
        //   </div>
        // }
      />

      <KpiCard
        title={t("dashboard.kpiActiveRate")}
        value={activeLoggerText}
        subtitle={t("dashboard.kpiActiveRateSubtitle")}
        icon={Users}
      />

      <KpiCard
        title={t("dashboard.kpiCapacity")}
        value={capacityUtilization}
        icon={Briefcase}
        className="col-span-1 sm:col-span-2 lg:col-span-1"
        footer={
          <div className="w-full bg-[#e7e8e9] h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-primary-strong h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, kpis?.capacityUtilizationPct || 0)}%`,
              }}
            />
          </div>
        }
      />
    </div>
  );
};
