import { supabase } from "../lib/supabaseClient";

export interface TimesheetEntry {
  id: string;
  user_id: string;
  company_id: string;
  work_date: string;
  hours_logged: number;
  description: string;
  created_at: string;
}

export interface NewTimesheetPayload {
  work_date: string;
  hours_logged: number;
  description: string;
  company_id: string;
}

/**
 * Fetch timesheets for the current user for a given month (e.g. YYYY-MM)
 */
export async function fetchUserTimesheets(
  dateYearMonth: string,
): Promise<TimesheetEntry[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Query dates matching the selected month prefix
  const { data, error } = await supabase
    .from("timesheets")
    .select("*")
    .eq("user_id", user.id)
    .gte("work_date", `${dateYearMonth}-01`)
    .lte("work_date", `${dateYearMonth}-31`)
    .order("work_date", { ascending: false });

  if (error) throw error;
  return data as TimesheetEntry[];
}

/**
 * Create a new timesheet log entry
 */
export async function createTimesheetEntry(
  payload: NewTimesheetPayload,
): Promise<TimesheetEntry> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("timesheets")
    .insert([
      {
        user_id: user.id,
        company_id: payload.company_id,
        work_date: payload.work_date,
        hours_logged: payload.hours_logged,
        description: payload.description,
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
  payload: Partial<Pick<TimesheetEntry, "work_date" | "hours_logged" | "description">>,
): Promise<TimesheetEntry> {
  const { data, error } = await supabase
    .from("timesheets")
    .update({
      ...(payload.work_date !== undefined && { work_date: payload.work_date }),
      ...(payload.hours_logged !== undefined && { hours_logged: payload.hours_logged }),
      ...(payload.description !== undefined && { description: payload.description }),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as TimesheetEntry;
}
