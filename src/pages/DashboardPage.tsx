import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminDashboardData } from "../services/dashboardService";
import { useAuth } from "../context/AuthContext";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { KpiSummaryCards } from "../components/dashboard/KpiSummaryCards";
import { DailyTrendChart } from "../components/dashboard/DailyTrendChart";
import { ProjectBreakdownPanel } from "../components/dashboard/ProjectBreakdownPanel";

export const AdminDashboardPage: React.FC = () => {
  const { profile } = useAuth();

  // Helper to format YYYY-MM-DD
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
    queryKey: ["adminDashboard", startDate, endDate],
    queryFn: () => fetchAdminDashboardData(startDate, endDate),
    enabled: !!profile?.company_id,
  });

  const kpis = data?.kpis;
  const breakdown = data?.clientProjectBreakdown || [];
  const dailyTrends = data?.dailyTrends || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <DashboardHeader
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {isLoading ? (
        <div className="flex justify-center items-center py-24 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4e6700]"></div>
        </div>
      ) : isError ? (
        <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm">
          Failed to load dashboard metrics: {(error as Error).message}
        </div>
      ) : (
        <>
          <KpiSummaryCards kpis={kpis} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <DailyTrendChart dailyTrends={dailyTrends}/>
            <ProjectBreakdownPanel breakdown={breakdown} />
          </div>
        </>
      )}
    </div>
  );
};
