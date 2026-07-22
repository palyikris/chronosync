import React, { createContext, useContext, useEffect, useState } from "react";
import { type User, type Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { type AuthContextType, type UserProfile } from "../types/auth";

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  isSuperAdmin: false,
  isCompanyAdmin: false,
  signOut: async () => {},
});

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
      return;
    }

    // Soft Delete Access Guard
    if (profileData.is_active === false) {
      await supabase.auth.signOut();
      throw new Error(
        "Your account has been deactivated by your company admin.",
      );
    }

    setProfile(profileData);
  };

  useEffect(() => {
    // 1. Initial session load on app mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 2. Auth state change listener (Triggers on login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setLoading(false);
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

export const useAuth = () => useContext(AuthContext);
