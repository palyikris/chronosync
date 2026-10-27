import { supabase } from "../lib/supabaseClient";
import i18n from "../lib/i18n";
import {
  calculateLeaveHoursForDateRange,
  getEffectiveWeeklyHours,
  getLeaveDateRange,
  getLeaveWorkingDayCount,
} from "../utils/leaveHours";
import {
  leaveRequestCreateSchema,
  leaveRequestStatusUpdateSchema,
  leaveRequestUpdateSchema,
  type LeaveRequest,
  type LeaveRequestCreatePayload,
  type LeaveRequestStatusUpdatePayload,
  type LeaveRequestUpdatePayload,
} from "../types/leave";

type CurrentProfile = {
  id: string;
  company_id: string;
  role: string;
  full_name: string;
  weekly_work_hours: number | null;
};

type LeaveRequestWithProfile = LeaveRequest & {
  profiles?: {
    id: string;
    full_name: string;
    role: string;
  } | null;
};

export class LeaveRequestConflictError extends Error {
  conflictingDates: string[];

  constructor(conflictingDates: string[]) {
    super("LOGGED_HOURS_EXIST");
    this.name = "LeaveRequestConflictError";
    this.conflictingDates = conflictingDates;
  }
}

export class DateLockedForLeaveError extends Error {
  lockedDate: string;

  constructor(lockedDate: string) {
    super("DATE_LOCKED_FOR_LEAVE");
    this.name = "DateLockedForLeaveError";
    this.lockedDate = lockedDate;
  }
}

const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(i18n.t("errors.notAuthenticated"));
  }

  return user;
};

const getCurrentProfile = async (): Promise<CurrentProfile> => {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, company_id, role, full_name, weekly_work_hours")
    .eq("id", user.id)
    .single<CurrentProfile>();

  if (error || !data) {
    throw error ?? new Error(i18n.t("errors.notAuthenticated"));
  }

  return data;
};

const normalizeDate = (value: string) => value.slice(0, 10);

export {
  calculateLeaveHoursForDateRange,
  getEffectiveWeeklyHours,
  getLeaveDateRange,
  getLeaveWorkingDayCount,
};

