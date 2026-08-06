import { z } from "zod";

export type AuditOperation = "INSERT" | "UPDATE" | "DELETE";

export const auditLogFiltersSchema = z.object({
  searchQuery: z.string().optional(),
  operations: z.array(z.enum(["INSERT", "UPDATE", "DELETE"])).optional(),
  tableName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(25),
});

export type AuditLogFilters = z.infer<typeof auditLogFiltersSchema>;

export interface AuditLogProfile {
  full_name: string | null;
}

export interface AuditLogEntry {
  id: number;
  table_name: string;
  record_id: string | null;
  operation: AuditOperation;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_fields: Record<string, { was: any; became: any }> | null;
  performed_by: string | null;
  created_at: string;
  profiles: AuditLogProfile | null;
}

export interface AuditLogsResponse {
  data: AuditLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
}
