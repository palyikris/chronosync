import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { Client, Project } from "../../types/client-project";
import type { CompanyCalendarEntry, SelectableTimesheetUser } from "../../types/timesheet";
import { Card, CardContent, CardHeader } from "../shared/Card";
import { timesheetStatusColors } from "./timesheetStatusColors";

interface CompanyTimesheetDayPanelProps {
  date: string;
  entries: CompanyCalendarEntry[];
  employees: SelectableTimesheetUser[];
  clients: Client[];
  projects: Project[];
  hasFilters: boolean;
  loading: boolean;
  loadFailed: boolean;
}

export function CompanyTimesheetDayPanel({
  date, entries, employees, clients, projects, hasFilters, loading, loadFailed,
}: CompanyTimesheetDayPanelProps) {
  const { t, i18n } = useTranslation();
  const headingId = useId();
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language, {
    weekday: "short", month: "short", day: "numeric",
  });
  const hoursFormatter = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 });
  const employeeNames = new Map(employees.map(employee => [employee.id, employee.full_name]));
  const clientNames = new Map(clients.map(client => [client.id, client.name]));
  const projectNames = new Map(projects.map(project => [project.id, project.name]));
  const dayEntries = entries.map(entry => ({
    entry,
    employeeName: employeeNames.get(entry.user_id) || t("timesheet.unknownEmployee"),
  })).sort((a, b) => a.employeeName.localeCompare(b.employeeName, i18n.language));
  const totalHours = entries.reduce((total, entry) => total + Number(entry.hours_logged), 0);

  return (
    <Card
      role="region"
      aria-labelledby={headingId}
      aria-busy={loading}
      className="flex h-full min-h-0 min-w-0 flex-col"
    >
      <CardHeader className="shrink-0 bg-primary/15 px-4 py-3.5 sm:px-5 sm:py-4">
        <h2 id={headingId} className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          {t("timesheet.selectedDay")}
        </h2>
        <div aria-live="polite" className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <time dateTime={date} className="text-lg font-bold text-text">{dateLabel}</time>
          {!loading && !loadFailed ? (
            <span className="text-xs font-semibold tabular-nums text-primary-strong">
              {t("timesheet.durationShortcut", { duration: hoursFormatter.format(totalHours) })}
            </span>
          ) : null}
        </div>
      </CardHeader>

      <CardContent
        key={date}
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-3 focus-visible:ring-2 focus-visible:ring-primary-strong/45 focus-visible:ring-inset sm:p-4"
        tabIndex={dayEntries.length > 0 ? 0 : undefined}
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">{t("timesheet.loadingEntries")}</p>
        ) : loadFailed ? null : dayEntries.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            {t(hasFilters ? "timesheet.noEntriesMatchFilters" : "timesheet.noCompanyCalendarEntries")}
          </p>
        ) : (
          <ul className="space-y-3">
            {dayEntries.map(({ entry, employeeName }) => (
              <li key={entry.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-border-strong bg-surface-strong p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-semibold text-text [overflow-wrap:anywhere]">{employeeName}</p>
                  <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-sm font-semibold tabular-nums text-primary-strong">
                    {t("timesheet.durationShortcut", { duration: hoursFormatter.format(Number(entry.hours_logged)) })}
                  </span>
                </div>
                <p className="text-xs leading-5 text-muted-strong [overflow-wrap:anywhere]">
                  {clientNames.get(entry.client_id) ?? t("timesheet.unknownClient")}
                  {" · "}
                  {projectNames.get(entry.project_id) ?? t("timesheet.unknownProject")}
                </p>
                {entry.description?.trim() ? (
                  <p className="whitespace-pre-wrap text-sm leading-5 text-text [overflow-wrap:anywhere]">{entry.description}</p>
                ) : null}
                <div className="border-t border-border pt-3">
                  <span className={`inline-block max-w-full rounded-full px-2 py-1 text-[11px] font-medium ${timesheetStatusColors[entry.status]}`}>
                    {t(`timesheet.${entry.status}`)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
