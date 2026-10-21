import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Clock, RefreshCw, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchAdminDashboardData } from "../services/dashboardService";
import { useAuth } from "../context/useAuth";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import {
  KpiSummaryCards,
  type KpiSummaryCardItem,
} from "../components/shared/KpiSummaryCards";
import { DailyTrendChart } from "../components/dashboard/DailyTrendChart";
import { UserBreakdownPanel } from "../components/dashboard/UserBreakdownPanel";
import { ProjectBreakdownPanel } from "../components/dashboard/ProjectBreakdownPanel";
import { ProjectUtilizationPanel } from "../components/dashboard/ProjectUtilizationPanel";
import { Button } from "../components/shared/Button";
import {
  getCurrentMonthDateRange,
  getEndOfMonthForDashboardDate,
  isValidDashboardDate,
  isValidDashboardDateRange,
} from "../utils/dashboardCalculations";

interface DashboardDateRange {
  startDate: string;
  endDate: string;
}

const getDateRangeStorageKey = (companyId: string) =>
  `chronosync:dashboard:date-range:${companyId}`;

const readStoredDateRange = (companyId: string): DashboardDateRange | null => {
  if (typeof window === "undefined") return null;

  try {
    const storageKey = getDateRangeStorageKey(companyId);
    const storedValue = window.localStorage.getItem(storageKey);
    if (!storedValue) return null;

    const parsedValue = JSON.parse(storedValue) as Partial<DashboardDateRange>;
    if (
      typeof parsedValue.startDate === "string" &&
      typeof parsedValue.endDate === "string" &&
      isValidDashboardDateRange(parsedValue.startDate, parsedValue.endDate)
    ) {
      return {
        startDate: parsedValue.startDate,
        endDate: parsedValue.endDate,
      };
    }

    window.localStorage.removeItem(storageKey);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }

  return null;
};

const DashboardLoadingState: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t("dashboard.loadingDashboard")}
      className="space-y-5"
    >
      <span className="sr-only">{t("dashboard.loadingDashboard")}</span>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-36 animate-pulse rounded-2xl border border-border bg-surface-strong/70 motion-reduce:animate-none"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {[0, 1].map((item) => (
          <div
            key={item}
            className="h-80 animate-pulse rounded-2xl border border-border bg-surface-strong/70 motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
};

interface DashboardContentProps {
  companyId: string;
}

