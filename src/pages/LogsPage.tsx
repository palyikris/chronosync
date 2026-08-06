import React, { useDeferredValue, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../components/shared/Card";
import { Input } from "../components/shared/Input";
import { Select } from "../components/shared/Select";
import {
  fetchAuditLogs,
  fetchAuditedTableNames,
} from "../services/logsService";
import type { AuditLogEntry, AuditOperation } from "../types/logs";
import { AuditLogHeader } from "../components/audit-logs/LogsHeader";
import { AuditLogTable } from "../components/audit-logs/LogsTable";

const AuditLogPage: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOp, setSelectedOp] = useState<string>("ALL");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const opsFilter: AuditOperation[] | undefined =
        selectedOp !== "ALL" ? ([selectedOp] as AuditOperation[]) : undefined;

      const res = await fetchAuditLogs({
        searchQuery: deferredSearchQuery,
        tableName: selectedTable || undefined,
        operations: opsFilter,
        page: currentPage,
        pageSize,
      });

      setLogs(res.data);
      setTotalCount(res.totalCount);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditedTableNames().then(setAvailableTables).catch(console.error);
  }, []);

  useEffect(() => {
    loadData();
  }, [deferredSearchQuery, selectedOp, selectedTable, currentPage]);

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

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_logs_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-12 sm:px-6 lg:px-8">
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