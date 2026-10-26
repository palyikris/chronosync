import { supabase } from "../lib/supabaseClient";
import i18n from "../lib/i18n";
import type { DashboardData } from "../types/dashboard";
import { fetchAllRows } from "../utils/fetchAllRows";
import {
  aggregateDashboardData,
  isValidDashboardDateRange,
  type DashboardProfileRow,
  type DashboardProjectRow,
  type DashboardTimesheetRow,
} from "../utils/dashboardCalculations";

/**
 * Fetches and aggregates the company dashboard for an inclusive YYYY-MM-DD
 * date range. Draft and rejected entries are intentionally excluded.
 */
export async function fetchAdminDashboardData(
  companyId: string,
  startDate: string,
  endDate: string,
): Promise<DashboardData> {
  if (!companyId) {
    throw new Error(i18n.t("dashboard.companyRequired"));
  }

  if (!isValidDashboardDateRange(startDate, endDate)) {
    throw new Error(i18n.t("dashboard.invalidDateRange"));
  }

  const [profiles, projects, timesheets] = await Promise.all([
    fetchAllRows((from, to) => supabase
      .from("profiles")
      .select("id, weekly_work_hours")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .neq("role", "super_admin")
      .order("id")
      .range(from, to)),

    fetchAllRows((from, to) => supabase
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
      .eq("clients.is_active", true)
      .order("id")
      .range(from, to)),

    fetchAllRows((from, to) => supabase
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
      .eq("company_id", companyId)
      .gte("work_date", startDate)
      .lte("work_date", endDate)
      .neq("status", "draft")
      .neq("status", "rejected")
      .order("id")
      .range(from, to)),
  ]);

  return aggregateDashboardData({
    activeProfiles: profiles as DashboardProfileRow[],
    activeProjects: projects as DashboardProjectRow[],
    timesheetEntries: timesheets as DashboardTimesheetRow[],
    startDate,
    endDate,
    labels: {
      unknown: i18n.t("common.unknown"),
      unassignedClient: i18n.t("errors.unassignedClient"),
      generalProject: i18n.t("errors.generalProject"),
      unknownUser: i18n.t("errors.unknownUser"),
    },
  });
}
