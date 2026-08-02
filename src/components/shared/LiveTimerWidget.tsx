import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Clock3,
  Folder,
  FolderKanban,
  Play,
  Square,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { Button } from "./Button";
import { Card, CardContent } from "./Card";
import {
  fetchActiveClients,
  fetchActiveProjects,
} from "../../services/clientProjectService";
import {
  getActiveTimerState,
  startTimer,
  stopTimer,
  TIMESHEET_REFRESH_EVENT,
} from "../../services/timesheetService";
import type { ActiveTimerState } from "../../types/timesheet";

const formatElapsedTime = (elapsedMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
};

export const LiveTimerWidget: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [activeTimer, setActiveTimer] = useState<ActiveTimerState | null>(null);
  const [draftClientId, setDraftClientId] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftProjectId, setDraftProjectId] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [isHydratingTimer, setIsHydratingTimer] = useState(true);

  const { data: activeClients = [] } = useQuery({
    queryKey: ["active-clients", profile?.company_id ?? ""],
    queryFn: () => fetchActiveClients(profile?.company_id ?? ""),
    enabled: Boolean(profile?.company_id),
  });

  const { data: activeProjects = [] } = useQuery({
    queryKey: ["active-projects", profile?.company_id ?? "", draftClientId],
    queryFn: () => fetchActiveProjects(profile?.company_id ?? "", draftClientId),
    enabled: Boolean(profile?.company_id && draftClientId),
  });

  useEffect(() => {
    let isMounted = true;

    const hydrateTimer = async () => {
      if (!profile?.id) {
        setActiveTimer(null);
        setDraftDescription("");
        setDraftProjectId("");
        setIsHydratingTimer(false);
        return;
      }

      setIsHydratingTimer(true);

      try {
        const persistedTimer = await getActiveTimerState();
        if (!isMounted) return;

        setActiveTimer(persistedTimer);
        setDraftClientId(persistedTimer?.client_id ?? "");
        setDraftDescription(persistedTimer?.description ?? "");
        setDraftProjectId(persistedTimer?.project_id ?? "");
      } catch (error) {
        if (isMounted) {
          console.error("Failed to load active timer", error);
          setActiveTimer(null);
          setDraftClientId("");
          setDraftDescription("");
          setDraftProjectId("");
        }
      } finally {
        if (isMounted) {
          setIsHydratingTimer(false);
          setNow(Date.now());
        }
      }
    };

    void hydrateTimer();

    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!activeTimer) return;

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [activeTimer]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!profile?.id) return;

      if (event.key?.startsWith("chronosync:active-timer:")) {
        void getActiveTimerState().then((persistedTimer) => {
          setActiveTimer(persistedTimer);
          setDraftClientId(persistedTimer?.client_id ?? "");
          setDraftDescription(persistedTimer?.description ?? "");
          setDraftProjectId(persistedTimer?.project_id ?? "");
        });
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [profile?.id]);

  const elapsedMs = activeTimer
    ? Math.max(0, now - Date.parse(activeTimer.started_at))
    : 0;
  const timerDisplay = formatElapsedTime(elapsedMs);
  const isRunning = Boolean(activeTimer);
  const isActionDisabled =
    isHydratingTimer ||
    !profile?.company_id ||
    (!isRunning && (!draftClientId || !draftDescription.trim() || !draftProjectId));

  const handleClientChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setDraftClientId(event.target.value);
    setDraftProjectId("");
  };

  const handleStartTimer = async () => {
    if (!profile?.company_id || !draftDescription.trim() || !draftProjectId) {
      return;
    }

    try {
      const storedTimer = await startTimer({
        started_at: new Date().toISOString(),
        project_id: draftProjectId,
        description: draftDescription.trim(),
        company_id: profile.company_id,
        client_id: draftClientId,
      });

      setActiveTimer(storedTimer);
      setNow(Date.now());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("timesheet.timerStartFailed");
      window.alert(message);
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;

    try {
      await stopTimer(activeTimer);
      await queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      window.dispatchEvent(new Event(TIMESHEET_REFRESH_EVENT));
      setActiveTimer(null);
      setDraftDescription("");
      setDraftProjectId("");
      setNow(Date.now());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("timesheet.timerStopFailed");
      window.alert(message);
    }
  };

  return (
    <Card>
      <div className="h-1 bg-linear-to-r from-primary-strong via-primary to-primary/60" />

      <CardContent className="flex flex-col gap-3 px-3 py-3 lg:px-4 lg:py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

          <div className="flex items-center gap-3 rounded-2xl border border-border-strong bg-bg-accent px-3 py-2">
            <div className="flex h-10 min-w-20 items-center justify-center rounded-xl border border-border-strong bg-surface-strong px-2.5">
              <div className="font-mono text-lg font-semibold tracking-[0.16em] text-text lg:text-xl">
                {timerDisplay}
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                <Clock3 className="h-3 w-3" />
                {t("timesheet.readyToStart")}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-strong">
                {isRunning ? t("timesheet.timerRunning") : t("timesheet.timerIdle")}
              </div>
            </div>
          </div>

          <Button
            variant={isRunning ? "danger" : "primary"}
            type="button"
            onClick={isRunning ? handleStopTimer : handleStartTimer}
            disabled={isActionDisabled}
            className="min-w-32 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRunning ? (
              <Square className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
            {isRunning ? t("timesheet.stopTimer") : t("timesheet.startTimer")}
          </Button>
        </div>

        <div className="grid gap-2 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(0,1.15fr)]">
          <label className="flex flex-col gap-1.5 rounded-xl border border-border-strong bg-bg px-3 py-2 transition-colors focus-within:border-primary/40 focus-within:bg-bg-accent">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              <Folder className="h-3.5 w-3.5" />
              {t("timesheet.client")}
            </span>
            <select
              value={draftClientId}
              onChange={handleClientChange}
              disabled={isRunning || !activeClients.length}
              className="w-full border-0 bg-transparent text-sm text-text focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {activeClients.length
                  ? t("common.selectClient")
                  : t("timesheet.noActiveClients")}
              </option>
              {activeClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 rounded-xl border border-border-strong bg-bg px-3 py-2 transition-colors focus-within:border-primary/40 focus-within:bg-bg-accent">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              <FolderKanban className="h-3.5 w-3.5" />
              {t("timesheet.project")}
            </span>
            <select
              value={draftProjectId}
              onChange={(event) => setDraftProjectId(event.target.value)}
              disabled={isRunning || !draftClientId || !activeProjects.length}
              className="w-full border-0 bg-transparent text-sm text-text focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {!draftClientId
                  ? t("common.selectClientFirst")
                  : activeProjects.length
                    ? t("common.selectProject")
                    : t("timesheet.noActiveProjects")}
              </option>
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 rounded-xl border border-border-strong bg-bg px-3 py-2 transition-colors focus-within:border-primary/40 focus-within:bg-bg-accent">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              {t("timesheet.whatAreYouWorkingOn")}
            </span>
            <input
              value={draftDescription}
              onChange={(event) => setDraftDescription(event.target.value)}
              disabled={isRunning}
              placeholder={t("timesheet.taskDescriptionPlaceholder")}
              className="w-full border-0 bg-transparent text-sm text-text placeholder:text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

        </div>
      </CardContent>
    </Card>
  );
};