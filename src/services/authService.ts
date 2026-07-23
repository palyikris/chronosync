import { supabase } from "../lib/supabaseClient";
import {
  signInCredentialsSchema,
  signUpCredentialsSchema,
} from "../types/auth";
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
  const validatedParams = signUpCredentialsSchema.parse({
    email: params.email,
    password: params.password,
    fullName: params.fullName,
    companyId: params.companyId,
    role: params.role,
  });

  const { data, error } = await supabase.auth.signUp({
    email: validatedParams.email,
    password: validatedParams.password,
    options: {
      data: {
        full_name: validatedParams.fullName,
        company_id: validatedParams.companyId,
        role: validatedParams.role || "regular",
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
  const validatedCredentials = signInCredentialsSchema.parse({
    email,
    password,
  });

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: validatedCredentials.email,
      password: validatedCredentials.password,
    });

  if (authError) {
    console.error("Sign-in Error:", authError.message);
    throw authError;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", authData.user.id)
    .single();

  if (profileError) {
    await supabase.auth.signOut();
    throw new Error("Could not verify user account status.");
  }

  // Block inactive users immediately
  if (profile?.is_active === false) {
    await supabase.auth.signOut();
    throw new Error(
      "Your account has been deactivated. Please contact your company administrator.",
    );
  }

  return authData;
}

/**
 * Signs out the current session.
 */
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
