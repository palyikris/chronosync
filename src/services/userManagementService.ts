import { createClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import type { UserProfile } from "../types/auth";
import type {
  CompanyUserRole,
  CreateCompanyUserPayload,
} from "../types/user-management";

const tempAuthClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
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
export async function fetchCompanyMembers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data as UserProfile[];
}

/**
 * Provision new team user (US-03)
 */
export async function createCompanyUser(payload: CreateCompanyUserPayload) {
  const { data, error } = await tempAuthClient.auth.signUp({
    email: payload.email,
    password: payload.password || "TempPassword123!",
    options: {
      data: {
        full_name: payload.full_name,
        company_id: payload.company_id,
        role: payload.role,
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
  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
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
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}

/**
 * Trigger Password Reset Email
 */
export async function sendUserPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  });

  if (error) throw error;
}
