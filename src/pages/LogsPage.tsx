import React, { useEffect, useState } from "react";
import { downloadCsv } from "../utils/downloadCsv";
import { useQuery } from "@tanstack/react-query";
import { LoadError } from "../components/shared/LoadError";
import { useTranslation } from "react-i18next";
import { Card } from "../components/shared/Card";
import { Input } from "../components/shared/Input";
import { Select } from "../components/shared/Select";
import {
  fetchAuditLogs,
  fetchAuditedTableNames,
} from "../services/logsService";
import type { AuditOperation } from "../types/logs";
import { AuditLogHeader } from "../components/audit-logs/LogsHeader";
import { AuditLogTable } from "../components/audit-logs/LogsTable";

const AuditLogPage: React.FC = () => {
  const { t } = useTranslation();
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOp, setSelectedOp] = useState<string>("ALL");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const tablesQuery = useQuery({ queryKey: ["audit-log-tables"], queryFn: fetchAuditedTableNames });
  const logsQuery = useQuery({
    queryKey: ["audit-logs", debouncedSearchQuery, selectedOp, selectedTable, currentPage],
    queryFn: ({ signal }) => fetchAuditLogs({
      searchQuery: debouncedSearchQuery,
      tableName: selectedTable || undefined,
      operations: selectedOp === "ALL" ? undefined : [selectedOp as AuditOperation],
      page: currentPage, pageSize,
    }, signal),
  });
  const logs = logsQuery.data?.data ?? [];
  const totalCount = logsQuery.data?.totalCount ?? 0;
  const availableTables = tablesQuery.data ?? [];
  const isLoading = logsQuery.isFetching || searchQuery !== debouncedSearchQuery;
  const loadData = () => { void logsQuery.refetch(); void tablesQuery.refetch(); };

  const handleExportCsv = () => {
    if (logs.length === 0) return;
    const headers = [
      t("auditLogs.csvId"),
      t("auditLogs.csvTable"),
      t("auditLogs.csvOperation"),
      t("auditLogs.csvActor"),
      t("auditLogs.csvCreatedAt"),
    ];
    const rows = logs.map((l) => [
      l.id,
      l.table_name,
      l.operation,
      l.profiles?.full_name || t("auditLogs.systemProcess"),
      l.created_at,
    ]);

    downloadCsv(`audit_logs_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-10">
      <AuditLogHeader
        logs={logs}
        totalCount={totalCount}
        onRefresh={loadData}
        onExportCsv={handleExportCsv}
        isLoading={isLoading}
      />

      <Card className="p-4 lg:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="w-full xl:max-w-sm xl:flex-1">
            <Input
              aria-label={t("auditLogs.searchPlaceholder")}
              placeholder={t("auditLogs.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="inline-flex w-full flex-wrap gap-2 rounded-2xl border border-border-strong bg-bg-accent p-1 xl:w-auto xl:flex-nowrap">
            {(["ALL", "INSERT", "UPDATE", "DELETE"] as const).map((op) => (
              <button
                key={op}
                onClick={() => {
                  setSelectedOp(op);
                  setCurrentPage(1);
                }}
                aria-pressed={selectedOp === op}
                className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                  selectedOp === op
                    ? "bg-surface-strong text-text shadow-sm"
                    : "text-muted hover:text-text"
                }`}
              >
                {t(`auditLogs.operationFilter.${op.toLowerCase()}`)}
              </button>
            ))}
          </div>

          <div className="w-full xl:ml-auto xl:w-64">
            <Select
              aria-label={t("auditLogs.allTables")}
              value={selectedTable}
              onChange={(e) => {
                setSelectedTable(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">{t("auditLogs.allTables")}</option>
              {availableTables.map((tbl) => (
                <option key={tbl} value={tbl}>
                  {tbl}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {logsQuery.isError || tablesQuery.isError ? <LoadError onRetry={loadData} retrying={isLoading} /> : null}

      <AuditLogTable
        logs={logs}
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AuditLogPage;
