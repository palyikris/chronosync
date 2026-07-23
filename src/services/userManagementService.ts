import { createClient } from "@supabase/supabase-js";
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

const tempAuthClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

/**
 * Fetch team members for the Company Admin table
 */
export async function fetchCompanyMembers(
  companyId?: string,
  role?: string,
): Promise<UserProfile[]> {
  let query = supabase.from("profiles").select("*");

  if (role !== "super_admin" && companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query.order("full_name", {
    ascending: true,
  });

  if (error) throw error;
  return data as UserProfile[];
}


export async function createCompanyUser(payload: CreateCompanyUserPayload) {
  const validatedPayload = createCompanyUserPayloadSchema.parse(payload);
  const targetPassword = validatedPayload.password || "TempPassword123!";

  const { data, error } = await tempAuthClient.auth.signUp({
    email: validatedPayload.email,
    password: targetPassword,
    options: {
      data: {
        full_name: validatedPayload.full_name,
        company_id: validatedPayload.company_id,
        role: validatedPayload.role,
      },
    },
  });

  if (error) throw error;
  return data.user;
}

/**
 * Assign/Update User Roles or Details (US-04)
 */
export async function updateUserRole(
  userId: string,
  role: CompanyUserRole,
) {
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
    redirectTo: `${window.location.origin}/login`,
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
