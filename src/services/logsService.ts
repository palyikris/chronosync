import { supabase } from "../lib/supabaseClient";
import i18n from "../lib/i18n";
import {
  auditLogFiltersSchema,
  type AuditLogEntry,
  type AuditLogFilters,
  type AuditLogsResponse,
} from "../types/logs";

const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(i18n.t("errors.notAuthenticated"));
  }

  return user;
};

/**
 * Fetch paginated and filtered system audit logs for Super Admins
 */
export async function fetchAuditLogs(
  filters: AuditLogFilters = { page: 1, pageSize: 10 },
): Promise<AuditLogsResponse> {
  await getCurrentUser();

  const validatedFilters = auditLogFiltersSchema.parse(filters);
  const {
    searchQuery,
    operations,
    tableName,
    startDate,
    endDate,
    page,
    pageSize,
  } = validatedFilters;

  let query = supabase.from("audit_logs").select(
    `
      id,
      table_name,
      record_id,
      operation,
      old_data,
      new_data,
      changed_fields,
      performed_by,
      created_at,
      profiles:performed_by (
        full_name
      )
    `,
    { count: "exact" },
  );

  if (tableName && tableName.trim() !== "") {
    query = query.eq("table_name", tableName.trim());
  }

  if (operations && operations.length > 0) {
    query = query.in("operation", operations);
  }

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  if (searchQuery && searchQuery.trim() !== "") {
    const cleanQuery = searchQuery.trim();
    query = query.or(
      `record_id.ilike.%${cleanQuery}%,profiles.email.ilike.%${cleanQuery}%,profiles.full_name.ilike.%${cleanQuery}%`,
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    data: (data as unknown as AuditLogEntry[]) || [],
    totalCount: count ?? 0,
    page,
    pageSize,
  };
}

/**
 * Fetch distinct table names from recorded audit logs for dynamic filter dropdowns
 */
export async function fetchAuditedTableNames(): Promise<string[]> {
  await getCurrentUser();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("table_name");

  if (error) throw error;

  const uniqueTables = Array.from(
    new Set((data || []).map((row) => row.table_name)),
  ).sort();

  return uniqueTables;
}
