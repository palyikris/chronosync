import React, { useEffect, useState } from "react";
import { type User, type Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { type UserProfile } from "../types/auth";
import i18n from "../lib/i18n";
import { AuthContext } from "./authContextBase";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !profileData) {
      console.error("Error fetching profile:", error);
      setProfile(null);
      return;
    }

    // Soft Delete Access Guard
    if (profileData.is_active === false) {
      await supabase.auth.signOut();
      throw new Error(i18n.t("errors.accountDeactivated"));
    }

    setProfile(profileData);
  };

  useEffect(() => {
    // 1. Initial session load on app mount
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            await fetchProfile(session.user.id);
          } catch (error) {
            console.error("Error during initial profile fetch:", error);
            setProfile(null);
          } finally {
            setLoading(false);
          }
          return;
        }

        setProfile(null);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading auth session:", error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      });

    // 2. Auth state change listener (Triggers on login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      try {
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Error during auth state change:", error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (error) {
      console.error("Error during sign out:", error);
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = profile?.role === "super_admin";
  const isCompanyAdmin = profile?.role === "company_admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isSuperAdmin,
        isCompanyAdmin,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
