import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchAdminDashboardData } from "../services/dashboardService";
import { useAuth } from "../context/useAuth";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { KpiSummaryCards } from "../components/dashboard/KpiSummaryCards";
import { DailyTrendChart } from "../components/dashboard/DailyTrendChart";
import { UserBreakdownPanel } from "../components/dashboard/UserBreakdownPanel";
import { ProjectBreakdownPanel } from "../components/dashboard/ProjectBreakdownPanel";
import { ProjectUtilizationPanel } from "../components/dashboard/ProjectUtilizationPanel";

export const AdminDashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useTranslation();

  const getStartOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  };

  const getEndOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
  };

  const [startDate, setStartDate] = useState(getStartOfMonth());
  const [endDate, setEndDate] = useState(getEndOfMonth());

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["adminDashboard", profile?.company_id, startDate, endDate],
    queryFn: () =>
      fetchAdminDashboardData(profile?.company_id || "", startDate, endDate),
    enabled: !!profile?.company_id,
  });

  const kpis = data?.kpis;
  const dailyTrends = data?.dailyTrends || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <DashboardHeader
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        companyId={profile?.company_id || ""}
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
          <KpiSummaryCards kpis={kpis} />

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
