import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "super_admin" | "company_admin" | "regular";

export interface UserProfile {
  id: string;
  company_id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  signOut: () => Promise<void>;
}
