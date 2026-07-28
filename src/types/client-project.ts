import { z } from "zod";
import { trimmedNonEmptyStringSchema, uuidSchema } from "../lib/zodSchemas";

export type InvoiceAttachmentLanguage = "hu" | "en";

export interface Client {
  id: string;
  name: string;
  company_id: string;
  is_active: boolean;
  invoice_attachment_language: InvoiceAttachmentLanguage | null;
  created_at?: string;
}

export interface Project {
  id: string;
  client_id: string;
  company_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export const createClientPayloadSchema = z
  .object({
    name: trimmedNonEmptyStringSchema("Client name is required", 120),
    company_id: uuidSchema,
    invoice_attachment_language: z.enum(["hu", "en"]).optional(),
  })
  .strict();

export const createProjectPayloadSchema = z
  .object({
    name: trimmedNonEmptyStringSchema("Project name is required", 120),
    client_id: uuidSchema,
    company_id: uuidSchema,
  })
  .strict();

export type CreateClientPayload = z.infer<typeof createClientPayloadSchema>;
export type CreateProjectPayload = z.infer<typeof createProjectPayloadSchema>;
