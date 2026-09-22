import { z } from "zod";
import i18n from "./i18n";

export const emailSchema = z
  .string()
  .trim()
  .email(i18n.t("validation.validEmail"));

export const passwordSchema = z
  .string()
  .trim()
  .min(8, i18n.t("validation.passwordMin"));

export const uuidSchema = z.string().uuid(i18n.t("validation.validUuid"));

export const szamlazzAgentKeySchema = z
  .string()
  .trim()
  .min(1, i18n.t("companySettings.szamlazzKeyRequired"))
  .max(512, i18n.t("companySettings.szamlazzKeyTooLong"));

export const invoiceProviderSchema = z.enum(["szamlazz_hu", "billingo"]);

export const invoiceApiKeySchema = z
  .string()
  .trim()
  .min(1, i18n.t("companySettings.invoiceApiKeyRequired"))
  .max(512, i18n.t("companySettings.invoiceApiKeyTooLong"));

export const trimmedNonEmptyStringSchema = (message: string, maxLength = 255) =>
  z.string().trim().min(1, message).max(maxLength);

export const updatePasswordSchema = z
  .object({
    newPassword: z.string().min(8, "validation.passwordMin"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "validation.passwordsDoNotMatch",
    path: ["confirmPassword"],
  });

export type UpdatePasswordPayload = z.infer<typeof updatePasswordSchema>;