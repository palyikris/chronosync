import { z } from "zod";
import {
  emailSchema,
  passwordSchema,
  trimmedNonEmptyStringSchema,
  uuidSchema,
} from "../lib/zodSchemas";

export const companyUserRoleSchema = z.enum(["company_admin", "regular"]);

export type CompanyUserRole = z.infer<typeof companyUserRoleSchema>;

export const createCompanyUserPayloadSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema.optional(),
    full_name: trimmedNonEmptyStringSchema("Full name is required", 120),
    role: companyUserRoleSchema,
    company_id: uuidSchema,
  })
  .strict();

export const updateUserRolePayloadSchema = z
  .object({
    userId: uuidSchema,
    role: companyUserRoleSchema,
  })
  .strict();

export const toggleUserActiveStatusPayloadSchema = z
  .object({
    userId: uuidSchema,
    isActive: z.boolean(),
  })
  .strict();

export const passwordResetEmailSchema = emailSchema;

export const deleteCompanyUserIdSchema = uuidSchema;

export type CreateCompanyUserPayload = z.infer<
  typeof createCompanyUserPayloadSchema
>;
