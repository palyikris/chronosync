import React, { useMemo, useState } from "react";
import { CalendarCheck2, CircleAlert, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { Card, CardContent, CardHeader } from "../shared/Card";
import { Select } from "../shared/Select";
import { TimesheetEntryCard } from "./TimesheetEntryCard";
import styles from "./TimesheetEntryList.module.css";
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
  lockedDates = [],
  hasEntryFilter = false,
  loadFailed = false,
  viewMode,
}) => {
  const { t, i18n } = useTranslation();
  const isAttentionView = viewMode === "attention";
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
    <Card className="flex h-full min-w-0 flex-col">
      <CardHeader className="bg-primary/15 px-4 py-3.5 sm:px-5 sm:py-4">
        {isAttentionView ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-white/75 text-primary-strong">
                <CircleAlert className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-text">{t("timesheet.needsAttention")}</h2>
                <p className="mt-1 text-[13px] leading-5 text-muted">{t("timesheet.needsAttentionDescription")}</p>
              </div>
            </div>
            {!loading && !loadFailed ? (
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700">
                  {t("timesheet.rejected")}
                  <span className="font-semibold tabular-nums">{entries.filter(entry => entry.status === "rejected").length}</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/75 px-2.5 py-1 text-slate-700">
                  {t("timesheet.draft")}
                  <span className="font-semibold tabular-nums">{entries.filter(entry => entry.status === "draft").length}</span>
                </span>
              </div>
            ) : null}
          </div>
        ) : (
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
        )}
      </CardHeader>

      {canManageTarget && !isAttentionView ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary/5 px-4 py-3">
          <div className="flex min-w-0 flex-[1_1_10rem] items-center gap-2">
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

      <CardContent className={`min-w-0 flex-1 p-3 sm:p-4 ${isAttentionView ? styles.attentionEntries : "space-y-3"}`}>
        {loading ? (
          <div className="col-span-full py-8 text-center text-sm text-muted">
            {t("timesheet.loadingEntries")}
          </div>
        ) : loadFailed ? null : entries.length === 0 ? (
          <div className="col-span-full space-y-3 py-10 text-center text-sm text-muted">
            {isAttentionView ? (
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-bg-accent text-primary-strong">
                {hasEntryFilter ? <FileText className="h-5 w-5" aria-hidden="true" /> : <CalendarCheck2 className="h-5 w-5" aria-hidden="true" />}
              </span>
            ) : null}
            <p className={isAttentionView ? "font-semibold text-text" : undefined}>
              {t(isAttentionView
                ? hasEntryFilter ? "timesheet.noAttentionMatches" : "timesheet.allCaughtUp"
                : hasEntryFilter ? "timesheet.noEntriesMatchFilters" : "timesheet.noEntries")}
            </p>
            <p>{t(isAttentionView
              ? hasEntryFilter ? "timesheet.clearAttentionFilters" : "timesheet.noAttentionEntries"
              : hasEntryFilter ? "timesheet.clearEntryFilters" : "timesheet.addFirstEntry")}</p>
          </div>
        ) : (
          entries.map((entry) => (
            <TimesheetEntryCard
              key={entry.id}
              entry={entry}
              clientName={clients.find(client => client.id === entry.client_id)?.name ?? t("timesheet.unknownClient")}
              projectName={projects.find(project => project.id === entry.project_id)?.name ?? t("timesheet.unknownProject")}
              showDate={isAttentionView}
              canManage={canManageTarget}
              isDateLocked={isAttentionView ? lockedDates.includes(entry.work_date) : isSelectedDateLocked}
              isUpdating={isUpdating}
              isDuplicating={isDuplicating}
              isDeleting={isDeleting}
              isStatusUpdating={isStatusUpdating}
              onEdit={() => onEditEntry(entry)}
              onDuplicate={() => onDuplicateEntry(entry)}
              onDelete={() => onDeleteEntry(entry.id)}
              onSubmit={() => handleSubmitSingleEntry(entry.id)}
              onRevert={() => handleRevertToDraft([entry.id])}
            />
          ))
        )}
      </CardContent>

    </Card>
  );
};
