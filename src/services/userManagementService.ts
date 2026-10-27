import { supabase } from "../lib/supabaseClient";
import {
  createCompanyUserPayloadSchema,
  deleteCompanyUserIdSchema,
  passwordResetEmailSchema,
  toggleUserActiveStatusPayloadSchema,
  updateUserRolePayloadSchema,
} from "../types/user-management";
import type { UserProfile } from "../types/auth";
import type {
  CompanyUserRole,
  CreateCompanyUserPayload,
} from "../types/user-management";

/**
 * Fetch team members for the Company Admin table
 */
export async function fetchCompanyMembers(
  companyId?: string,
  role?: string,
): Promise<UserProfile[]> {
  const { data, error } = await supabase.rpc("get_company_members");
  if (error) throw error;
  const members = (data ?? []) as UserProfile[];
  return role !== "super_admin" && companyId
    ? members.filter(member => member.company_id === companyId) : members;
}

export async function createCompanyUser(payload: CreateCompanyUserPayload): Promise<void> {
  const validatedPayload = createCompanyUserPayloadSchema.parse(payload);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in before inviting a member.");
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiUrl) throw new Error("The invitation service is not configured.");
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/users/invitations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(validatedPayload),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(typeof error?.detail === "string" ? error.detail : "Could not send the invitation.");
  }
}

/**
 * Assign/Update User Roles or Details (US-04)
 */
export async function updateUserRole(userId: string, role: CompanyUserRole) {
  const validatedPayload = updateUserRolePayloadSchema.parse({ userId, role });

  const { data, error } = await supabase
    .from("profiles")
    .update({ role: validatedPayload.role })
    .eq("id", validatedPayload.userId)
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export async function updateWeeklyWorkHours(
  userId: string,
  weeklyHours: number,
) {
  const normalizedHours = Number(weeklyHours);

  if (
    !Number.isFinite(normalizedHours) ||
    normalizedHours <= 0 ||
    normalizedHours > 80
  ) {
    throw new Error("Weekly working hours must be between 1 and 80.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ weekly_work_hours: normalizedHours })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export async function updateTimesheetTimerVisibility(
  userId: string,
  showTimesheetTimer: boolean,
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ show_timesheet_timer: showTimesheetTimer })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}

/**
 * Soft Delete / Toggle Active Status (US-03)
 */
export async function toggleUserActiveStatus(
  userId: string,
  isActive: boolean,
) {
  const validatedPayload = toggleUserActiveStatusPayloadSchema.parse({
    userId,
    isActive,
  });

  const { data, error } = await supabase
    .from("profiles")
    .update({ is_active: validatedPayload.isActive })
    .eq("id", validatedPayload.userId)
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}

/**
 * Trigger Password Reset Email
 */
export async function sendUserPasswordReset(email: string) {
  const validatedEmail = passwordResetEmailSchema.parse(email);

  const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail, {
    redirectTo: `${window.location.origin}/auth/recover`,
  });

  if (error) throw error;
}

/**
 * Permanently hard-delete a user profile and auth account (US-03)
 */
export async function deleteCompanyUser(userId: string): Promise<void> {
  const validatedUserId = deleteCompanyUserIdSchema.parse(userId);

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", validatedUserId);

  if (error) throw error;
}
