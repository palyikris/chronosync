import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { Card, CardContent, CardHeader } from "../shared/Card";
import type { ClientProjectUtilizationGroup } from "../../types/dashboard";

interface ProjectUtilizationPanelProps {
  groups: ClientProjectUtilizationGroup[];
}

const getUtilizationTone = (utilizationPct: number) => {
  if (utilizationPct > 100) return "red";
  if (utilizationPct >= 50) return "yellow";
  return "green";
};

const toneClasses: Record<"green" | "yellow" | "red", string> = {
  green: "bg-[#4e6700]",
  yellow: "bg-amber-400",
  red: "bg-red-500",
};

const toneTextClasses: Record<"green" | "yellow" | "red", string> = {
  green: "text-[#4e6700]",
  yellow: "text-amber-600",
  red: "text-red-600",
};

export const ProjectUtilizationPanel: React.FC<
  ProjectUtilizationPanelProps
> = ({ groups }) => {
  const { t } = useTranslation();
  const [expandedClients, setExpandedClients] = useState<
    Record<string, boolean>
  >({});

  return (
    <Card className="border-border-strong">
      <CardHeader className="bg-bg-accent/80">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-text">
                {t("dashboard.projectUtilizationTitle")}
              </h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-strong">
                {groups.length} clients
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {t("dashboard.projectUtilizationSubtitle")}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {groups.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted">
            {t("dashboard.projectUtilizationEmpty")}
          </div>
        ) : (
          groups.map((group) => {
            const isExpanded = expandedClients[group.clientId] ?? false;
            const clientTone = getUtilizationTone(group.utilizationPct);

            return (
              <section
                key={group.clientId}
                className="overflow-hidden rounded-2xl border border-border-strong bg-surface-strong shadow-sm"
              >
                <div className="flex flex-col gap-3 border-b border-border-strong px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-text">
                        {group.clientName}
                      </h3>
                      <span className="rounded-full bg-bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                        {group.projects.length} projects
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {group.loggedHours.toFixed(1)} /{" "}
                      {group.estimatedHours.toFixed(1)} hrs
                    </p>
                  </div>

                  <div className="flex items-center gap-3 md:justify-end">
                    <div className="min-w-0 text-right">
                      <div
                        className={`text-lg font-extrabold ${toneTextClasses[clientTone]}`}
                      >
                        {group.utilizationPct > 100
                          ? `${group.utilizationPct}%`
                          : `${group.utilizationPct}%`}
                      </div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted">
                        {group.loggedHours.toFixed(1)} logged
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full border-border-strong bg-bg-accent text-muted transition-transform hover:text-text"
                      aria-label={
                        isExpanded
                          ? `Collapse ${group.clientName}`
                          : `Expand ${group.clientName}`
                      }
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpandedClients((current) => ({
                          ...current,
                          [group.clientId]: !isExpanded,
                        }))
                      }
                      icon={
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : "rotate-0"
                          }`}
                        />
                      }
                    />
                  </div>
                </div>

                <div className="px-4 py-4">
                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-[#e7e8e9]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${toneClasses[clientTone]}`}
                      style={{
                        width: `${Math.min(Math.max(group.utilizationPct, 0), 100)}%`,
                      }}
                    />
                  </div>

                  {isExpanded ? (
                    <div className="space-y-3">
                      {group.projects.map((project) => {
                        const tone = getUtilizationTone(project.utilizationPct);
                        const progressWidth = Math.min(
                          Math.max(project.utilizationPct, 0),
                          100,
                        );

                        return (
                          <div
                            key={project.projectId}
                            className="rounded-xl border border-border-strong bg-bg-accent/40 p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-text">
                                  {project.projectName}
                                </div>
                                <div className="mt-1 text-xs text-muted">
                                  {project.loggedHours.toFixed(1)} /{" "}
                                  {project.estimatedHours.toFixed(1)} hrs
                                </div>
                              </div>

                              <div
                                className={`text-sm font-bold ${toneTextClasses[tone]}`}
                              >
                                {project.utilizationPct > 100
                                  ? `${project.utilizationPct}%`
                                  : `${project.utilizationPct}%`}
                              </div>
                            </div>

                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e7e8e9]">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${toneClasses[tone]}`}
                                style={{ width: `${progressWidth}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
