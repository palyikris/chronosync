import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Clock, Users } from "lucide-react";
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

const getStartOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};

const getEndOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];
};

const getEndOfMonthForDate = (dateValue: string) => {
  const [year, month] = dateValue.split("-").map(Number);

  if (!year || !month) {
    return dateValue;
  }

  return new Date(year, month, 0).toISOString().split("T")[0];
};

const getDateRangeStorageKey = (companyId: string) =>
  `chronosync:dashboard:date-range:${companyId}`;

const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const readStoredDateRange = (companyId: string) => {
  if (typeof window === "undefined") {
    return null;
  }

  const storedValue = window.localStorage.getItem(
    getDateRangeStorageKey(companyId),
  );

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as {
      startDate?: string;
      endDate?: string;
    };

    if (
      parsedValue.startDate &&
      parsedValue.endDate &&
      isValidDate(parsedValue.startDate) &&
      isValidDate(parsedValue.endDate)
    ) {
      return {
        startDate: parsedValue.startDate,
        endDate: parsedValue.endDate,
      };
    }
  } catch {
    window.localStorage.removeItem(getDateRangeStorageKey(companyId));
  }

  return null;
};

interface DashboardContentProps {
  companyId: string;
}

const DashboardContent: React.FC<DashboardContentProps> = ({ companyId }) => {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState(() => {
    return readStoredDateRange(companyId)?.startDate ?? getStartOfMonth();
  });
  const [endDate, setEndDate] = useState(() => {
    return readStoredDateRange(companyId)?.endDate ?? getEndOfMonth();
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      getDateRangeStorageKey(companyId),
      JSON.stringify({ startDate, endDate }),
    );
  }, [companyId, endDate, startDate]);

  const handleStartDateChange = (value: string) => {
    const previousStartMonth = startDate.slice(0, 7);
    const nextStartMonth = value.slice(0, 7);

    setStartDate(value);

    if (previousStartMonth !== nextStartMonth) {
      setEndDate(getEndOfMonthForDate(value));
    }
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["adminDashboard", companyId, startDate, endDate],
    queryFn: () => fetchAdminDashboardData(companyId, startDate, endDate),
    enabled: Boolean(companyId),
  });

  const kpis = data?.kpis;
  const dailyTrends = data?.dailyTrends || [];
  const activeLoggerText = `${kpis?.activeLoggersCount ?? 0} / ${kpis?.totalActiveMembers ?? 0}`;
  const capacityUtilization = `${kpis?.capacityUtilizationPct ?? 0}%`;

  const summaryCardItems: KpiSummaryCardItem[] = [
    {
      title: t("dashboard.kpiTotalHours"),
      value: kpis?.totalLoggedHours ?? 0,
      subtitle: t("dashboard.kpiTotalHoursSubtitle"),
      icon: Clock,
      valueSuffix: " hrs",
    },
    {
      title: t("dashboard.kpiActiveRate"),
      value: activeLoggerText,
      subtitle: t("dashboard.kpiActiveRateSubtitle"),
      icon: Users,
    },
    {
      title: t("dashboard.kpiCapacity"),
      value: capacityUtilization,
      icon: Briefcase,
      className: "col-span-1 sm:col-span-2 lg:col-span-1",
      footer: (
        <div className="w-full bg-[#e7e8e9] h-2 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-primary-strong h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, kpis?.capacityUtilizationPct || 0)}%`,
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full mx-auto space-y-8 pb-12">
      <DashboardHeader
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={setEndDate}
        companyId={companyId}
      />

      {isLoading ? (
        <div className="flex justify-center items-center py-24 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-strong"></div>
        </div>
      ) : isError ? (
        <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm">
          {t("dashboard.failedToLoad")} {(error as Error).message}
        </div>
      ) : (
        <>
          <KpiSummaryCards items={summaryCardItems} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProjectBreakdownPanel
              breakdown={data?.clientProjectBreakdown || []}
            />
            <UserBreakdownPanel breakdown={data?.userBreakdown || []} />
          </div>

          <ProjectUtilizationPanel
            groups={data?.clientProjectUtilization || []}
          />

          <DailyTrendChart dailyTrends={dailyTrends} />
        </>
      )}
    </div>
  );
};

export const AdminDashboardPage: React.FC = () => {
  const { profile } = useAuth();
  if (!profile?.company_id) {
    return (
      <div className="flex justify-center items-center py-24 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-strong"></div>
      </div>
    );
  }

  return (
    <DashboardContent key={profile.company_id} companyId={profile.company_id} />
  );
};
