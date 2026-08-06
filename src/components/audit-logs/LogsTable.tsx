import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../shared/Card";
import { Modal } from "../shared/Modal";
import type { AuditLogEntry, AuditOperation } from "../../types/logs";

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  logs,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  isLoading = false,
}) => {
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(
    null,
  );
  const { t, i18n } = useTranslation();

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const renderBadge = (op: AuditOperation) => {
    switch (op) {
      case "INSERT":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
            {t("auditLogs.operationLabel.insert")}
          </span>
        );
      case "UPDATE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold uppercase tracking-wider">
            {t("auditLogs.operationLabel.update")}
          </span>
        );
      case "DELETE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold uppercase tracking-wider">
            {t("auditLogs.operationLabel.delete")}
          </span>
        );
    }
  };

  const copyToClipboard = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-strong bg-bg-accent text-xs font-semibold uppercase tracking-wider text-muted">
                <th className="p-4">{t("auditLogs.timestamp")}</th>
                <th className="p-4">{t("auditLogs.actor")}</th>
                <th className="p-4">{t("auditLogs.operation")}</th>
                <th className="p-4">{t("auditLogs.targetEntity")}</th>
                <th className="p-4">{t("auditLogs.changesSummary")}</th>
                <th className="w-12 p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-strong text-sm text-text">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-10 text-center text-muted"
                  >
                    {t("auditLogs.loadingRecords")}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-10 text-center text-muted"
                  >
                    {t("auditLogs.noMatchingLogs")}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const dateObj = new Date(log.created_at);
                  const locale = i18n.language;
                  const formattedTime = new Intl.DateTimeFormat(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  }).format(dateObj);
                  const formattedDate = new Intl.DateTimeFormat(locale).format(
                    dateObj,
                  );

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedEntry(log)}
                      className="group cursor-pointer transition-colors hover:bg-bg-accent"
                    >
                      <td className="p-4 whitespace-nowrap align-top">
                        <div className="flex flex-col">
                          <span className="font-medium">{formattedDate}</span>
                          <span className="text-xs text-muted">
                            {formattedTime}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 align-top">
                        <div className="flex items-center gap-3">
                          
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {log.profiles?.full_name
                                ?.substring(0, 2)
                                .toUpperCase() || t("auditLogs.systemInitials")}
                            </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-xs text-text">
                              {log.profiles?.full_name || t("auditLogs.systemProcess")}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 align-top">{renderBadge(log.operation)}</td>

                      <td className="p-4 align-top">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="rounded-full border border-border-strong bg-bg-accent px-2 py-0.5 font-mono text-[11px] text-text">
                            {log.table_name}
                          </span>
                          {log.record_id && (
                            <button
                              type="button"
                              onClick={(e) =>
                                copyToClipboard(e, log.record_id!)
                              }
                              aria-label={t("auditLogs.copyRecordId", {
                                recordId: log.record_id,
                              })}
                              className="flex items-center gap-1 text-muted transition-colors hover:text-text"
                            >
                              <span className="font-mono text-xs">
                                #{log.record_id.slice(0, 8)}
                              </span>
                              <span className="material-symbols-outlined text-[14px]">
                                content_copy
                              </span>
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="p-4 align-top font-mono text-xs text-muted">
                        {log.operation === "UPDATE" && log.changed_fields
                          ? t("auditLogs.updatedFields", {
                              fields: Object.keys(log.changed_fields).join(", "),
                            })
                          : log.operation === "INSERT"
                            ? t("auditLogs.rowCreated")
                            : t("auditLogs.rowRemoved")}
                      </td>

                      <td className="p-4 text-center align-top">
                        <span className="material-symbols-outlined text-muted transition-colors group-hover:text-primary">
                          chevron_right
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="flex items-center justify-between border-t border-border-strong bg-bg-accent p-4 text-xs text-muted">
          <span>
            {t("auditLogs.paginationSummary", {
              currentPage,
              totalPages,
              totalCount,
            })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              className="rounded-lg border border-border-strong bg-surface-strong p-1.5 transition-colors hover:bg-bg-accent disabled:opacity-50"
              aria-label={t("auditLogs.previousPage")}
            >
              <span className="material-symbols-outlined text-[18px] text-text">
                chevron_left
              </span>
            </button>
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              className="rounded-lg border border-border-strong bg-surface-strong p-1.5 transition-colors hover:bg-bg-accent disabled:opacity-50"
              aria-label={t("auditLogs.nextPage")}
            >
              <span className="material-symbols-outlined text-[18px] text-text">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </Card>

      {/* Audit Detail Modal */}
      <Modal
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title={t("auditLogs.recordDetailsTitle", {
          id: selectedEntry?.id || "",
        })}
        className="max-w-3xl"
      >
        {selectedEntry && (
          <div className="flex flex-col gap-4 text-sm m-4">
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border-strong bg-bg-accent p-4 sm:grid-cols-2">
              <div>
                <span className="text-xs text-muted">{t("auditLogs.targetTable")}</span>
                <p className="font-mono font-medium text-text">
                  {selectedEntry.table_name}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted">{t("auditLogs.recordId")}</span>
                <p className="font-mono font-medium text-text">
                  {selectedEntry.record_id || t("common.unknown")}
                </p>
              </div>
            </div>

            {selectedEntry.changed_fields ? (
              <div>
                <span className="text-xs font-semibold uppercase text-muted">
                  {t("auditLogs.fieldDiffs")}
                </span>
                <div className="mt-2 overflow-hidden rounded-2xl border border-border-strong">
                  <table className="w-full text-xs font-mono">
                    <thead className="bg-bg-accent text-muted">
                      <tr>
                        <th className="p-2 text-left">{t("auditLogs.field")}</th>
                        <th className="p-2 text-left">{t("auditLogs.oldValue")}</th>
                        <th className="p-2 text-left">{t("auditLogs.newValue")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-strong bg-surface-strong">
                      {Object.entries(selectedEntry.changed_fields).map(
                        ([field, diff]) => (
                          <tr key={field}>
                            <td className="p-2 font-bold text-text">{field}</td>
                            <td className="p-2 bg-danger/5 text-danger">
                              {JSON.stringify(diff.was)}
                            </td>
                            <td className="p-2 bg-primary/5 text-primary">
                              {JSON.stringify(diff.became)}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-xs font-semibold uppercase text-muted">
                  {t("auditLogs.payloadSnapshot")}
                </span>
                <pre className="mt-2 max-h-96 overflow-x-auto rounded-2xl border border-border-strong bg-bg-accent p-3 text-xs font-mono text-text">
                  {JSON.stringify(
                    selectedEntry.new_data || selectedEntry.old_data,
                    null,
                    2,
                  )}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};
