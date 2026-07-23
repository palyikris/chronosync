import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .trim()
  .min(8, "Password must be at least 8 characters long");

export const uuidSchema = z.string().uuid("Enter a valid UUID");

export const trimmedNonEmptyStringSchema = (
  message: string,
  maxLength = 255,
) => z.string().trim().min(1, message).max(maxLength);
