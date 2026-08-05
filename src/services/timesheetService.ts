import { supabase } from "../lib/supabaseClient";
import i18n from "../lib/i18n";
import {
  newTimesheetPayloadSchema,
  timesheetEntryUpdatePayloadSchema,
} from "../types/timesheet";
import type {
  ActiveTimerState,
  NewTimesheetPayload,
  SelectableTimesheetUser,
  TimesheetEntry,
  TimesheetEntryUpdatePayload,
  UpsertDailyEntryParams,
} from "../types/timesheet";

const pad = (value: number) => String(value).padStart(2, "0");
const ACTIVE_TIMER_STORAGE_PREFIX = "chronosync:active-timer";

const isBrowser = () => typeof window !== "undefined";

const getActiveTimerStorageKey = (userId: string) =>
  `${ACTIVE_TIMER_STORAGE_PREFIX}:${userId}`;

const safeReadActiveTimer = (userId: string): ActiveTimerState | null => {
  if (!isBrowser()) return null;

  try {
    const rawValue = window.localStorage.getItem(
      getActiveTimerStorageKey(userId),
    );
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as ActiveTimerState;
    if (
      !parsed ||
      typeof parsed.started_at !== "string" ||
      typeof parsed.project_id !== "string" ||
      typeof parsed.description !== "string" ||
      typeof parsed.company_id !== "string"
    ) {
      window.localStorage.removeItem(getActiveTimerStorageKey(userId));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const safeWriteActiveTimer = (userId: string, state: ActiveTimerState) => {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(
      getActiveTimerStorageKey(userId),
      JSON.stringify(state),
    );
  } catch (error) {
    console.warn("Unable to persist active timer state", error);
  }
};

const safeClearActiveTimer = (userId: string) => {
  if (!isBrowser()) return;

  try {
    window.localStorage.removeItem(getActiveTimerStorageKey(userId));
  } catch (error) {
    console.warn("Unable to clear active timer state", error);
  }
};

const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(i18n.t("errors.notAuthenticated"));
  }

  return user;
};

export const TIMESHEET_REFRESH_EVENT = "chronosync:timesheet-updated";

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
  if (!user) throw new Error(i18n.t("errors.notAuthenticated"));

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
      throw new Error(i18n.t("errors.companyIdRequired"));
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

  const user = await getCurrentUser();

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

export async function startTimer(
  data: ActiveTimerState,
): Promise<ActiveTimerState> {
  const user = await getCurrentUser();
  const activeTimerState: ActiveTimerState = {
    started_at: data.started_at,
    project_id: data.project_id,
    description: data.description,
    company_id: data.company_id,
    ...(data.client_id ? { client_id: data.client_id } : {}),
  };

  safeWriteActiveTimer(user.id, activeTimerState);
  return activeTimerState;
}

export async function getActiveTimerState(): Promise<ActiveTimerState | null> {
  const user = await getCurrentUser();
  return safeReadActiveTimer(user.id);
}

export async function stopTimer(
  entryData: ActiveTimerState,
): Promise<TimesheetEntry> {
  const user = await getCurrentUser();
  const startedAtMs = Date.parse(entryData.started_at);

  if (Number.isNaN(startedAtMs)) {
    throw new Error(i18n.t("errors.invalidActiveTimerState"));
  }

  const durationMinutes = Math.max(
    1,
    Math.round((Date.now() - startedAtMs) / 60000),
  );

  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .select("client_id, company_id")
    .eq("id", entryData.project_id)
    .single();

  if (projectError) throw projectError;

  const resolvedClientId = entryData.client_id ?? projectRow?.client_id;

  if (!resolvedClientId) {
    throw new Error(i18n.t("errors.invalidActiveTimerState"));
  }

  if (
    projectRow?.company_id &&
    projectRow.company_id !== entryData.company_id
  ) {
    throw new Error(i18n.t("errors.invalidActiveTimerState"));
  }

  const createdEntry = await createTimesheetEntry({
    work_date: new Date().toISOString().slice(0, 10),
    hours_logged: Number((durationMinutes / 60).toFixed(2)),
    description: entryData.description,
    company_id: entryData.company_id,
    client_id: resolvedClientId,
    project_id: entryData.project_id,
    target_user_id: user.id,
  });

  safeClearActiveTimer(user.id);
  return createdEntry;
}

export async function cloneEntry(entryId: string): Promise<TimesheetEntry> {
  const user = await getCurrentUser();

  const { data: existingEntry, error: fetchError } = await supabase
    .from("timesheets")
    .select("*")
    .eq("id", entryId)
    .single();

  if (fetchError) throw fetchError;
  if (!existingEntry) {
    throw new Error(i18n.t("errors.timesheetEntryNotFound"));
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("timesheets")
    .insert([
      {
        user_id: user.id,
        company_id: existingEntry.company_id,
        client_id: existingEntry.client_id,
        project_id: existingEntry.project_id,
        work_date: today,
        hours_logged: Number(existingEntry.hours_logged),
        description: existingEntry.description,
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

export async function upsertDailyEntry(
  params: UpsertDailyEntryParams,
): Promise<TimesheetEntry | null> {
  const user = await getCurrentUser();
  const resolvedUserId = params.target_user_id ?? user.id;
  const parsedHours =
    typeof params.hours_logged === "number"
      ? params.hours_logged
      : Number(params.hours_logged);
  const normalizedHours = Number.isFinite(parsedHours)
    ? Number(parsedHours.toFixed(2))
    : 0;

  const { data: existingEntries, error: findError } = await supabase
    .from("timesheets")
    .select("*")
    .eq("user_id", resolvedUserId)
    .eq("work_date", params.work_date)
    .eq("project_id", params.project_id)
    .eq("description", params.description)
    .order("created_at", { ascending: false })
    .limit(1);

  if (findError) throw findError;

  const existingEntry = existingEntries?.[0] as TimesheetEntry | undefined;

  if (normalizedHours <= 0) {
    if (!existingEntry) return null;

    await deleteTimesheetEntry(existingEntry.id);
    return null;
  }

  if (existingEntry) {
    const { data, error } = await supabase
      .from("timesheets")
      .update({
        hours_logged: normalizedHours,
      })
      .eq("id", existingEntry.id)
      .select()
      .single();

    if (error) throw error;
    return data as TimesheetEntry;
  }

  const { data, error } = await supabase
    .from("timesheets")
    .insert([
      {
        user_id: resolvedUserId,
        company_id: params.company_id,
        client_id: params.client_id,
        project_id: params.project_id,
        work_date: params.work_date,
        hours_logged: normalizedHours,
        description: params.description,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as TimesheetEntry;
}

export async function submitTimesheetEntries(
  entryIds: string[],
): Promise<void> {
  const { error } = await supabase
    .from("timesheets")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .in("id", entryIds);

  if (error) throw error;
}

export async function revertSubmittedTimesheetEntries(
  entryIds: string[],
): Promise<void> {
  const { error } = await supabase
    .from("timesheets")
    .update({
      status: "draft",
      submitted_at: null,
    })
    .in("id", entryIds);

  if (error) throw error;
}