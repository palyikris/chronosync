import React, { useMemo, useState } from "react";
import { ChevronDown, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader } from "../shared/Card";
import type {
  ClientProjectUtilizationGroup,
  ProjectUtilizationItem,
} from "../../types/dashboard";

interface ProjectUtilizationPanelProps {
  groups: ClientProjectUtilizationGroup[];
}

type UtilizationTone = "healthy" | "watch" | "over" | "unplanned";

interface UtilizationStatus {
  tone: UtilizationTone;
  labelKey: string;
}

const getUtilizationStatus = (
  utilizationPct: number,
  estimatedHours: number,
): UtilizationStatus => {
  if (estimatedHours <= 0) {
    return {
      tone: "unplanned",
      labelKey: "dashboard.projectUtilizationNoEstimate",
    };
  }

  if (utilizationPct > 100) {
    return {
      tone: "over",
      labelKey: "dashboard.projectUtilizationOverEstimate",
    };
  }

  if (utilizationPct >= 75) {
    return {
      tone: "watch",
      labelKey: "dashboard.projectUtilizationNearEstimate",
    };
  }

  return {
    tone: "healthy",
    labelKey: "dashboard.projectUtilizationOnTrack",
  };
};

const barClasses: Record<UtilizationTone, string> = {
  healthy: "bg-primary-strong",
  watch: "bg-amber-400",
  over: "bg-red-500",
  unplanned: "bg-red-400",
};

const badgeClasses: Record<UtilizationTone, string> = {
  healthy: "border-primary-strong/15 bg-primary/20 text-primary-strong",
  watch: "border-amber-200 bg-amber-50 text-amber-700",
  over: "border-red-200 bg-red-50 text-red-700",
  unplanned: "border-red-200 bg-red-50 text-red-700",
};

const percentageClasses: Record<UtilizationTone, string> = {
  healthy: "text-primary-strong",
  watch: "text-amber-700",
  over: "text-red-700",
  unplanned: "text-red-700",
};

const getProgressWidth = (utilizationPct: number, estimatedHours: number) => {
  if (estimatedHours <= 0) return utilizationPct > 0 ? 100 : 0;
  return Math.min(Math.max(utilizationPct, 0), 100);
};

export const ProjectUtilizationPanel: React.FC<
  ProjectUtilizationPanelProps
