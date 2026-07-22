import { supabase } from "../lib/supabaseClient";
import type { CompanyUserRole } from "../types/user-management";

/**
 * Signs up a new user and assigns them to a specific company.
 */
export async function signUpUser(params: {
  email: string;
  password: string;
  fullName: string;
  companyId: string;
  role?: CompanyUserRole;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        full_name: params.fullName,
        company_id: params.companyId,
        role: params.role || "regular",
      },
    },
  });

  if (error) {
    console.error("Signup Error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Standard email + password sign in.
 */
export async function signInUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Sign-in Error:", error.message);
    throw error;
  }

  return data;
}

/**
 * Signs out the current session.
 */
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
