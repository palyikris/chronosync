import { supabase } from "../lib/supabaseClient";
import i18n from "../lib/i18n";
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

const pad = (value: number) => String(value).padStart(2, "0");

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
    .select("id, company_id, role, full_name")
    .eq("id", user.id)
    .single<CurrentProfile>();

  if (error || !data) {
    throw error ?? new Error(i18n.t("errors.notAuthenticated"));
  }

  return data;
};

const isWeekend = (dateString: string) => {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  return day === 0 || day === 6;
};

const normalizeDate = (value: string) => value.slice(0, 10);

export const getLeaveWorkingDayCount = (startDate: string, endDate: string) => {
  let count = 0;
  const cursor = new Date(`${startDate}T00:00:00`);
  const lastDate = new Date(`${endDate}T00:00:00`);

  while (cursor <= lastDate) {
    const dateString = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
    if (!isWeekend(dateString)) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
};

export const getLeaveDateRange = (startDate: string, endDate: string) => {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const lastDate = new Date(`${endDate}T00:00:00`);

  while (cursor <= lastDate) {
    const dateString = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
    dates.push(dateString);
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
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
    })
    .eq("id", id)
    .select("*, profiles(id, full_name, role)")
    .single();

  if (error) throw error;
  return data as LeaveRequestWithProfile;
}

export async function deleteLeaveRequest(id: string) {
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

  const isOwner = existingRequest.user_id === profile.id;
  const isAdmin = profile.role === "company_admin";

  if (!isOwner && !isAdmin) {
    throw new Error(i18n.t("errors.unauthorized"));
  }

  const { error } = await supabase.from("leave_requests").delete().eq("id", id);

  if (error) throw error;
}

export async function updateLeaveRequestStatus(
  id: string,
  payload: LeaveRequestStatusUpdatePayload,
): Promise<
  | { status: "APPROVED"; data: LeaveRequestWithProfile }
  | { status: "REJECTED"; data: LeaveRequestWithProfile }
> {
  const validatedPayload = leaveRequestStatusUpdateSchema.parse(payload);
  const profile = await getCurrentProfile();

  if (profile.role !== "company_admin") {
    throw new Error(i18n.t("errors.unauthorized"));
  }

  const { data: existingRequest, error: fetchError } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("id", id)
    .single<LeaveRequest>();

  if (fetchError) throw fetchError;

  if (!existingRequest) {
    throw new Error(i18n.t("leave.requestNotFound"));
  }

  if (validatedPayload.status === "APPROVED") {
    const { data: conflictingEntries, error: conflictError } = await supabase
      .from("timesheets")
      .select("work_date")
      .eq("user_id", existingRequest.user_id)
      .gt("hours_logged", 0)
      .gte("work_date", existingRequest.start_date)
      .lte("work_date", existingRequest.end_date)
      .order("work_date", { ascending: true });

    if (conflictError) throw conflictError;

    const conflictingDates = Array.from(
      new Set(
        (conflictingEntries ?? [])
          .map((entry) => normalizeDate(entry.work_date))
          .filter((date) => !isWeekend(date)),
      ),
    );

    if (conflictingDates.length > 0) {
      throw new LeaveRequestConflictError(conflictingDates);
    }
  }

  const { data, error } = await supabase
    .from("leave_requests")
    .update({ status: validatedPayload.status })
    .eq("id", id)
    .select("*, profiles(id, full_name, role)")
    .single();

  if (error) throw error;

  return {
    status: validatedPayload.status,
    data: data as LeaveRequestWithProfile,
  };
}