> = ({ groups }) => {
  const { t, i18n } = useTranslation();
  const [expandedClients, setExpandedClients] = useState<
    Record<string, boolean>
  >({});

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language, {
        maximumFractionDigits: 1,
      }),
    [i18n.language],
  );

  const totals = useMemo(
    () =>
      groups.reduce(
        (summary, group) => ({
          estimatedHours: summary.estimatedHours + group.estimatedHours,
          loggedHours: summary.loggedHours + group.loggedHours,
        }),
        { estimatedHours: 0, loggedHours: 0 },
      ),
    [groups],
  );

  const totalUtilizationPct =
    totals.estimatedHours > 0
      ? Math.round((totals.loggedHours / totals.estimatedHours) * 100)
      : totals.loggedHours > 0
        ? 999
        : 0;
  const totalStatus = getUtilizationStatus(
    totalUtilizationPct,
    totals.estimatedHours,
  );

  const formatHours = (hours: number) =>
    t("dashboard.projectUtilizationHoursShort", {
      value: numberFormatter.format(hours),
    });

  const getBalanceLabel = (item: {
    estimatedHours: number;
    loggedHours: number;
  }) => {
    if (item.estimatedHours <= 0) {
      return t("dashboard.projectUtilizationNoEstimate");
    }

    const difference = item.estimatedHours - item.loggedHours;
    if (difference > 0) {
      return t("dashboard.projectUtilizationRemaining", {
        hours: formatHours(difference),
      });
    }

    if (difference < 0) {
      return t("dashboard.projectUtilizationOverBy", {
        hours: formatHours(Math.abs(difference)),
      });
    }

    return t("dashboard.projectUtilizationAtEstimate");
  };

  const renderProject = (project: ProjectUtilizationItem) => {
    const status = getUtilizationStatus(
      project.utilizationPct,
      project.estimatedHours,
    );

    return (
      <div
        key={project.projectId}
        className="grid gap-3 border-t border-border px-3 py-3 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.8fr)_5rem] sm:items-center sm:gap-5"
      >
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-text">
            {project.projectName}
          </div>
          <div className="mt-0.5 text-[11px] text-muted sm:hidden">
            {getBalanceLabel(project)}
          </div>
        </div>

        <div className="min-w-0">
          {project.estimatedHours > 0 ? (
            <>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[11px]">
                <span className="font-semibold text-text">
                  {formatHours(project.loggedHours)}
                  <span className="ml-1 font-normal text-muted">
                    {t("dashboard.projectUtilizationLogged").toLowerCase()}
                  </span>
                </span>
                <span className="text-muted">
                  {formatHours(project.estimatedHours)} {t("dashboard.projectUtilizationEstimate").toLowerCase()}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${barClasses[status.tone]}`}
                  style={{
                    width: `${getProgressWidth(project.utilizationPct, project.estimatedHours)}%`,
                  }}
                />
              </div>
            </>
          ) : (
            <div className="text-[11px] font-semibold text-text">
              {formatHours(project.loggedHours)}
              <span className="ml-1 font-normal text-muted">
                {t("dashboard.projectUtilizationLogged").toLowerCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
          <span className="text-[11px] text-muted sm:hidden">
            {t(status.labelKey)}
          </span>
          {project.estimatedHours > 0 ? (
            <span
              className={`text-sm font-bold tabular-nums ${percentageClasses[status.tone]}`}
            >
              {project.utilizationPct}%
            </span>
          ) : (
            <span className="hidden text-[10px] font-medium text-red-700 sm:inline">
              {t(status.labelKey)}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border-strong">
      <CardHeader className="bg-surface-strong/70 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-strong/10 bg-primary/25 text-primary-strong">
            <Target className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-text">
                {t("dashboard.projectUtilizationTitle")}
              </h2>
              {groups.length > 0 ? (
                <span className="rounded-full border border-border bg-bg-accent px-2 py-0.5 text-[10px] font-semibold text-muted-strong">
                  {t("dashboard.projectUtilizationClientCount", {
                    count: groups.length,
                  })}
                </span>
              ) : null}
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-muted">
              {t("dashboard.projectUtilizationSubtitle")}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-5">
        {groups.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted">
            {t("dashboard.projectUtilizationEmpty")}
          </div>
        ) : (
          <>
            <section className="rounded-xl border border-primary-strong/10 bg-[linear-gradient(120deg,rgba(207,231,143,0.22),rgba(250,251,245,0.68))] px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-strong">
                    {t("dashboard.projectUtilizationPortfolio")}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-2xl font-semibold tracking-[-0.035em] text-text tabular-nums">
                      {formatHours(totals.loggedHours)}
                    </span>
                    <span className="text-xs text-muted">
                      {t("dashboard.projectUtilizationOfEstimate", {
                        estimate: formatHours(totals.estimatedHours),
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 sm:flex-col sm:items-end sm:gap-1">
                  <span
                    className={`text-xl font-bold tracking-[-0.025em] tabular-nums ${percentageClasses[totalStatus.tone]}`}
                  >
                    {totals.estimatedHours > 0 ? `${totalUtilizationPct}%` : "—"}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClasses[totalStatus.tone]}`}
                  >
                    {t(totalStatus.labelKey)}
                  </span>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70 shadow-[inset_0_0_0_1px_rgba(91,104,66,0.06)]">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${barClasses[totalStatus.tone]}`}
                  style={{
                    width: `${getProgressWidth(totalUtilizationPct, totals.estimatedHours)}%`,
                  }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-muted">
                <span>{getBalanceLabel(totals)}</span>
                <span>{t("dashboard.projectUtilizationEstimateMarker")}</span>
              </div>
            </section>

            <div className="flex items-center justify-between px-1 pt-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-strong">
                {t("dashboard.projectUtilizationClients")}
              </h3>
              <span className="hidden text-[10px] text-muted sm:block">
                {t("dashboard.projectUtilizationExpandHint")}
              </span>
            </div>

            <div className="space-y-2.5">
              {groups.map((group) => {
                const isExpanded = expandedClients[group.clientId] ?? false;
                const status = getUtilizationStatus(
                  group.utilizationPct,
                  group.estimatedHours,
                );
                const projectsId = `client-projects-${group.clientId}`;

                return (
                  <section
                    key={group.clientId}
                    className="overflow-hidden rounded-xl border border-border bg-surface-strong transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-[0_4px_16px_rgba(75,87,57,0.05)]"
                  >
                    <button
                      type="button"
                      className="w-full px-4 py-3.5 text-left focus-visible:outline-offset-[-3px] sm:px-5 sm:py-4"
                      aria-label={t(
                        isExpanded
                          ? "dashboard.projectUtilizationCollapseClient"
                          : "dashboard.projectUtilizationExpandClient",
                        { clientName: group.clientName },
                      )}
                      aria-expanded={isExpanded}
                      aria-controls={projectsId}
                      onClick={() =>
                        setExpandedClients((current) => ({
                          ...current,
                          [group.clientId]: !isExpanded,
                        }))
                      }
                    >
                      <div className="flex items-start gap-3 sm:items-center">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h4 className="truncate text-[13px] font-semibold text-text">
                              {group.clientName}
                            </h4>
                            <span className="rounded-full bg-bg px-2 py-0.5 text-[10px] font-medium text-muted">
                              {t("dashboard.projectUtilizationProjectCount", {
                                count: group.projects.length,
                              })}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted">
                            {getBalanceLabel(group)}
                          </p>
                        </div>

                        <div className="hidden min-w-40 text-right sm:block">
                          {group.estimatedHours > 0 ? (
                            <>
                              <div className="text-xs font-semibold text-text tabular-nums">
                                {formatHours(group.loggedHours)}
                                <span className="mx-1 font-normal text-muted">/</span>
                                <span className="font-normal text-muted">
                                  {formatHours(group.estimatedHours)}
                                </span>
                              </div>
                              <div className="mt-0.5 text-[10px] text-muted">
                                {t("dashboard.projectUtilizationActualVsEstimate")}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs font-semibold text-text tabular-nums">
                              {formatHours(group.loggedHours)}
                              <span className="ml-1 font-normal text-muted">
                                {t("dashboard.projectUtilizationLogged").toLowerCase()}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2.5">
                          {group.estimatedHours > 0 ? (
                            <span
                              className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold sm:inline-flex ${badgeClasses[status.tone]}`}
                            >
                              <span className="text-xs font-bold tabular-nums">
                                {group.utilizationPct}%
                              </span>
                              <span className="h-3 w-px bg-current opacity-20" aria-hidden="true" />
                              <span>{t(status.labelKey)}</span>
                            </span>
                          ) : null}
                          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg-accent text-muted transition-colors hover:text-text">
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : "rotate-0"
                              }`}
                              aria-hidden="true"
                            />
                          </span>
                        </div>
                      </div>

                      {group.estimatedHours > 0 ? (
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-[width] duration-500 ${barClasses[status.tone]}`}
                            style={{
                              width: `${getProgressWidth(group.utilizationPct, group.estimatedHours)}%`,
                            }}
                          />
                        </div>
                      ) : null}
                      <div className="mt-2 flex items-center justify-between gap-3 sm:hidden">
                        <span className="text-[10px] text-muted">
                          {group.estimatedHours > 0
                            ? `${formatHours(group.loggedHours)} / ${formatHours(group.estimatedHours)}`
                            : `${formatHours(group.loggedHours)} ${t("dashboard.projectUtilizationLogged").toLowerCase()}`}
                        </span>
                        {group.estimatedHours > 0 ? (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${badgeClasses[status.tone]}`}
                          >
                            {group.utilizationPct}% · {t(status.labelKey)}
                          </span>
                        ) : null}
                      </div>
                    </button>

                    {isExpanded ? (
                      <div
                        id={projectsId}
                        className="border-t border-border bg-bg-accent/45 px-2 py-2 sm:px-3"
                      >
                        <div className="hidden grid-cols-[minmax(0,1fr)_minmax(12rem,0.8fr)_5rem] gap-5 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted sm:grid">
                          <span>{t("dashboard.projectUtilizationProject")}</span>
                          <span>{t("dashboard.projectUtilizationLoggedVsEstimate")}</span>
                          <span className="text-right">
                            {t("dashboard.projectUtilizationUsed")}
                          </span>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-border bg-surface-strong/85">
                          {group.projects.map(renderProject)}
                        </div>
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