export async function fetchLeaveRequests(): Promise<LeaveRequestWithProfile[]> {
  const profile = await getCurrentProfile();

  const query = supabase
    .from("leave_requests")
    .select("*, profiles(id, full_name, role)")
    .eq("company_id", profile.company_id)
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (profile.role !== "company_admin") {
    const [ownRequestsResult, companyApprovedResult] = await Promise.all([
      query
        .in("status", ["PENDING", "APPROVED", "REJECTED"])
        .eq("user_id", profile.id),
      supabase
        .from("leave_requests")
        .select("*, profiles(id, full_name, role)")
        .eq("company_id", profile.company_id)
        .eq("status", "APPROVED")
        .order("start_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    if (ownRequestsResult.error) throw ownRequestsResult.error;
    if (companyApprovedResult.error) throw companyApprovedResult.error;

    const merged = new Map<string, LeaveRequestWithProfile>();
    for (const request of ownRequestsResult.data ?? []) {
      merged.set(request.id, request as LeaveRequestWithProfile);
    }
    for (const request of companyApprovedResult.data ?? []) {
      merged.set(request.id, request as LeaveRequestWithProfile);
    }

    return Array.from(merged.values());
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as LeaveRequestWithProfile[];
}

export async function fetchApprovedLeaveDatesForUser(userId: string) {
  const { data, error } = await supabase
    .from("leave_requests")
    .select("start_date, end_date")
    .eq("user_id", userId)
    .eq("status", "APPROVED")
    .order("start_date", { ascending: true });

  if (error) throw error;

  return (data ?? []).flatMap((request) =>
    getLeaveDateRange(request.start_date, request.end_date),
  );
}

export async function assertTimesheetDateIsUnlocked(
  userId: string,
  workDate: string,
) {
  const approvedLeaveDates = await fetchApprovedLeaveDatesForUser(userId);

  if (approvedLeaveDates.includes(normalizeDate(workDate))) {
    throw new DateLockedForLeaveError(normalizeDate(workDate));
  }
}

export async function createLeaveRequest(payload: LeaveRequestCreatePayload) {
  const validatedPayload = leaveRequestCreateSchema.parse(payload);
  const profile = await getCurrentProfile();

  if (validatedPayload.end_date < validatedPayload.start_date) {
    throw new Error(i18n.t("leave.endDateBeforeStartDate"));
  }

  const { data: overlappingRequests, error: overlapError } = await supabase
    .from("leave_requests")
    .select("id")
    .eq("user_id", profile.id)
    .in("status", ["PENDING", "APPROVED"])
    .lte("start_date", validatedPayload.end_date)
    .gte("end_date", validatedPayload.start_date)
    .limit(1);

  if (overlapError) throw overlapError;
  if ((overlappingRequests ?? []).length > 0) {
    throw new Error(i18n.t("leave.overlappingRequest"));
  }

  const { data, error } = await supabase
    .from("leave_requests")
    .insert([
      {
        user_id: profile.id,
        company_id: profile.company_id,
        start_date: validatedPayload.start_date,
        end_date: validatedPayload.end_date,
        weekly_work_hours:
          validatedPayload.weekly_work_hours ?? profile.weekly_work_hours ?? 40,
        status: "PENDING",
      },
    ])
    .select("*, profiles(id, full_name, role)")
    .single();

  if (error) throw error;
  return data as LeaveRequestWithProfile;
}

export async function updateLeaveRequest(
  id: string,
  payload: LeaveRequestUpdatePayload,
) {
  const validatedPayload = leaveRequestUpdateSchema.parse(payload);
  const profile = await getCurrentProfile();

  const { data: existingRequest, error: fetchError } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("id", id)
    .single<LeaveRequest>();

  if (fetchError) throw fetchError;

  if (!existingRequest) {
    throw new Error(i18n.t("leave.requestNotFound"));
  }

  if (existingRequest.user_id !== profile.id) {
    throw new Error(i18n.t("errors.unauthorized"));
  }

  if (existingRequest.status !== "PENDING") {
    throw new Error(i18n.t("leave.onlyPendingEditable"));
  }

  if (validatedPayload.end_date < validatedPayload.start_date) {
    throw new Error(i18n.t("leave.endDateBeforeStartDate"));
  }

  const { data: overlappingRequests, error: overlapError } = await supabase
    .from("leave_requests")
    .select("id")
    .eq("user_id", profile.id)
    .in("status", ["PENDING", "APPROVED"])
    .neq("id", id)
    .lte("start_date", validatedPayload.end_date)
    .gte("end_date", validatedPayload.start_date)
    .limit(1);

  if (overlapError) throw overlapError;
  if ((overlappingRequests ?? []).length > 0) {
    throw new Error(i18n.t("leave.overlappingRequest"));
  }

  const { data, error } = await supabase
    .from("leave_requests")
    .update({
      start_date: validatedPayload.start_date,
      end_date: validatedPayload.end_date,
      weekly_work_hours:
        validatedPayload.weekly_work_hours ??
        existingRequest.weekly_work_hours ??
        profile.weekly_work_hours ??
        40,
    })
    .eq("id", id)
    .select("*, profiles(id, full_name, role)")
    .single();

  if (error) throw error;
  return data as LeaveRequestWithProfile;
}

export async function deleteLeaveRequest(id: string) {
  const { error } = await supabase.rpc("cancel_leave_request", { p_id: id });
  if (error) throw error;
}

export async function updateLeaveRequestStatus(
  id: string,
  payload: LeaveRequestStatusUpdatePayload,
): Promise<{ status: "APPROVED" | "REJECTED"; data: LeaveRequestWithProfile }> {
  const validated = leaveRequestStatusUpdateSchema.parse(payload);
  const { data, error } = await supabase.rpc("review_leave_request", {
    p_id: id, p_status: validated.status,
  });
  if (error) {
    if (error.message === "LOGGED_HOURS_EXIST") {
      let dates: string[] = [];
      try {
        const parsed: unknown = JSON.parse(error.details);
        if (Array.isArray(parsed)) dates = parsed.filter((value): value is string => typeof value === "string");
      } catch { /* Preserve the conflict even if no dates were returned. */ }
      throw new LeaveRequestConflictError(dates);
    }
    throw error;
  }
  return { status: validated.status, data: data as LeaveRequestWithProfile };
}
