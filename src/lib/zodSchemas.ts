import { z } from "zod";
import i18n from "./i18n";

export const emailSchema = z.string().trim().email(i18n.t("validation.validEmail"));

export const passwordSchema = z
  .string()
  .trim()
  .min(8, i18n.t("validation.passwordMin"));

export const uuidSchema = z.string().uuid(i18n.t("validation.validUuid"));

export const trimmedNonEmptyStringSchema = (
  message: string,
  maxLength = 255,
) => z.string().trim().min(1, message).max(maxLength);
