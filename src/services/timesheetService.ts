import { supabase } from "../lib/supabaseClient";
import {
  newTimesheetPayloadSchema,
  timesheetEntryUpdatePayloadSchema,
} from "../types/timesheet";
import type {
  NewTimesheetPayload,
  SelectableTimesheetUser,
  TimesheetEntry,
  TimesheetEntryUpdatePayload,
} from "../types/timesheet";

const pad = (value: number) => String(value).padStart(2, "0");

const getMonthBounds = (dateYearMonth: string) => {
  const [year, month] = dateYearMonth.split("-").map(Number);

  const monthStart = `${dateYearMonth}-01`;
  const nextMonthDate = new Date(year, month, 1);
  const nextMonthStart = `${nextMonthDate.getFullYear()}-${pad(
    nextMonthDate.getMonth() + 1,
  )}-01`;

  return { monthStart, nextMonthStart };
};

/**
 * Fetch timesheets for the current user for a given month (e.g. YYYY-MM)
 */
export async function fetchUserTimesheets(
  dateYearMonth: string,
  targetUserId?: string,
): Promise<TimesheetEntry[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const resolvedUserId = targetUserId ?? user.id;
  const { monthStart, nextMonthStart } = getMonthBounds(dateYearMonth);

  const { data, error } = await supabase
    .from("timesheets")
    .select("*")
    .eq("user_id", resolvedUserId)
    .gte("work_date", monthStart)
    .lt("work_date", nextMonthStart)
    .order("work_date", { ascending: false });

  if (error) throw error;
  return data as TimesheetEntry[];
}

export async function fetchSelectableCompanyUsers(
  companyId?: string,
  includeAllCompanies = false,
): Promise<SelectableTimesheetUser[]> {
  let query = supabase
    .from("profiles")
    .select("id, company_id, full_name, role")
    .order("full_name", { ascending: true });

  if (!includeAllCompanies) {
    if (!companyId) {
      throw new Error("Company id is required to load selectable users");
    }

    query = query.eq("company_id", companyId).neq("role", "super_admin");
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as SelectableTimesheetUser[];
}

/**
 * Create a new timesheet log entry
 */
export async function createTimesheetEntry(
  payload: NewTimesheetPayload,
): Promise<TimesheetEntry> {
  const validatedPayload = newTimesheetPayloadSchema.parse(payload);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("timesheets")
    .insert([
      {
        user_id: validatedPayload.target_user_id ?? user.id,
        company_id: validatedPayload.company_id,
        client_id: validatedPayload.client_id,
        project_id: validatedPayload.project_id,
        work_date: validatedPayload.work_date,
        hours_logged: validatedPayload.hours_logged,
        description: validatedPayload.description,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as TimesheetEntry;
}

/**
 * Delete a timesheet entry
 */
export async function deleteTimesheetEntry(id: string): Promise<void> {
  const { error } = await supabase.from("timesheets").delete().eq("id", id);

  if (error) throw error;
}

/**
 * Update a timesheet entry by id
 */
export async function updateTimesheetEntry(
  id: string,
  payload: TimesheetEntryUpdatePayload,
): Promise<TimesheetEntry> {
  const validatedPayload = timesheetEntryUpdatePayloadSchema.parse(payload);

  const { data, error } = await supabase
    .from("timesheets")
    .update({
      ...(validatedPayload.work_date !== undefined && {
        work_date: validatedPayload.work_date,
      }),
      ...(validatedPayload.hours_logged !== undefined && {
        hours_logged: validatedPayload.hours_logged,
      }),
      ...(validatedPayload.description !== undefined && {
        description: validatedPayload.description,
      }),
      ...(validatedPayload.client_id !== undefined && {
        client_id: validatedPayload.client_id,
      }),
      ...(validatedPayload.project_id !== undefined && {
        project_id: validatedPayload.project_id,
      }),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as TimesheetEntry;
}
