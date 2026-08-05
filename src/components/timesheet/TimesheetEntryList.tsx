import React from "react";
import {
  CalendarCheck2,
  Copy,
  Edit,
  History,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { Card, CardContent, CardFooter, CardHeader } from "../shared/Card";
import type { TimesheetEntryListProps } from "../../types/timesheet";
import {
  revertSubmittedTimesheetEntries,
  submitTimesheetEntries,
} from "../../services/timesheetService";
import { useQueryClient } from "@tanstack/react-query";

export const TimesheetEntryList: React.FC<TimesheetEntryListProps> = ({
  selectedDate,
  totalDailyHours,
  entries,
  allEntries,
  loading,
  onAddEntry,
  onEditEntry,
  onDuplicateEntry,
  onDeleteEntry,
  isUpdating,
  isDuplicating,
  isDeleting,
  clients,
  canManageTarget,
  viewMode,
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

  const handleSubmitDay = async () => {
    const entryIdsToSubmit = allEntries
      .filter(
        (entry) => entry.status === "draft" && entry.work_date === selectedDate,
      )
      .map((entry) => entry.id);
    await submitTimesheetEntries(entryIdsToSubmit);
    queryClient.invalidateQueries({
      queryKey: ["timesheets"],
    });
  };

  const handleSubmitWeek = async () => {
    const selectedDateObj = new Date(`${selectedDate}T12:00:00`);
    const startOfWeek = new Date(selectedDateObj);
    startOfWeek.setDate(selectedDateObj.getDate() - selectedDateObj.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const entryIdsToSubmit = allEntries
      .filter(
        (entry) =>
          entry.status === "draft" &&
          new Date(`${entry.work_date}T12:00:00`) >= startOfWeek &&
          new Date(`${entry.work_date}T12:00:00`) <= endOfWeek,
      )
      .map((entry) => entry.id);
    await submitTimesheetEntries(entryIdsToSubmit);
    queryClient.invalidateQueries({
      queryKey: ["timesheets"],
    });
  };

  const handleRevertToDraft = async (entryIds: string[]) => {
    await revertSubmittedTimesheetEntries(entryIds);
    queryClient.invalidateQueries({
      queryKey: ["timesheets"],
    });
  };

  const handleSubmitSingleEntry = async (entryId: string) => {
    await submitTimesheetEntries([entryId]);
    queryClient.invalidateQueries({
      queryKey: ["timesheets"],
    });
  };

  const handleSubmitMonth = async () => {
    const selectedDateObj = new Date(`${selectedDate}T12:00:00`);
    const startOfMonth = new Date(
      selectedDateObj.getFullYear(),
      selectedDateObj.getMonth(),
      1,
    );
    const endOfMonth = new Date(
      selectedDateObj.getFullYear(),
      selectedDateObj.getMonth() + 1,
      0,
    );

    const entryIdsToSubmit = allEntries
      .filter(
        (entry) =>
          entry.status === "draft" &&
          new Date(`${entry.work_date}T12:00:00`) >= startOfMonth &&
          new Date(`${entry.work_date}T12:00:00`) <= endOfMonth,
      )
      .map((entry) => entry.id);
    await submitTimesheetEntries(entryIdsToSubmit);
    queryClient.invalidateQueries({
      queryKey: ["timesheets"],
    });
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              {t("timesheet.selectedDay")}
            </p>
            <h3 className="mt-1 font-bold text-text">{selectedDayLabel}</h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 overflow-y-auto">
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
                  return "bg-gray-200 text-gray-800";
                case "submitted":
                  return "bg-blue-200 text-blue-800";
                case "approved":
                  return "bg-green-200 text-green-800";
                case "rejected":
                  return "bg-red-200 text-red-800";
                case "invoiced":
                  return "bg-purple-200 text-purple-800";
                default:
                  return "bg-gray-200 text-gray-800";
              }
            })();

            return (
              <div
                key={entry.id}
                className="group relative rounded-xl border border-border-strong bg-surface-strong p-3 transition-all hover:shadow-md"
              >
                <div className="mb-1 flex items-start justify-between">
                  <span className="rounded bg-[#e3e2e6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-strong">
                    {(() => {
                      const clientName =
                        clients.find((c) => c.id === entry.client_id)?.name ??
                        "";
                      return clientName || t("timesheet.unknownClient");
                    })()}
                  </span>
                  <span className="text-sm font-bold text-primary-strong">
                    {entry.hours_logged} hrs
                  </span>
                </div>

                <p className="mb-2 text-sm font-normal text-text">
                  {entry.description || t("timesheet.noDescription")}
                </p>

                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <History className="h-3.5 w-3.5" />
                    <span className={`rounded px-2 py-0.5 ${statusColorClass}`}>
                      {status}
                    </span>
                  </span>

                  {canManageTarget ? (
                    <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                      {entry.status === "draft" ||
                      entry.status === "rejected" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditEntry(entry)}
                          disabled={isUpdating}
                          className="h-8 w-8 rounded-full text-primary-strong hover:bg-[#e6f0d6]"
                          aria-label={t("timesheet.editEntry")}
                          icon={<Edit className="h-4 w-4" />}
                        ></Button>
                      ) : null}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDuplicateEntry(entry)}
                        disabled={isDuplicating}
                        className="h-8 w-8 rounded-full text-indigo-600 hover:bg-indigo-50"
                        aria-label={t("timesheet.duplicateToToday")}
                        icon={<Copy className="h-4 w-4" />}
                      ></Button>

                      {entry.status === "submitted" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevertToDraft([entry.id])}
                          disabled={isDuplicating}
                          className="h-8 w-8 rounded-full text-indigo-600 hover:bg-indigo-50"
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
                          className="h-8 w-8 rounded-full text-danger hover:bg-red-50"
                          aria-label={t("timesheet.deleteEntry")}
                          icon={<Trash2 className="h-4 w-4" />}
                        ></Button>
                      ) : null}

                      {entry.status === "draft" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSubmitSingleEntry(entry.id)}
                          disabled={isUpdating}
                          className="h-8 w-8 rounded-full text-green-600 hover:bg-green-50"
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

      {canManageTarget ? (
        <CardFooter
          className={
            viewMode === "calendar"
              ? "flex items-center justify-between gap-3"
              : "flex items-center justify-center gap-3 relative"
          }
        >
          <Button
            variant="primary"
            className="w-1/4 rounded-xl"
            onClick={onAddEntry}
            icon={<Plus className="h-4 w-4" />}
          >
            {t("timesheet.addEntry")}
          </Button>

          {viewMode === "calendar" ? (
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                className="rounded-xl"
                icon={<CalendarCheck2 className="h-4 w-4" />}
                onClick={handleSubmitDay}
              >
                {t("timesheet.day")}
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                icon={<CalendarCheck2 className="h-4 w-4" />}
                onClick={handleSubmitWeek}
              >
                {t("timesheet.week")}
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                icon={<CalendarCheck2 className="h-4 w-4" />}
                onClick={handleSubmitMonth}
              >
                {t("timesheet.month")}
              </Button>
            </div>
          ) : null}

          <div
            className={
              viewMode === "calendar"
                ? "absolute right-4 top-4 flex flex-col items-end gap-1"
                : "absolute right-4 top-auto bottom-auto flex flex-col items-end gap-1"
            }
          >
            <p className="text-sm text-muted">
              {totalDailyHours} {t("timesheet.hoursLogged")}
            </p>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
};