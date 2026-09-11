import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { Card } from "../shared/Card";
import { Select } from "../shared/Select";
import type { Client, Project } from "../../types/client-project";
import type { TimesheetEntry } from "../../types/timesheet";
import { X } from "lucide-react";
interface TimesheetEntryFilterProps {
  entries: TimesheetEntry[];
  clients: Client[];
  projects: Project[];
  selectedClientId: string;
  selectedProjectId: string;
  onClientChange: (clientId: string) => void;
  onProjectChange: (projectId: string) => void;
  onReset: () => void;
}

export const TimesheetEntryFilter: React.FC<TimesheetEntryFilterProps> = ({
  entries,
  clients,
  projects,
  selectedClientId,
  selectedProjectId,
  onClientChange,
  onProjectChange,
  onReset,
}) => {
  const { t } = useTranslation();

  const availableClients = React.useMemo(() => {
    const clientIds = new Set(entries.map((entry) => entry.client_id));

    return clients
      .filter((client) => clientIds.has(client.id))
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [clients, entries]);

  const availableProjects = React.useMemo(() => {
    if (!selectedClientId) {
      return [];
    }

    const projectIds = new Set(
      entries
        .filter((entry) => entry.client_id === selectedClientId)
        .map((entry) => entry.project_id),
    );

    return projects
      .filter((project) => projectIds.has(project.id))
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [entries, projects, selectedClientId]);

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

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              {t("timesheet.filterEntries")}
            </p>
            {/* <p className="mt-1 text-sm text-muted-strong">
              {t("timesheet.filterEntriesHint")}
            </p> */}
          </div>

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
      </div>
    </Card>
  );
};