import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Play, Square } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import type { ActiveTimerController } from "../../hooks/useActiveTimer";
import { Button } from "./Button";
import { Card, CardContent } from "./Card";
import {
  fetchActiveClients,
  fetchActiveProjects,
} from "../../services/clientProjectService";
import { Select } from "./Select";

export const LiveTimerWidget = ({ timer }: { timer: ActiveTimerController }) => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const {
    activeTimer,
    timerDisplay,
    isHydratingTimer,
    isSavingTimer,
    startActiveTimer,
    stopActiveTimer,
  } = timer;
  const [draftClientId, setDraftClientId] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftProjectId, setDraftProjectId] = useState("");
  const selectedClientId = activeTimer?.client_id ?? draftClientId;

  const { data: activeClients = [] } = useQuery({
    queryKey: ["active-clients", profile?.company_id ?? ""],
    queryFn: () => fetchActiveClients(profile?.company_id ?? ""),
    enabled: Boolean(profile?.company_id),
  });

  const { data: activeProjects = [] } = useQuery({
    queryKey: ["active-projects", profile?.company_id ?? "", selectedClientId],
    queryFn: () => fetchActiveProjects(profile?.company_id ?? "", selectedClientId),
    enabled: Boolean(profile?.company_id && selectedClientId),
  });

  const isRunning = Boolean(activeTimer);
  const isActionDisabled =
    isSavingTimer ||
    isHydratingTimer ||
    !profile?.company_id ||
    (!isRunning &&
      (!draftClientId || !draftDescription.trim() || !draftProjectId));

  const handleClientChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setDraftClientId(event.target.value);
    setDraftProjectId("");
  };

  const handleStartTimer = async () => {
    if (
      !profile?.company_id ||
      !draftClientId ||
      !draftDescription.trim() ||
      !draftProjectId
    ) return;
    const storedTimer = await startActiveTimer({
      started_at: new Date().toISOString(),
      project_id: draftProjectId,
      description: draftDescription.trim(),
      company_id: profile.company_id,
      client_id: draftClientId,
    });
    if (storedTimer) {
      setDraftClientId(storedTimer.client_id ?? "");
      setDraftProjectId("");
      setDraftDescription("");
    }
  };

  return (
    <Card className="relative overflow-visible border-primary-strong/10 bg-surface-strong/95 shadow-[0_12px_38px_rgba(75,87,57,0.075)]">
      <div
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary-strong/30 to-transparent"
        aria-hidden="true"
      />

      <CardContent className="p-3 sm:p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(15rem,0.75fr)_minmax(0,2.75fr)_auto] xl:items-end">
          <section className="relative h-11 min-h-11 overflow-hidden rounded-xl border border-primary-strong/12 bg-linear-to-br from-primary/25 via-bg-accent/85 to-white/70 px-4 py-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            <div
              className="pointer-events-none absolute -top-12 -right-10 h-28 w-28 rounded-full border border-primary-strong/10 bg-primary/15"
              aria-hidden="true"
            />

            <div role="timer" aria-live="off" className="relative flex h-full items-center justify-center font-mono text-[27px] leading-none font-semibold tracking-[0.09em] tabular-nums text-text">
              {timerDisplay}
            </div>
          </section>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(12rem,1.25fr)]">
            <div className="min-w-0">
              <label
                htmlFor="live-timer-client"
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.11em] text-muted"
              >
                {t("timesheet.client")}
              </label>
              <Select
                id="live-timer-client"
                value={selectedClientId}
                onChange={handleClientChange}
                disabled={isRunning || !activeClients.length}
                disabledReason={
                  isRunning
                    ? t("timesheet.timerRunning")
                    : t("timesheet.noActiveClients")
                }
                className="w-full [&_button.auth-input]:bg-white/75 [&_button.auth-input]:shadow-[0_1px_2px_rgba(75,87,57,0.04)]"
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
              </Select>
            </div>

            <div className="min-w-0">
              <label
                htmlFor="live-timer-project"
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.11em] text-muted"
              >
                {t("timesheet.project")}
              </label>
              <Select
                id="live-timer-project"
                value={activeTimer?.project_id ?? draftProjectId}
                onChange={(event) => setDraftProjectId(event.target.value)}
                disabled={
                  isRunning || !selectedClientId || !activeProjects.length
                }
                disabledReason={
                  isRunning
                    ? t("timesheet.timerRunning")
                    : !selectedClientId
                      ? t("common.selectClientFirst")
                      : t("timesheet.noActiveProjects")
                }
                className="w-full [&_button.auth-input]:bg-white/75 [&_button.auth-input]:shadow-[0_1px_2px_rgba(75,87,57,0.04)]"
              >
                <option value="">
                  {!selectedClientId
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
              </Select>
            </div>

            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
              <label
                htmlFor="live-timer-description"
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.11em] text-muted"
              >
                {t("timesheet.whatAreYouWorkingOn")}
              </label>
              <input
                id="live-timer-description"
                value={activeTimer?.description ?? draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                disabled={isRunning}
                placeholder={t("timesheet.taskDescriptionPlaceholder")}
                className="auth-input bg-white/75 shadow-[0_1px_2px_rgba(75,87,57,0.04)] placeholder:text-muted"
              />
            </div>
          </div>

          <div className="flex sm:justify-end">
            <Button
              variant={isRunning ? "danger" : "primary"}
              type="button"
              onClick={isRunning ? stopActiveTimer : handleStartTimer}
              disabled={isActionDisabled}
              className={`h-11 w-full px-5 text-[13px] sm:w-auto xl:min-w-40 disabled:cursor-not-allowed disabled:opacity-60 ${
                isRunning
                  ? "shadow-[0_6px_16px_rgba(162,89,82,0.18)]"
                  : "border-primary-strong! bg-primary-strong! text-white! shadow-[0_6px_16px_rgba(96,120,42,0.2)] hover:brightness-105"
              }`}
            >
              {isRunning ? (
                <Square className="fill-current" />
              ) : (
                <Play className="fill-current" />
              )}
              {isRunning
                ? t("timesheet.stopTimer")
                : t("timesheet.startTimer")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
