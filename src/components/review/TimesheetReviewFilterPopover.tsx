import React, { useEffect } from "react";
import { Filter, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { Input } from "../shared/Input";
import { Select } from "../shared/Select";
import type { Client, Project } from "../../types/client-project";
import type { TimesheetEntryStatus } from "../../types/timesheet";

export interface TimesheetReviewFilterState {
  status: TimesheetEntryStatus | "all";
  user: string | null;
  startDate: string | null;
  endDate: string | null;
  project: string | null;
  client: string | null;
}

interface TimesheetReviewFilterPopoverProps {
  filters: TimesheetReviewFilterState;
  onChange: (newFilters: TimesheetReviewFilterState) => void;
  clients: Client[];
  projects: Project[];
  isOpen: boolean;
  onToggle: () => void;
  onReset: () => void;
  employees: string[];
}

export const TimesheetReviewFilterPopover: React.FC<
  TimesheetReviewFilterPopoverProps
> = ({
  filters,
  onChange,
  clients,
  projects,
  isOpen,
  onToggle,
  onReset,
  employees,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onToggle();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onToggle]);

  const selectedClient = filters.client
    ? (clients.find((client) => client.name === filters.client) ?? null)
    : null;
  const availableProjects = selectedClient
    ? projects
        .filter((project) => project.client_id === selectedClient.id)
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
    : [];
  const hasActiveFilters =
    filters.status !== "all" ||
    Boolean(filters.user) ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    Boolean(filters.project) ||
    Boolean(filters.client);

  return (
    <div className="relative inline-block text-left">
      <Button
        type="button"
        variant={hasActiveFilters ? "outline" : "secondary"}
        onClick={onToggle}
        className={
          hasActiveFilters
            ? "border-primary-strong bg-primary/20 text-primary-foreground"
            : "border-border-strong bg-white text-muted"
        }
        icon={<Filter className="w-4 h-4" />}
      >
        {t("timesheetReview.filters")}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-120 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl border border-border-strong shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-border">
            <span className="font-bold text-sm text-text">
              {t("timesheetReview.filterReview")}
            </span>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={onReset}
                className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" /> {t("timesheetReview.resetFilters")}
              </button>
            ) : null}
          </div>

          <div className="space-y-4 max-h-[70vh] py-4 overflow-y-auto pr-1">
            <div>
              <Select
                value={filters.status}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    status: event.target.value as TimesheetEntryStatus | "all",
                  })
                }
                label={t("timesheetReview.statusLabel")}
                className="w-full"
              >
                <option value="all">{t("timesheetReview.statusAll")}</option>
                <option value="submitted">
                  {t("timesheetReview.statusSubmitted")}
                </option>
                <option value="approved">
                  {t("timesheetReview.statusApproved")}
                </option>
                <option value="rejected">
                  {t("timesheetReview.statusRejected")}
                </option>
              </Select>
            </div>

            <div>
              <Select
                value={filters.client ?? ""}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    client: event.target.value || null,
                    project: null,
                  })
                }
                label={t("timesheetReview.clientLabel")}
                className="w-full"
              >
                <option value="">{t("timesheetReview.allClients")}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.name}>
                    {client.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Select
                value={filters.project ?? ""}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    project: event.target.value || null,
                  })
                }
                label={t("timesheetReview.projectLabel")}
                className="w-full"
                disabled={!selectedClient}
              >
                {!selectedClient ? (
                  <option value="">{t("common.selectClientFirst")}</option>
                ) : availableProjects.length === 0 ? (
                  <option value="">
                    {t("timesheetReview.noProjectsForClient")}
                  </option>
                ) : (
                  <>
                    <option value="">{t("timesheetReview.allProjects")}</option>
                    {availableProjects.map((project) => (
                      <option key={project.id} value={project.name}>
                        {project.name}
                      </option>
                    ))}
                  </>
                )}
              </Select>
            </div>

            {/* <Input
              value={filters.user ?? ""}
              onChange={(event) =>
                onChange({
                  ...filters,
                  user: event.target.value || null,
                })
              }
              label={t("timesheetReview.userLabel")}
              className="w-full"
            /> */}

            <Select
              value={filters.user ?? ""}
              onChange={(event) =>
                onChange({
                  ...filters,
                  user: event.target.value || null,
                })
              }
              label={t("timesheetReview.userLabel")}
              className="w-full"
            >
              <option value="">{t("common.all")}</option>
              {employees.map((employee) => (
                <option key={employee} value={employee}>
                  {employee}
                </option>
              ))}
            </Select>

            {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"> */}
            <Input
              type="date"
              value={filters.startDate ?? ""}
              onChange={(event) =>
                onChange({
                  ...filters,
                  startDate: event.target.value || null,
                })
              }
              label={t("timesheetReview.startDateLabel")}
              className="w-full"
            />
            <Input
              type="date"
              value={filters.endDate ?? ""}
              onChange={(event) =>
                onChange({
                  ...filters,
                  endDate: event.target.value || null,
                })
              }
              label={t("timesheetReview.endDateLabel")}
              className="w-full"
            />
            {/* </div> */}
          </div>
        </div>
      )}
    </div>
  );
};