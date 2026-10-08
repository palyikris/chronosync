import React from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { Card } from "../shared/Card";
import { Select } from "../shared/Select";
import type { Client, Project } from "../../types/client-project";

const TIMESHEET_FILTERS_COLLAPSED_STORAGE_KEY =
  "chronosync:timesheet:filters-collapsed";

const getInitialCollapsedState = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.localStorage.getItem(TIMESHEET_FILTERS_COLLAPSED_STORAGE_KEY) ===
    "true"
  );
};

interface TimesheetEntryFilterProps {
  clients: Client[];
  projects: Project[];
  selectedClientId: string;
  selectedProjectId: string;
  onClientChange: (clientId: string) => void;
  onProjectChange: (projectId: string) => void;
  onReset: () => void;
}

export const TimesheetEntryFilter: React.FC<TimesheetEntryFilterProps> = ({
  clients,
  projects,
  selectedClientId,
  selectedProjectId,
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

  const hasActiveFilter = Boolean(selectedClientId);

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
    <Card className="overflow-visible p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              {t("timesheet.filterEntries")}
            </p>
            {!isCollapsed ? (
              <p className="mt-1 text-sm text-muted-strong">
                {t("timesheet.filterEntriesHint")}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
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
              icon={<X size={20} color="#ba1a1a" />}
              className="border-danger"
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>

        {!isCollapsed ? (
          <>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Select
                value={selectedClientId}
                onChange={(event) => onClientChange(event.target.value)}
                label={t("timesheet.client")}
                className="w-full"
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
                className="w-full"
                disabled={!selectedClientId}
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

            <p className="text-xs text-muted-strong">
              {hasActiveFilter
                ? selectedProjectId
                  ? t("timesheet.filterEntriesActiveWithProject")
                  : t("timesheet.filterEntriesActive")
                : t("timesheet.filterEntriesInactive")}
            </p>
          </>
        ) : null}
      </div>
    </Card>
  );
};