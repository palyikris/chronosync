import { supabase } from "../lib/supabaseClient";
import i18n from "../lib/i18n";
import {
  type DashboardData,
  type DashboardKPIs,
  type ClientProjectBreakdown,
  type ClientProjectUtilizationGroup,
  type UserWorkBreakdown,
  type DailyLoggingTrend,
} from "../types/dashboard";

/**
 * @param startDate YYYY-MM-DD
 * @param endDate YYYY-MM-DD
 */
export async function fetchAdminDashboardData(
  companyId: string,
  startDate: string,
  endDate: string,
): Promise<DashboardData> {
  // 1. Parallel execution: fetch active company profiles, projects, and timesheet entries.
  const [profilesResult, projectsResult, timesheetsResult] = await Promise.all([
    supabase.from("profiles").select("id, is_active").eq("is_active", true),

    supabase
      .from("projects")
      .select(
        `
        id,
        client_id,
        name,
        estimated_hours_per_month,
        clients!inner ( id, name, is_active )
      `,
      )
      .eq("company_id", companyId)
      .eq("is_active", true)
      .eq("clients.is_active", true),

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
        projects!inner ( id, name ),
        profiles!inner ( id, full_name )
      `,
      )
      .gte("work_date", startDate)
      .neq("status", "draft")
      .neq("status", "rejected")
      .lte("work_date", endDate),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (projectsResult.error) throw projectsResult.error;
  if (timesheetsResult.error) throw timesheetsResult.error;

  const activeProfiles = profilesResult.data || [];
  const activeProjects = projectsResult.data || [];
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

  // Grouping maps
  const breakdownMap = new Map<string, ClientProjectBreakdown>();
  const userBreakdownMap = new Map<string, UserWorkBreakdown>();
  const dailyMap = new Map<string, number>();
  const projectUtilizationMap = new Map<
    string,
    {
      clientId: string;
      clientName: string;
      projectId: string;
      projectName: string;
      estimatedHours: number;
      loggedHours: number;
    }
  >();
  const clientUtilizationMap = new Map<
    string,
    {
      clientId: string;
      clientName: string;
      estimatedHours: number;
      loggedHours: number;
      projects: Array<{
        projectId: string;
        projectName: string;
        estimatedHours: number;
        loggedHours: number;
      }>;
    }
  >();

  activeProjects.forEach((projectRow: any) => {
    const projectClient = Array.isArray(projectRow.clients)
      ? projectRow.clients[0]
      : projectRow.clients;
    const clientId = projectRow.client_id;
    const clientName = projectClient?.name || i18n.t("common.unknown");
    const projectId = projectRow.id;
    const projectName = projectRow.name || i18n.t("common.unknown");
    const estimatedHours = Number(projectRow.estimated_hours_per_month) || 0;

    projectUtilizationMap.set(projectId, {
      clientId,
      clientName,
      projectId,
      projectName,
      estimatedHours,
      loggedHours: 0,
    });

    if (!clientUtilizationMap.has(clientId)) {
      clientUtilizationMap.set(clientId, {
        clientId,
        clientName,
        estimatedHours: 0,
        loggedHours: 0,
        projects: [],
      });
    }

    const clientGroup = clientUtilizationMap.get(clientId)!;
    clientGroup.estimatedHours += estimatedHours;
    clientGroup.projects.push({
      projectId,
      projectName,
      estimatedHours,
      loggedHours: 0,
    });
  });

  timesheetEntries.forEach((entry) => {
    const hours = Number(entry.hours_logged) || 0;

    // --- 1. Client/Project Grouping ---
    const clientObj = Array.isArray(entry.clients)
      ? entry.clients[0]
      : entry.clients;
    const projectObj = Array.isArray(entry.projects)
      ? entry.projects[0]
      : entry.projects;

    const clientId = entry.client_id;
    const clientName = clientObj?.name || i18n.t("errors.unassignedClient");
    const projectId = entry.project_id;
    const projectName = projectObj?.name || i18n.t("errors.generalProject");

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

    // --- 2. User Breakdown Grouping ---
    const profileObj = Array.isArray(entry.profiles)
      ? entry.profiles[0]
      : entry.profiles;

    const userId = entry.user_id;
    const userName = profileObj?.full_name || i18n.t("errors.unknownUser");
    const userEmail = profileObj?.full_name || undefined; // Assuming email is not available in the current schema

    if (!userBreakdownMap.has(userId)) {
      userBreakdownMap.set(userId, {
        userId,
        userName,
        userEmail,
        totalHours: 0,
        percentage: 0,
      });
    }

    const userGroup = userBreakdownMap.get(userId)!;
    userGroup.totalHours += hours;

    // --- 3. Daily Trend Grouping ---
    const dateKey = entry.work_date;
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + hours);

    // --- 4. Project utilization grouping ---
    const utilizationProject = projectUtilizationMap.get(entry.project_id);
    if (utilizationProject) {
      utilizationProject.loggedHours += hours;

      const utilizationClient = clientUtilizationMap.get(
        utilizationProject.clientId,
      );
      if (utilizationClient) {
        utilizationClient.loggedHours += hours;
        const projectEntry = utilizationClient.projects.find(
          (project) => project.projectId === utilizationProject.projectId,
        );
        if (projectEntry) {
          projectEntry.loggedHours += hours;
        }
      }
    }
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

  // Convert client/project map to array, compute percentage share, and sort descending
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

  const clientProjectUtilization: ClientProjectUtilizationGroup[] = Array.from(
    clientUtilizationMap.values(),
  )
    .map((group) => {
      const projects = group.projects
        .map((project) => {
          const utilizationPct =
            project.estimatedHours > 0
              ? Math.round((project.loggedHours / project.estimatedHours) * 100)
              : project.loggedHours > 0
                ? 999
                : 0;

          return {
            ...project,
            loggedHours: Math.round(project.loggedHours * 10) / 10,
            estimatedHours: Math.round(project.estimatedHours * 10) / 10,
            utilizationPct,
          };
        })
        .sort((a, b) => {
          const percentageDelta = b.utilizationPct - a.utilizationPct;
          if (percentageDelta !== 0) return percentageDelta;
          const loggedDelta = b.loggedHours - a.loggedHours;
          if (loggedDelta !== 0) return loggedDelta;
          return a.projectName.localeCompare(b.projectName);
        });

      const utilizationPct =
        group.estimatedHours > 0
          ? Math.round((group.loggedHours / group.estimatedHours) * 100)
          : group.loggedHours > 0
            ? 999
            : 0;

      return {
        ...group,
        loggedHours: Math.round(group.loggedHours * 10) / 10,
        estimatedHours: Math.round(group.estimatedHours * 10) / 10,
        utilizationPct,
        projects,
      };
    })
    .filter((group) => group.projects.length > 0)
    .sort((a, b) => {
      const percentageDelta = b.utilizationPct - a.utilizationPct;
      if (percentageDelta !== 0) return percentageDelta;
      const loggedDelta = b.loggedHours - a.loggedHours;
      if (loggedDelta !== 0) return loggedDelta;
      return a.clientName.localeCompare(b.clientName);
    });

  // Convert user map to array, compute percentage share, and sort descending
  const userBreakdown: UserWorkBreakdown[] = Array.from(
    userBreakdownMap.values(),
  )
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
    clientProjectUtilization,
    userBreakdown,
    dailyTrends,
  };
}
