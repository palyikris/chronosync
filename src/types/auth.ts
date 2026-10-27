import type { User, Session } from "@supabase/supabase-js";
import { z } from "zod";
import i18n from "../lib/i18n";
import { emailSchema } from "../lib/zodSchemas";

export const userRoleSchema = z.enum([
  "super_admin",
  "company_admin",
  "regular",
]);

export const signInCredentialsSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, i18n.t("validation.passwordRequired")),
  })
  .strict();

export type UserRole = z.infer<typeof userRoleSchema>;

export interface UserProfile {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  weekly_work_hours: number | null;
  show_timesheet_timer: boolean;
  created_at: string;
  companies?: {
    name: string;
  };
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  authError?: string | null;
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}
