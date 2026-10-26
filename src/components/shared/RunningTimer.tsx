import { ArrowUpRight, Square } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import type { ActiveTimerController } from "../../hooks/useActiveTimer";
import { fetchClients, fetchProjects } from "../../services/clientProjectService";
import { Button } from "./Button";

export const RunningTimer = ({ timer }: { timer: ActiveTimerController }) => {
  const { t } = useTranslation();
  const { activeTimer } = timer;
  const { data: clients = [] } = useQuery({
    queryKey: ["timer-clients", activeTimer?.company_id],
    queryFn: () => fetchClients(activeTimer!.company_id),
    enabled: Boolean(activeTimer),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["timer-projects", activeTimer?.company_id, activeTimer?.client_id],
    queryFn: () => fetchProjects(activeTimer!.company_id, activeTimer!.client_id),
    enabled: Boolean(activeTimer),
  });
  if (!activeTimer) return null;

  const project = projects.find((item) => item.id === activeTimer.project_id);
  const client = clients.find((item) => item.id === (activeTimer.client_id ?? project?.client_id));
  const clientName = client?.name ?? t("timesheet.client");
  const projectName = project?.name ?? t("timesheet.project");

  return (
    <div
      role="group"
      aria-label={t("timesheet.liveTimerTitle")}
      className="mx-auto flex w-full items-center gap-3 border-t border-border px-3.5 py-2 sm:px-5 lg:rounded-2xl lg:border lg:bg-surface/95 lg:px-3 lg:shadow-card lg:backdrop-blur-2xl"
    >
      <Link
        to="/timesheet"
        aria-label={t("timesheet.returnToTimer")}
        title={t("timesheet.returnToTimer")}
        className="grid min-h-11 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 rounded-lg px-2 text-text transition-colors hover:bg-primary/10 sm:flex"
      >
        <span aria-hidden="true" className="hidden h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary-strong motion-reduce:animate-none sm:block" />
        <span className="col-span-2 block min-w-0 flex-1">
          <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-primary-strong lg:block">
            {t("timesheet.timerRunning")}
          </span>
          <span className="flex min-w-0 flex-col text-xs font-semibold sm:flex-row sm:items-center sm:gap-1">
            <span className="truncate sm:max-w-[45%]" title={clientName}>{clientName}</span>
            <span aria-hidden="true" className="hidden text-muted sm:inline">/</span>
            <span className="min-w-0 truncate" title={projectName}>{projectName}</span>
          </span>
          <span className="hidden truncate text-xs text-muted sm:block" title={activeTimer.description}>
            {activeTimer.description}
          </span>
        </span>
        <span role="timer" aria-live="off" className="font-mono text-base font-semibold tabular-nums tracking-wide">
          {timer.timerDisplay}
        </span>
        <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
      </Link>
      <Button
        variant="danger"
        onClick={timer.stopActiveTimer}
        disabled={timer.isSavingTimer || timer.isHydratingTimer}
        aria-label={t("timesheet.stopTimer")}
        aria-busy={timer.isSavingTimer}
        title={t("timesheet.stopTimer")}
        className="min-h-11 min-w-11 sm:min-h-11"
      >
        <Square aria-hidden="true" className="fill-current" />
        <span className="hidden sm:inline">{t("timesheet.stopTimer")}</span>
      </Button>
    </div>
  );
};
