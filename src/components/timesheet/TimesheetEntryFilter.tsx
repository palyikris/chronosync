import React from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
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
  const filterPanelId = React.useId();
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
    <Card role="region" aria-label={t("timesheet.filterEntries")} className="relative z-10 min-w-0 p-3 sm:p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="w-full min-w-0 sm:w-auto">
          {viewModeSwitcher}
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
          <Button
            type="button"
            variant={isCollapsed ? "outline" : "secondary"}
            size="sm"
            className="min-w-0 flex-auto [&>span]:whitespace-normal [&>span]:leading-5 sm:flex-none"
            aria-expanded={!isCollapsed}
            aria-controls={filterPanelId}
            onClick={() => setIsCollapsed((collapsed) => !collapsed)}
            icon={<SlidersHorizontal className="h-4 w-4" />}
          >
            {isCollapsed ? t("timesheet.filtersExpand") : t("timesheet.filtersCollapse")}
            <ChevronDown className={cn("shrink-0 transition-transform", !isCollapsed && "rotate-180")} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={!selectedClientId && !selectedProjectId}
            icon={<X className="h-4 w-4" />}
            className="min-w-0 flex-auto [&>span]:whitespace-normal [&>span]:leading-5 sm:flex-none"
          >
            {t("common.clearFilters")}
          </Button>
        </div>
      </div>

      <div id={filterPanelId} hidden={isCollapsed}>
        {!isCollapsed ? (
          <div className="mt-4 grid min-w-0 gap-3 border-t border-border pt-4 sm:grid-cols-2">
            <Select
              value={selectedClientId}
              onChange={(event) => onClientChange(event.target.value)}
              label={t("timesheet.client")}
              className="w-full min-w-0 [&_.auth-input]:min-h-11 [&_.auth-input]:py-2"
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
              className="w-full min-w-0 [&_.auth-input]:min-h-11 [&_.auth-input]:py-2"
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
        ) : null}
      </div>
    </Card>
  );
};
