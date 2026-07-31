import { z } from "zod";
import { trimmedNonEmptyStringSchema, uuidSchema } from "../lib/zodSchemas";

export type InvoiceAttachmentLanguage = "hu" | "en";

export interface Client {
  id: string;
  name: string;
  client_code: string;
  company_id: string;
  is_active: boolean;
  is_default: boolean;
  invoice_attachment_language: InvoiceAttachmentLanguage | null;
  available_hours_per_month: number;
  hours_from_previous_month: number;
  created_at?: string;
}

export interface Project {
  id: string;
  client_id: string;
  company_id: string;
  name: string;
  estimated_hours_per_month: number;
  is_active: boolean;
  created_at: string;
}

export const createClientPayloadSchema = z
  .object({
    name: trimmedNonEmptyStringSchema("Client name is required", 120),
    client_code: trimmedNonEmptyStringSchema("Client code is required", 60),
    company_id: uuidSchema,
    invoice_attachment_language: z.enum(["hu", "en"]).optional(),
    available_hours_per_month: z.number().nonnegative().optional(),
    hours_from_previous_month: z.number().nonnegative().optional(),
    is_default: z.boolean().optional(),
  })
  .strict();

export const createProjectPayloadSchema = z
  .object({
    name: trimmedNonEmptyStringSchema("Project name is required", 120),
    client_id: uuidSchema,
    company_id: uuidSchema,
    estimated_hours_per_month: z.number().nonnegative(),
  })
  .strict();

export type CreateClientPayload = z.infer<typeof createClientPayloadSchema>;
export type CreateProjectPayload = z.infer<typeof createProjectPayloadSchema>;
