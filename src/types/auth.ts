import type { User, Session } from "@supabase/supabase-js";
import { z } from "zod";
import i18n from "../lib/i18n";
import {
  emailSchema,
  passwordSchema,
  trimmedNonEmptyStringSchema,
  uuidSchema,
} from "../lib/zodSchemas";

export const userRoleSchema = z.enum([
  "super_admin",
  "company_admin",
  "regular",
]);

export const signInCredentialsSchema = z
  .object({
    email: emailSchema,
    password: z.string().trim().min(1, i18n.t("validation.passwordRequired")),
  })
  .strict();

export const signUpCredentialsSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    fullName: trimmedNonEmptyStringSchema(
      i18n.t("validation.fullNameRequired"),
      120,
    ),
    companyId: uuidSchema,
    role: userRoleSchema.optional(),
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
