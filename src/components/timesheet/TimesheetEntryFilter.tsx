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
    <Card className="relative z-10 overflow-visible p-3">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center self-center">{viewModeSwitcher}</div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-3 overflow-hidden transition-all duration-300 ease-out",
                isCollapsed
                  ? "pointer-events-none max-w-0 translate-x-[-10px] opacity-0"
                  : "max-w-[600px] translate-x-0 opacity-100",
              )}
            >
              <Select
                value={selectedClientId}
                onChange={(event) => onClientChange(event.target.value)}
                label={t("timesheet.client")}
                className="w-[280px] shrink-0"
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
                className="w-[280px] shrink-0"
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

            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-[2.75rem] min-h-[2.75rem] px-4 transition-transform duration-300 ease-out",
                  !isCollapsed && "translate-x-1",
                )}
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
                className="h-[2.75rem] min-h-[2.75rem] border-danger/30 px-4"
              >
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
