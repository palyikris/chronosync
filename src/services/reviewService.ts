import { supabase } from "../lib/supabaseClient"
import type { TimesheetEntryStatus } from "../types/timesheet";


export const getKPIsForCompany = async (companyId: string) => {
  const { data, error } = await supabase.from('timesheets').select("*, profiles(id, full_name, company_id)").eq("company_id", companyId)
  

  if (error) {
    console.error("Error fetching KPIs:", error);
    throw new Error("Failed to fetch KPIs");
  }


  // Calculate KPIs
  const totalSubmittedHours =
    data
      ?.filter((ts) => ts.status === "submitted")
      .reduce((sum, ts) => sum + (ts.hours_logged || 0), 0) || 0;
  const totalApprovedHours = data?.filter(ts => ts.status === "approved").reduce((sum, ts) => sum + (ts.hours_logged || 0), 0) || 0;
  const totalRejected = data?.filter(ts => ts.status === "rejected").length || 0;

  const employeesPendingReview = new Set(data?.filter(ts => ts.status === "submitted").map(ts => ts.profiles.id)).size;

  return {
    totalSubmittedHours,
    totalApprovedHours,
    totalRejected,
    employeesPendingReview
  };

}

interface ReviewFilterValues {
  status?: TimesheetEntryStatus | "all";
  startDate?: string | null;
  endDate?: string | null;
  projectId?: string | null;
  clientId?: string | null;
}

export const getTimesheetReviews = async (companyId: string, filters: ReviewFilterValues) => {
  let query = supabase.from('timesheets').select("*, profiles(id, full_name, company_id), clients(id, name), projects(id, name)").eq("company_id", companyId).neq("status", "draft").neq("status", "invoiced");

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.startDate) {
    query = query.gte("work_date", filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte("work_date", filters.endDate);
  }

  if (filters.clientId) {
    query = query.eq("client_id", filters.clientId);
  }

  if (filters.projectId) {
    query = query.eq("project_id", filters.projectId);
  }

  query = query.order("work_date", { ascending: false }).order("hours_logged", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching timesheet reviews:", error);
    throw new Error("Failed to fetch timesheet reviews");
  }

  return data;
}

export const approveEntries = async ({
  entryIds,
  reviewerId,
}: {
  entryIds: string[];
  reviewerId: string;
}) => {

  const { data, error } = await supabase.from('timesheets').update({
    status: 'approved',
    approved_by: reviewerId,
    approved_at: new Date().toISOString()
  }).in('id', entryIds);

  if (error) {
    console.error("Error approving entries:", error);
    throw new Error("Failed to approve entries");
  }

  return data;
}

export const rejectEntry = async ({
  entryId,
  reviewerId,
  rejectionReason,
}: {
  entryId: string;
  reviewerId: string;
  rejectionReason: string;
}) => {

  const { data, error } = await supabase.from('timesheets').update({
    status: 'rejected',
    approved_by: reviewerId,
    approved_at: new Date().toISOString(),
    rejection_reason: rejectionReason
  }).eq('id', entryId);

  if (error) {
    console.error("Error rejecting entries:", error);
    throw new Error("Failed to reject entries");
  }

  return data;
}

export const revertEntryToSubmitted = async ({
  entryId,
}: {
  entryId: string;
}) => {

  const { data, error } = await supabase.from('timesheets').update({
    status: 'submitted',
    approved_by: null,
    approved_at: null,
  }).eq('id', entryId);

  if (error) {
    console.error("Error reverting entry to submitted:", error);
    throw new Error("Failed to revert entry to submitted");
  }

  return data;
}