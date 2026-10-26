import { CalendarCheck2, Copy, Edit, LockKeyhole, Trash2, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { TimesheetRejectionNotice } from "./TimesheetRejectionNotice";
import type { TimesheetEntry, TimesheetEntryStatus } from "../../types/timesheet";
import styles from "./TimesheetEntryCard.module.css";

const statusStyles: Record<TimesheetEntryStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  submitted: "border-blue-200 bg-blue-50 text-blue-800",
  approved: "border-green-200 bg-green-50 text-green-800",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  invoiced: "border-purple-200 bg-purple-50 text-purple-800",
};

interface TimesheetEntryCardProps {
  entry: TimesheetEntry;
  clientName: string;
  projectName: string;
  showDate: boolean;
  canManage: boolean;
  isDateLocked: boolean;
  isUpdating: boolean;
  isDuplicating: boolean;
  isDeleting: boolean;
  isStatusUpdating: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSubmit: () => void;
  onRevert: () => void;
}

export function TimesheetEntryCard({
  entry, clientName, projectName, showDate, canManage, isDateLocked,
  isUpdating, isDuplicating, isDeleting, isStatusUpdating,
  onEdit, onDuplicate, onDelete, onSubmit, onRevert,
}: TimesheetEntryCardProps) {
  const { t, i18n } = useTranslation();
  const status = entry.status || "draft";
  const isEditable = status === "draft" || status === "rejected";
  const isBusy = isUpdating || isDeleting || isDuplicating || isStatusUpdating;
  const duration = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(Number(entry.hours_logged));

  return (
    <article className={`${styles.card} flex min-w-0 flex-col gap-3 rounded-xl border border-border-strong bg-surface-strong p-3 shadow-[0_1px_3px_rgba(75,87,57,0.035)] transition-colors hover:border-primary-strong/35 sm:p-4`}>
      {showDate ? (
        <time dateTime={entry.work_date} className="block text-xs font-medium text-muted">
          {new Date(`${entry.work_date}T12:00:00`).toLocaleDateString(i18n.language, {
            weekday: "short", year: "numeric", month: "short", day: "numeric",
          })}
        </time>
      ) : null}

      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 space-y-1 [overflow-wrap:anywhere]">
          <p className="text-xs font-semibold leading-5 text-muted-strong">{clientName}</p>
          <p className="text-[13px] leading-5 text-muted">{projectName}</p>
        </div>
        <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-sm font-semibold tabular-nums text-primary-strong">
          {t("timesheet.durationShortcut", { duration })}
        </span>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-6 text-text [overflow-wrap:anywhere]">
        {entry.description || t("timesheet.noDescription")}
      </p>

      {status === "rejected" ? <TimesheetRejectionNotice reason={entry.rejection_reason} /> : null}
      {isDateLocked ? (
        <p className="flex items-start gap-1.5 text-xs leading-5 text-amber-700">
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t("leave.dateLockedForLeave")}
        </p>
      ) : null}

      <footer className={`${styles.footer} mt-auto border-t border-border pt-3`}>
        <span className={`inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium ${statusStyles[status]}`}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" aria-hidden="true" />
          {t(`timesheet.${status}`)}
        </span>

        {canManage ? (
          <>
            {isEditable ? (
              <Button
                variant="primary"
                size="sm"
                onClick={status === "rejected" ? onEdit : onSubmit}
                disabled={isBusy || isDateLocked}
                className={`${styles.primary} [&>span:last-child]:whitespace-normal [&>span:last-child]:py-1 [&>span:last-child]:leading-5`}
                icon={status === "rejected" ? <Edit /> : <CalendarCheck2 />}
              >
                {t(status === "rejected" ? "timesheet.editAndResubmit" : "timesheet.submitEntry")}
              </Button>
            ) : null}
            <div className={styles.secondary}>
              {status === "draft" ? (
                <Button variant="ghost" size="icon" onClick={onEdit} disabled={isBusy || isDateLocked}
                  tooltip={t("timesheet.editEntry")} aria-label={t("timesheet.editEntry")} icon={<Edit />} />
              ) : null}
              <Button variant="ghost" size="icon" onClick={onDuplicate} disabled={isBusy || isDateLocked}
                tooltip={t("timesheet.copyEntry")} aria-label={t("timesheet.copyEntry")} icon={<Copy />} />
              {status === "submitted" ? (
                <Button variant="ghost" size="icon" onClick={onRevert} disabled={isBusy || isDateLocked}
                  tooltip={t("timesheet.revertToDraft")} aria-label={t("timesheet.revertToDraft")} icon={<Undo2 />} />
              ) : null}
              {isEditable ? (
                <Button variant="ghost" size="icon" onClick={onDelete} disabled={isBusy || isDateLocked}
                  className="text-danger hover:bg-rose-50" tooltip={t("timesheet.deleteEntry")}
                  aria-label={t("timesheet.deleteEntry")} icon={<Trash2 />} />
              ) : null}
            </div>
          </>
        ) : <span className="text-right text-xs text-muted">{t("timesheet.readOnly")}</span>}
      </footer>
    </article>
  );
}
