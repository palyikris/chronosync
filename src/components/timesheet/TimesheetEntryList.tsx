import React, { useMemo, useState } from "react";
import {
  CalendarCheck2,
  Copy,
  Edit,
  History,
  Trash2,
  Undo2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { Card, CardContent, CardHeader } from "../shared/Card";
import { Select } from "../shared/Select";
import type { TimesheetEntryListProps } from "../../types/timesheet";
import {
  revertSubmittedTimesheetEntries,
  submitTimesheetEntries,
} from "../../services/timesheetService";
import { useQueryClient } from "@tanstack/react-query";
import {
  getDraftEntryIdsForPeriod,
  type TimesheetSubmissionPeriod,
} from "../../utils/timesheetWorkflow";

export const TimesheetEntryList: React.FC<TimesheetEntryListProps> = ({
  selectedDate,
  totalDailyHours,
  entries,
  allEntries,
  loading,
  onEditEntry,
  onDuplicateEntry,
  onDeleteEntry,
  isUpdating,
  isDuplicating,
  isDeleting,
  clients,
  projects,
  canManageTarget,
  onFeedback,
  isSelectedDateLocked = false,
}) => {
  const { t, i18n } = useTranslation();
  const selectedDayLabel = new Date(
    `${selectedDate}T12:00:00`,
  ).toLocaleDateString(i18n.language, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const queryClient = useQueryClient();
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [submissionPeriod, setSubmissionPeriod] =
    useState<TimesheetSubmissionPeriod>("day");

  const draftEntryIds = useMemo(
    () => ({
      day: getDraftEntryIdsForPeriod(allEntries, selectedDate, "day"),
      week: getDraftEntryIdsForPeriod(allEntries, selectedDate, "week"),
      month: getDraftEntryIdsForPeriod(allEntries, selectedDate, "month"),
    }),
    [allEntries, selectedDate],
  );
  const selectedDraftEntryIds = draftEntryIds[submissionPeriod];

  const runStatusUpdate = async (update: () => Promise<void>) => {
    setIsStatusUpdating(true);

    try {
      await update();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["timesheets"] }),
        queryClient.invalidateQueries({ queryKey: ["timesheets-for-review"] }),
        queryClient.invalidateQueries({ queryKey: ["kpis"] }),
        queryClient.invalidateQueries({ queryKey: ["adminDashboard"] }),
      ]);
      onFeedback({
        type: "success",
        message: t("timesheet.statusUpdated"),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("timesheet.statusUpdateFailed");
      onFeedback({ type: "error", message });
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleSubmit = (entryIds: string[]) => {
    if (entryIds.length === 0) return;
    void runStatusUpdate(() => submitTimesheetEntries(entryIds));
  };

  const handleRevertToDraft = (entryIds: string[]) => {
    void runStatusUpdate(() => revertSubmittedTimesheetEntries(entryIds));
  };

  const handleSubmitSingleEntry = (entryId: string) => handleSubmit([entryId]);

  const submissionControls = (
    <div className="flex shrink-0 items-center gap-1.5">
      <Select
        id="timesheet-submission-period"
        aria-label={t("timesheet.submissionPeriod")}
        value={submissionPeriod}
        onChange={(event) =>
          setSubmissionPeriod(
            event.target.value as TimesheetSubmissionPeriod,
          )
        }
        disabled={isStatusUpdating}
        menuPlacement="bottom"
        className="w-[6.75rem] shrink-0 [&_.auth-input]:h-8 [&_.auth-input]:min-h-8 [&_.auth-input]:rounded-[8px] [&_.auth-input]:bg-surface-strong/80 [&_.auth-input]:px-2.5 [&_.auth-input]:py-0 [&_.auth-input>span]:text-[12px]"
      >
        <option value="day">
          {t("timesheet.day")} ({draftEntryIds.day.length})
        </option>
        <option value="week">
          {t("timesheet.week")} ({draftEntryIds.week.length})
        </option>
        <option value="month">
          {t("timesheet.month")} ({draftEntryIds.month.length})
        </option>
      </Select>
      <Button
        variant="primary"
        size="md"
        onClick={() => handleSubmit(selectedDraftEntryIds)}
        disabled={isStatusUpdating || selectedDraftEntryIds.length === 0}
      >
        {isStatusUpdating ? (
          t("timesheet.submitting")
        ) : (
          <>
            {t("timesheet.submitDrafts")}
            <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] tabular-nums">
              {selectedDraftEntryIds.length}
            </span>
          </>
        )}
      </Button>
    </div>
  );

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="bg-bg-accent/60 px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              {t("timesheet.selectedDay")}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h3 className="text-lg font-bold text-text">{selectedDayLabel}</h3>
              <span className="text-xs font-semibold tabular-nums text-primary-strong">
                {totalDailyHours.toFixed(2)} h
              </span>
            </div>
            {isSelectedDateLocked ? (
              <p className="mt-1 text-xs font-semibold text-amber-700">
                {t("leave.dateLockedForLeave")}
              </p>
            ) : null}
          </div>
        </div>
      </CardHeader>

      {canManageTarget ? (
        <div className="flex flex-col gap-2 border-b border-border bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-primary/15 text-primary-strong">
              <CalendarCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-text">
                {t("timesheet.submitDraftEntries")}
              </p>
              <p className="truncate text-xs text-muted">
                {t("timesheet.submissionPeriod")}
              </p>
            </div>
          </div>
          {submissionControls}
        </div>
      ) : null}

      <CardContent className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted">
            {t("timesheet.loadingEntries")}
          </div>
        ) : entries.length === 0 ? (
          <div className="space-y-3 py-10 text-center text-sm text-muted">
            <p>{t("timesheet.noEntries")}</p>
            <p>{t("timesheet.addFirstEntry")}</p>
          </div>
        ) : (
          entries.map((entry) => {
            const status = entry.status
              ? t(`timesheet.${entry.status}`)
              : t("timesheet.draft");

            const statusColorClass = (() => {
              switch (entry.status) {
                case "draft":
                  return "border-slate-300 bg-slate-100 text-slate-800";
                case "submitted":
                  return "border-blue-200 bg-blue-50 text-blue-800";
                case "approved":
                  return "border-green-200 bg-green-100 text-green-800";
                case "rejected":
                  return "border-red-300 bg-red-50 text-red-800";
                case "invoiced":
                  return "border-purple-200 bg-purple-50 text-purple-800";
                default:
                  return "border-slate-300 bg-slate-100 text-slate-800";
              }
            })();

            return (
              <div
                key={entry.id}
                className="group relative rounded-xl border border-border-strong bg-surface-strong p-3 shadow-[0_1px_2px_rgba(75,87,57,0.035)] transition-[border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-primary-strong/30 hover:shadow-card-hover sm:p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-xs font-bold uppercase tracking-[0.08em] text-muted-strong">
                      {clients.find((client) => client.id === entry.client_id)?.name ??
                        t("timesheet.unknownClient")}
                    </span>
                    <span className="truncate text-[13px] text-muted">
                      {projects.find((project) => project.id === entry.project_id)?.name ??
                        t("timesheet.unknownProject")}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-primary-strong">
                    {entry.hours_logged} hrs
                  </span>
                </div>

                <p className="mb-3 break-words text-sm font-normal leading-5 text-text">
                  {entry.description || t("timesheet.noDescription")}
                </p>

                <div className="flex flex-col items-stretch gap-2 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex items-center gap-1">
                    <History className="h-3.5 w-3.5" />
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusColorClass}`}>
                      {status}
                    </span>
                  </span>

                  {canManageTarget ? (
                    <div className="flex flex-wrap items-center justify-end gap-1 rounded-lg border border-border bg-bg-accent/45 p-0.5">
                      {entry.status === "draft" ||
                      entry.status === "rejected" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditEntry(entry)}
                          disabled={isUpdating}
                          className="text-primary-strong hover:bg-green-100"
                          tooltip={t("timesheet.editEntry")}
                          aria-label={t("timesheet.editEntry")}
                          icon={<Edit className="h-4 w-4" />}
                        ></Button>
                      ) : null}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDuplicateEntry(entry)}
                        disabled={isDuplicating || isSelectedDateLocked}
                        className="text-indigo-600 hover:bg-indigo-50"
                        tooltip={t("timesheet.copyEntry")}
                        aria-label={t("timesheet.copyEntry")}
                        icon={<Copy className="h-4 w-4" />}
                      ></Button>

                      {entry.status === "submitted" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevertToDraft([entry.id])}
                          disabled={isStatusUpdating}
                          className="text-indigo-600 hover:bg-indigo-50"
                          tooltip={t("timesheet.revertToDraft")}
                          aria-label={t("timesheet.revertToDraft")}
                          icon={<Undo2 className="w-4 h-4" />}
                        ></Button>
                      ) : null}

                      {entry.status === "draft" ||
                      entry.status === "rejected" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteEntry(entry.id)}
                          disabled={isDeleting}
                          className="text-danger hover:bg-red-50"
                          tooltip={t("timesheet.deleteEntry")}
                          aria-label={t("timesheet.deleteEntry")}
                          icon={<Trash2 className="h-4 w-4" />}
                        ></Button>
                      ) : null}

                      {entry.status === "draft" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSubmitSingleEntry(entry.id)}
                          disabled={isUpdating || isStatusUpdating}
                          className="text-green-600 hover:bg-green-50"
                          tooltip={t("timesheet.submitEntry")}
                          aria-label={t("timesheet.submitEntry")}
                          icon={<CalendarCheck2 className="h-4 w-4" />}
                        ></Button>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <span className="text-xs text-muted">Read only</span>
                      <span className="text-xs text-muted">
                        {t("timesheet.readOnly")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>

    </Card>
  );
};
