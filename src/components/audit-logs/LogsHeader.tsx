import React from "react";
import { Card } from "../shared/Card";
import { Button } from "../shared/Button";
import type { AuditLogEntry } from "../../types/logs";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";

interface AuditLogHeaderProps {
  logs: AuditLogEntry[];
  totalCount: number;
  onRefresh: () => void;
  onExportCsv: () => void;
  isLoading?: boolean;
}

export const AuditLogHeader: React.FC<AuditLogHeaderProps> = ({
  logs,
  totalCount,
  onRefresh,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  // Compute operation stats dynamically from available page data
  const inserts = logs.filter((l) => l.operation === "INSERT").length;
  const updates = logs.filter((l) => l.operation === "UPDATE").length;
  const deletes = logs.filter((l) => l.operation === "DELETE").length;
  const totalInPage = logs.length || 1;

  const insPct = Math.round((inserts / totalInPage) * 100);
  const updPct = Math.round((updates / totalInPage) * 100);
  const delPct = Math.round((deletes / totalInPage) * 100);

  return (
    <div className="flex flex-col gap-6">
      {/* Title & Top Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
            {t("auditLogs.title")}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={onRefresh}
            disabled={isLoading}
            className="rounded-full"
            icon={<RefreshCw className="h-4 w-4" />}
          >
            {t("auditLogs.refresh")}
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t("auditLogs.totalEvents")}
          </span>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold leading-none text-text">
              {totalCount.toLocaleString()}
            </span>
          </div>
        </Card>

        <Card className="p-5 flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t("auditLogs.primaryTarget")}
          </span>
          <span className="text-3xl font-bold leading-none text-primary">
            {t("auditLogs.primaryTargetValue")}
          </span>
          <span className="text-xs text-muted">
            {t("auditLogs.primaryTargetSubtitle")}
          </span>
        </Card>

        <Card className="p-5 flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t("auditLogs.accessScope")}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center rounded-full border border-border-strong bg-bg-accent px-2.5 py-0.5 text-xs font-medium text-text">
              {t("auditLogs.accessScopeValue")}
            </span>
          </div>
        </Card>

        <Card className="p-5 flex flex-col gap-3 justify-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t("auditLogs.operationBreakdown")}
          </span>
          <div className="flex h-3 w-full overflow-hidden rounded-full border border-border-strong bg-bg-accent">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${insPct}%` }}
              title={t("auditLogs.insertTooltip", { pct: insPct })}
            />
            <div
              className="h-full bg-primary/70 transition-all"
              style={{ width: `${updPct}%` }}
              title={t("auditLogs.updateTooltip", { pct: updPct })}
            />
            <div
              className="h-full bg-danger transition-all"
              style={{ width: `${delPct}%` }}
              title={t("auditLogs.deleteTooltip", { pct: delPct })}
            />
          </div>
          <div className="flex justify-between text-xs text-muted px-1">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary" />{" "}
              {t("auditLogs.insLabel", { pct: insPct })}
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary/70" />{" "}
              {t("auditLogs.updLabel", { pct: updPct })}
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-danger" />{" "}
              {t("auditLogs.delLabel", { pct: delPct })}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