const DashboardContent: React.FC<DashboardContentProps> = ({ companyId }) => {
  const { t, i18n } = useTranslation();
  const [dateRange, setDateRange] = useState<DashboardDateRange>(() =>
    readStoredDateRange(companyId) ?? getCurrentMonthDateRange(),
  );
  const { startDate, endDate } = dateRange;
  const isDateRangeValid = isValidDashboardDateRange(startDate, endDate);

  useEffect(() => {
    if (typeof window === "undefined" || !isDateRangeValid) return;

    try {
      window.localStorage.setItem(
        getDateRangeStorageKey(companyId),
        JSON.stringify(dateRange),
      );
    } catch {
      // The dashboard remains functional when local storage is unavailable.
    }
  }, [companyId, dateRange, isDateRangeValid]);

  const handleStartDateChange = (value: string) => {
    setDateRange((current) => {
      if (!isValidDashboardDate(value)) {
        return { ...current, startDate: value };
      }

      const currentRangeIsWholeMonth =
        current.endDate ===
        getEndOfMonthForDashboardDate(current.startDate);
      const monthChanged = current.startDate.slice(0, 7) !== value.slice(0, 7);
      let nextEndDate = current.endDate;

      if (currentRangeIsWholeMonth && monthChanged) {
        nextEndDate = getEndOfMonthForDashboardDate(value);
      } else if (
        isValidDashboardDate(current.endDate) &&
        value > current.endDate
      ) {
        nextEndDate = value;
      }

      return { startDate: value, endDate: nextEndDate };
    });
  };

  const handleEndDateChange = (value: string) => {
    setDateRange((current) => ({ ...current, endDate: value }));
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["adminDashboard", companyId, startDate, endDate],
    queryFn: () => fetchAdminDashboardData(companyId, startDate, endDate),
    enabled: Boolean(companyId) && isDateRangeValid,
    placeholderData: (previousData) => previousData,
  });

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.resolvedLanguage || i18n.language, {
        maximumFractionDigits: 1,
      }),
    [i18n.language, i18n.resolvedLanguage],
  );

  const kpis = data?.kpis;
  const capacityUtilizationPct = kpis?.capacityUtilizationPct ?? 0;
  const capacityBarTone =
    capacityUtilizationPct > 100
      ? "bg-red-500"
      : capacityUtilizationPct >= 85
        ? "bg-amber-400"
        : "bg-primary-strong";

  const summaryCardItems: KpiSummaryCardItem[] = [
    {
      title: t("dashboard.kpiTotalHours"),
      value: kpis?.totalLoggedHours ?? 0,
      subtitle: t("dashboard.kpiTotalHoursSubtitle"),
      icon: Clock,
      valueSuffix: t("dashboard.hoursSuffix"),
      valueDecimals: 1,
    },
    {
      title: t("dashboard.kpiActiveRate"),
      value: kpis?.activeLoggerRatePct ?? 0,
      valueSuffix: "%",
      subtitle: t("dashboard.kpiActiveRateDetail", {
        active: kpis?.activeLoggersCount ?? 0,
        total: kpis?.totalActiveMembers ?? 0,
      }),
      icon: Users,
    },
    {
      title: t("dashboard.kpiCapacity"),
      value: capacityUtilizationPct,
      valueSuffix: "%",
      subtitle: t("dashboard.kpiCapacityDetail", {
        logged: numberFormatter.format(kpis?.totalLoggedHours ?? 0),
        capacity: numberFormatter.format(kpis?.expectedCapacityHours ?? 0),
      }),
      icon: Briefcase,
      className: "col-span-1 sm:col-span-2 lg:col-span-1",
      footer: (
        <div
          role="progressbar"
          aria-label={t("dashboard.kpiCapacity")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, Math.max(0, capacityUtilizationPct))}
          aria-valuetext={`${capacityUtilizationPct}%`}
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className={`${capacityBarTone} h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none`}
            style={{
              width: `${Math.min(100, Math.max(0, capacityUtilizationPct))}%`,
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full space-y-6 pb-10">
      <DashboardHeader
        startDate={startDate}
        endDate={endDate}
        isDateRangeValid={isDateRangeValid}
        isRefreshing={isFetching && !isLoading}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        companyId={companyId}
      />

      {!isDateRangeValid ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
        >
          {t("dashboard.invalidDateRange")}
        </div>
      ) : isLoading ? (
        <DashboardLoadingState />
      ) : isError ? (
        <div
          role="alert"
          className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 sm:flex-row sm:items-center"
        >
          <span>{t("dashboard.failedToLoad")}</span>
          <Button
            variant="outline"
            onClick={() => void refetch()}
            icon={<RefreshCw />}
          >
            {t("common.retry")}
          </Button>
        </div>
      ) : (
        <>
          <KpiSummaryCards items={summaryCardItems} />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ProjectBreakdownPanel
              breakdown={data?.clientProjectBreakdown ?? []}
            />
            <UserBreakdownPanel breakdown={data?.userBreakdown ?? []} />
          </div>

          <ProjectUtilizationPanel
            groups={data?.clientProjectUtilization ?? []}
          />

          <DailyTrendChart dailyTrends={data?.dailyTrends ?? []} />
        </>
      )}
    </div>
  );
};

export const AdminDashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useTranslation();

  if (!profile?.company_id) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800"
      >
        {t("dashboard.companyRequired")}
      </div>
    );
  }

  return (
    <DashboardContent key={profile.company_id} companyId={profile.company_id} />
  );
};
