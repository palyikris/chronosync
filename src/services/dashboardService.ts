import { supabase } from "../lib/supabaseClient";
import {
  type DashboardData,
  type DashboardKPIs,
  type ClientProjectBreakdown,
  type DailyLoggingTrend,
} from "../types/dashboard";

/**
 * @param startDate YYYY-MM-DD
 * @param endDate YYYY-MM-DD
 */
export async function fetchAdminDashboardData(
  startDate: string,
  endDate: string,
): Promise<DashboardData> {
  // 1. Parallel Execution: Fetch active company profiles & timesheet entries with client/project joins
  const [profilesResult, timesheetsResult] = await Promise.all([
    supabase.from("profiles").select("id, is_active").eq("is_active", true),

    supabase
      .from("timesheets")
      .select(
        `
        id,
        user_id,
        work_date,
        hours_logged,
        client_id,
        project_id,
        clients!inner ( id, name ),
        projects!inner ( id, name )
      `,
      )
      .gte("work_date", startDate)
      .lte("work_date", endDate),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (timesheetsResult.error) throw timesheetsResult.error;

  const activeProfiles = profilesResult.data || [];
  const timesheetEntries = timesheetsResult.data || [];

  // --- KPI AGGREGATIONS ---
  const totalLoggedHours = timesheetEntries.reduce(
    (sum, entry) => sum + (Number(entry.hours_logged) || 0),
    0,
  );

  // Distinct set of active users who logged time in this period
  const uniqueLoggingUsers = new Set(timesheetEntries.map((e) => e.user_id));
  const activeLoggersCount = uniqueLoggingUsers.size;
  const totalActiveMembers = activeProfiles.length;

  // Groupings for charts
  const breakdownMap = new Map<string, ClientProjectBreakdown>();
  const dailyMap = new Map<string, number>();

  timesheetEntries.forEach((entry) => {
    const hours = Number(entry.hours_logged) || 0;

    // Client/Project Grouping
    const clientObj = Array.isArray(entry.clients)
      ? entry.clients[0]
      : entry.clients;
    const projectObj = Array.isArray(entry.projects)
      ? entry.projects[0]
      : entry.projects;

    const clientId = entry.client_id;
    const clientName = clientObj?.name || "Unassigned Client";
    const projectId = entry.project_id;
    const projectName = projectObj?.name || "General Project";

    const groupKey = `${clientId}:${projectId}`;

    if (!breakdownMap.has(groupKey)) {
      breakdownMap.set(groupKey, {
        clientId,
        clientName,
        projectId,
        projectName,
        totalHours: 0,
        percentage: 0,
      });
    }

    const group = breakdownMap.get(groupKey)!;
    group.totalHours += hours;

    // Daily Trend Grouping
    const dateKey = entry.work_date;
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + hours);
  });

  // Capacity Utilization Calculation (~160 hours standard work capacity per active user per month)
  const expectedTotalCapacity = totalActiveMembers * 160;
  const capacityUtilizationPct =
    expectedTotalCapacity > 0
      ? Math.min(
          100,
          Math.round((totalLoggedHours / expectedTotalCapacity) * 100),
        )
      : 0;

  const kpis: DashboardKPIs = {
    totalLoggedHours: Math.round(totalLoggedHours * 10) / 10,
    activeLoggersCount,
    totalActiveMembers,
    capacityUtilizationPct,
  };

  // Convert breakdown map to array, compute percentage share, and sort by total hours descending
  const clientProjectBreakdown = Array.from(breakdownMap.values())
    .map((item) => ({
      ...item,
      totalHours: Math.round(item.totalHours * 10) / 10,
      percentage:
        totalLoggedHours > 0
          ? Math.round((item.totalHours / totalLoggedHours) * 100)
          : 0,
    }))
    .sort((a, b) => b.totalHours - a.totalHours);

  // Convert daily map to array sorted by date ascending
  const dailyTrends: DailyLoggingTrend[] = Array.from(dailyMap.entries())
    .map(([workDate, totalHours]) => ({
      workDate,
      totalHours: Math.round(totalHours * 10) / 10,
    }))
    .sort((a, b) => a.workDate.localeCompare(b.workDate));

  return {
    kpis,
    clientProjectBreakdown,
    dailyTrends,
  };
}
