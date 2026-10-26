import React from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { Card } from "../shared/Card";
import { Select } from "../shared/Select";
import { cn } from "../../utils/cn";
import type { Client, Project } from "../../types/client-project";

const TIMESHEET_FILTERS_COLLAPSED_STORAGE_KEY =
  "chronosync:timesheet:filters-collapsed";

const getInitialCollapsedState = () => {
  if (typeof window === "undefined") {
    return true;
  }

  return (
    window.localStorage.getItem(TIMESHEET_FILTERS_COLLAPSED_STORAGE_KEY) !==
    "false"
  );
};

interface TimesheetEntryFilterProps {
  clients: Client[];
  projects: Project[];
  selectedClientId: string;
  selectedProjectId: string;
  viewModeSwitcher: React.ReactNode;
  onClientChange: (clientId: string) => void;
  onProjectChange: (projectId: string) => void;
  onReset: () => void;
}

export const TimesheetEntryFilter: React.FC<TimesheetEntryFilterProps> = ({
  clients,
  projects,
  selectedClientId,
  selectedProjectId,
  viewModeSwitcher,
  onClientChange,
  onProjectChange,
  onReset,
}) => {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = React.useState(
    getInitialCollapsedState,
  );

  const availableClients = React.useMemo(() => {
    return clients
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [clients]);

  const availableProjects = React.useMemo(() => {
    if (!selectedClientId) {
      return [];
    }

    return projects
      .filter((project) => project.client_id === selectedClientId)
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [projects, selectedClientId]);

  const selectedClientExists =
    !selectedClientId ||
    availableClients.some((client) => client.id === selectedClientId);
  const selectedProjectExists =
    !selectedProjectId ||
    availableProjects.some((project) => project.id === selectedProjectId);

  React.useEffect(() => {
    if (!selectedClientExists) {
      onReset();
      return;
    }

    if (!selectedClientId && selectedProjectId) {
      onProjectChange("");
      return;
    }

    if (selectedClientId && !selectedProjectExists && selectedProjectId) {
      onProjectChange("");
    }
  }, [
    onProjectChange,
    onReset,
    selectedClientExists,
    selectedClientId,
    selectedProjectExists,
    selectedProjectId,
  ]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      TIMESHEET_FILTERS_COLLAPSED_STORAGE_KEY,
      String(isCollapsed),
    );
  }, [isCollapsed]);

  return (
    <Card className="relative z-10 min-w-0 overflow-visible p-2.5 sm:p-3">
      <div className="flex flex-col gap-2.5">
        <div className="flex min-w-0 flex-col gap-2.5 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
          <div className="flex w-full min-w-0 items-center sm:w-auto">
            {viewModeSwitcher}
          </div>

          <div className="flex w-full min-w-0 flex-col gap-3 xl:ml-auto xl:w-auto xl:flex-row xl:items-center xl:gap-2">
            <div
              inert={isCollapsed}
              className={cn(
                "grid min-w-0 grid-cols-1 gap-2 overflow-hidden transition-all duration-300 ease-out sm:grid-cols-2 xl:flex xl:items-center",
                isCollapsed
                  ? "pointer-events-none max-h-0 w-0 max-w-0 translate-x-[-10px] opacity-0"
                  : "max-h-40 w-full max-w-full translate-x-0 opacity-100 xl:w-auto xl:max-w-[600px]",
              )}
            >
              <Select
                value={selectedClientId}
                onChange={(event) => onClientChange(event.target.value)}
                label={t("timesheet.client")}
                className="w-full min-w-0 [&_.auth-input]:min-h-11 [&_.auth-input]:py-2 xl:w-[280px] xl:shrink-0"
              >
                <option value="">{t("timesheet.allClients")}</option>
                {availableClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>

              <Select
                value={selectedProjectId}
                onChange={(event) => onProjectChange(event.target.value)}
                label={t("timesheet.project")}
                className="w-full min-w-0 [&_.auth-input]:min-h-11 [&_.auth-input]:py-2 xl:w-[280px] xl:shrink-0"
                disabled={!selectedClientId}
                disabledReason={t("common.selectClientFirst")}
              >
                <option value="">
                  {selectedClientId
                    ? t("timesheet.allProjects")
                    : t("common.selectClientFirst")}
                </option>
                {availableProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-w-0 flex-1 px-2.5 [&>span]:min-w-0 [&>span]:whitespace-normal [&>span]:text-center [&>span]:leading-tight sm:flex-none sm:px-4"
                aria-expanded={!isCollapsed}
                onClick={() => setIsCollapsed((open) => !open)}
                icon={
                  isCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )
                }
              >
                {isCollapsed
                  ? t("timesheet.filtersExpand")
                  : t("timesheet.filtersCollapse")}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onReset}
                disabled={!selectedClientId && !selectedProjectId}
                icon={<X className="text-danger" />}
                className="min-w-0 flex-1 border-danger/30 px-2.5 [&>span]:min-w-0 [&>span]:whitespace-normal [&>span]:text-center [&>span]:leading-tight sm:flex-none sm:px-4"
              >
                {t("common.clearFilters")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
