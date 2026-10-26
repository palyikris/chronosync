import { supabase } from "../lib/supabaseClient";
import type { TimesheetEntryStatus } from "../types/timesheet";
import { calculateReviewKpis } from "../utils/reviewHelpers";
import { fetchAllRows } from "../utils/fetchAllRows";

export const getKPIsForCompany = async (companyId: string) => {
  const data = await fetchAllRows((from, to) => supabase
    .from("timesheets")
    .select("status, hours_logged, user_id")
    .eq("company_id", companyId)
    .order("id")
    .range(from, to));

  return calculateReviewKpis(data ?? []);
};

interface ReviewFilterValues {
  status?: TimesheetEntryStatus | "all";
  userId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  projectId?: string | null;
  clientId?: string | null;
}

export const getTimesheetReviews = async (companyId: string, filters: ReviewFilterValues) => {
  let query = supabase
    .from("timesheets")
    .select(
      "*, profiles(id, full_name, company_id), clients(id, name), projects(id, name)",
    )
    .eq("company_id", companyId)
    .neq("status", "draft")
    .neq("status", "invoiced");

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
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

  query = query.order("work_date", { ascending: false }).order("hours_logged", { ascending: false }).order("id");

  return fetchAllRows((from, to) => query.range(from, to));
}

export const approveEntries = async ({
  entryIds,
  reviewerId,
  companyId,
}: {
  entryIds: string[];
  reviewerId: string;
  companyId: string;
}) => {
  if (!reviewerId || !companyId || entryIds.length === 0) {
    throw new Error("A company, reviewer, and at least one entry are required");
  }

  const uniqueEntryIds = Array.from(new Set(entryIds));
  const { data, error } = await supabase
    .from("timesheets")
    .update({
      status: "approved",
      approved_by: reviewerId,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .in("id", uniqueEntryIds)
    .eq("company_id", companyId)
    .eq("status", "submitted")
    .select("id");

  if (error) {
    console.error("Error approving entries:", error);
    throw new Error("Failed to approve entries");
  }

  if ((data?.length ?? 0) !== uniqueEntryIds.length) {
    throw new Error("One or more entries are no longer awaiting review");
  }

  return data;
};

export const rejectEntry = async ({
  entryId,
  reviewerId,
  companyId,
  rejectionReason,
}: {
  entryId: string;
  reviewerId: string;
  companyId: string;
  rejectionReason: string;
}) => {
  const trimmedReason = rejectionReason.trim();
  if (!reviewerId || !companyId || !entryId || !trimmedReason) {
    throw new Error(
      "A company, reviewer, entry, and rejection reason are required",
    );
  }

  const { data, error } = await supabase
    .from("timesheets")
    .update({
      status: "rejected",
      approved_by: reviewerId,
      approved_at: new Date().toISOString(),
      rejection_reason: trimmedReason,
    })
    .eq("id", entryId)
    .eq("company_id", companyId)
    .eq("status", "submitted")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Error rejecting entries:", error);
    throw new Error("Failed to reject entries");
  }

  if (!data) {
    throw new Error("This entry is no longer awaiting review");
  }

  return data;
};

export const revertEntryToSubmitted = async ({
  entryId,
  companyId,
}: {
  entryId: string;
  companyId: string;
}) => {
  if (!entryId || !companyId) {
    throw new Error("A company and entry are required");
  }

  const { data, error } = await supabase
    .from("timesheets")
    .update({
      status: "submitted",
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
    })
    .eq("id", entryId)
    .eq("company_id", companyId)
    .eq("status", "approved")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Error reverting entry to submitted:", error);
    throw new Error("Failed to revert entry to submitted");
  }

  if (!data) {
    throw new Error("This entry is no longer approved");
  }

  return data;
};
