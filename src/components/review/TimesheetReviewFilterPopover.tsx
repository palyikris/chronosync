import React from "react";
import { Filter, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PopoverPanel } from "../shared/PopoverPanel";
import { usePopoverDismiss } from "../../hooks/usePopoverDismiss";
import { Button } from "../shared/Button";
import { DatePicker } from "../shared/DatePicker";
import { Select } from "../shared/Select";
import type { Client, Project } from "../../types/client-project";
import type { TimesheetEntryStatus } from "../../types/timesheet";
import type { SelectableTimesheetUser } from "../../types/timesheet";

export interface TimesheetReviewFilterState {
  status: TimesheetEntryStatus | "all";
  userId: string | null;
  startDate: string | null;
  endDate: string | null;
  projectId: string | null;
  clientId: string | null;
}

interface TimesheetReviewFilterPopoverProps {
  filters: TimesheetReviewFilterState;
  onChange: (newFilters: TimesheetReviewFilterState) => void;
  clients: Client[];
  projects: Project[];
  isOpen: boolean;
  onToggle: () => void;
  onReset: () => void;
  employees: SelectableTimesheetUser[];
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

  const root = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const popoverId = React.useId();
  usePopoverDismiss(isOpen, root, trigger, onToggle);

  const selectedClient = filters.clientId
    ? (clients.find((client) => client.id === filters.clientId) ?? null)
    : null;
  const availableProjects = selectedClient
    ? projects
        .filter((project) => project.client_id === selectedClient.id)
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
    : [];
  const hasActiveFilters =
    filters.status !== "all" ||
    Boolean(filters.userId) ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    Boolean(filters.projectId) ||
    Boolean(filters.clientId);

  return (
    <div ref={root} className="relative inline-block text-left">
      <Button
        ref={trigger}
        id={`${popoverId}-trigger`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
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
        <PopoverPanel id={popoverId} trigger={trigger} title={t("timesheetReview.filterReview")} width={480}>
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
                value={filters.clientId ?? ""}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    clientId: event.target.value || null,
                    projectId: null,
                  })
                }
                label={t("timesheetReview.clientLabel")}
                className="w-full"
              >
                <option value="">{t("timesheetReview.allClients")}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Select
                value={filters.projectId ?? ""}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    projectId: event.target.value || null,
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
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </>
                )}
              </Select>
            </div>

            {/* <Input
              value={filters.userId ?? ""}
              onChange={(event) =>
                onChange({
                  ...filters,
                  userId: event.target.value || null,
                })
              }
              label={t("timesheetReview.userLabel")}
              className="w-full"
            /> */}

            <Select
              value={filters.userId ?? ""}
              onChange={(event) =>
                onChange({
                  ...filters,
                  userId: event.target.value || null,
                })
              }
              label={t("timesheetReview.userLabel")}
              className="w-full"
            >
              <option value="">{t("common.all")}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name || employee.id}
                </option>
              ))}
            </Select>

            {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"> */}
            <DatePicker
              value={filters.startDate ?? ""}
              max={filters.endDate ?? undefined}
              onChange={(value) =>
                onChange({
                  ...filters,
                  startDate: value || null,
                })
              }
              label={t("timesheetReview.startDateLabel")}
              className="w-full"
              placement="top"
            />
            <DatePicker
              value={filters.endDate ?? ""}
              min={filters.startDate ?? undefined}
              onChange={(value) =>
                onChange({
                  ...filters,
                  endDate: value || null,
                })
              }
              label={t("timesheetReview.endDateLabel")}
              className="w-full"
              align="end"
              placement="top"
            />
            {/* </div> */}
          </div>
        </PopoverPanel>
      )}
    </div>
  );
};
