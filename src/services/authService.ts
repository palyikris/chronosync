import { supabase } from "../lib/supabaseClient";
import i18n from "../lib/i18n";
import { signInCredentialsSchema } from "../types/auth";
import { emailSchema } from "../lib/zodSchemas";

export async function requestPasswordReset(email: string) {
  const normalizedEmail = emailSchema.parse(email).toLowerCase();
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${window.location.origin}/auth/recover`,
  });
  if (error) throw error;
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

  const { error: claimError } = await supabase.rpc("claim_company_invitation");
  if (claimError) {
    await supabase.auth.signOut();
    throw new Error(i18n.t("auth.invitationClaimFailed"));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id, is_active, role")
    .eq("id", authData.user.id)
    .single();

  if (profileError) {
    await supabase.auth.signOut();
    throw new Error(i18n.t("auth.couldNotVerifyUser"));
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("is_active")
    .eq("id", profile.company_id)
    .single();

  if (companyError && profile.role !== "super_admin") {
    await supabase.auth.signOut();
    throw new Error(i18n.t("auth.couldNotVerifyCompany"));
  }

  // Block inactive users immediately
  if (profile?.is_active === false) {
    await supabase.auth.signOut();
    throw new Error(i18n.t("auth.accountDeactivatedContact"));
  }

  // Block users from inactive companies
  if (company?.is_active === false) {
    await supabase.auth.signOut();
    throw new Error(i18n.t("auth.companyDeactivatedContact"));
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
