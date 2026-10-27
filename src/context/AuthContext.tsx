import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { type UserProfile } from "../types/auth";
import i18n from "../lib/i18n";
import { AuthContext } from "./authContextBase";

type ProfileWithCompany = UserProfile & {
  company: { is_active: boolean } | null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const currentUserId = useRef<string | null>(null);
  const user = session?.user ?? null;

  const profileQuery = useQuery({
    queryKey: ["auth-profile", user?.id],
    enabled: Boolean(user),
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async ({ signal }) => {
      const { error: claimError } = await supabase.rpc("claim_company_invitation");
      if (claimError) throw new Error(i18n.t("auth.invitationClaimFailed"));
      const { data, error } = await supabase
        .from("profiles")
        .select("*, company:companies(is_active)")
        .eq("id", user!.id)
        .abortSignal(signal)
        .single<ProfileWithCompany>();
      if (error || !data) throw new Error(i18n.t("auth.couldNotVerifyUser"));
      return data;
    },
  });
  const fetchedProfile = profileQuery.data;
  const accessError = fetchedProfile?.is_active === false
    ? i18n.t("auth.accountDeactivatedContact")
    : fetchedProfile && fetchedProfile.role !== "super_admin" && fetchedProfile.company?.is_active === false
      ? i18n.t("auth.companyDeactivatedContact")
      : null;
  const profile = accessError ? null : fetchedProfile ?? null;

  useEffect(() => {
    let active = true;
    let authRevision = 0;
    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      const nextUserId = nextSession?.user.id ?? null;
      if (currentUserId.current !== nextUserId) {
        // Cancel in-flight reads and discard data from the previous account.
        queryClient.clear();
        currentUserId.current = nextUserId;
      }
      setSession(nextSession);
      setInitialized(true);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authRevision += 1;
      // Keep this callback synchronous; queries run after React commits.
      applySession(nextSession);
    });
    const initialRevision = authRevision;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || authRevision !== initialRevision) return;
      if (error) setAuthError(i18n.t("auth.couldNotVerifyUser"));
      applySession(data.session);
    }).catch(() => {
      if (!active || authRevision !== initialRevision) return;
      setAuthError(i18n.t("auth.couldNotVerifyUser"));
      applySession(null);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  useEffect(() => {
    if (!accessError) return;
    // Run outside the auth listener, retaining the reason after sign-out.
    void supabase.auth.signOut().then(() => setAuthError(accessError));
  }, [accessError]);

  const refreshProfile = async () => {
    if (user) await profileQuery.refetch({ throwOnError: true });
  };
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    queryClient.clear();
    setAuthError(null);
  };

  return <AuthContext.Provider value={{
    user, profile, session,
    loading: !initialized || (Boolean(user) && profileQuery.isPending),
    authError: profileQuery.isError ? i18n.t("auth.couldNotVerifyUser") : accessError ?? authError,
    isSuperAdmin: profile?.role === "super_admin",
    isCompanyAdmin: profile?.role === "company_admin",
    refreshProfile, signOut: handleSignOut,
  }}>{children}</AuthContext.Provider>;
};
