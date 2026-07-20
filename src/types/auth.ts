// Add 'type' before the imported type definitions
import type { User, Session } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  company_id: string;
  full_name: string;
  role: "super_admin" | "company_admin" | "regular";
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
