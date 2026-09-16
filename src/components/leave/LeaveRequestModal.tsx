import React from "react";
import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { Input } from "../shared/Input";
import { Modal } from "../shared/Modal";
import type { LeaveRequestModalProps } from "./types";

export const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  open,
  editingRequest,
  formState,
  onClose,
  onSubmit,
  onFormStateChange,
  isSaving,
  workingDayCount,
  selectedDates,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingRequest ? t("leave.editRequest") : t("leave.newRequest")}
      className="max-w-2xl"
    >
      <form
        className="space-y-5 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            type="date"
            label={t("leave.startDate")}
            value={formState.start_date}
            onChange={(event) =>
              onFormStateChange((current) => ({
                ...current,
                start_date: event.target.value,
              }))
            }
          />
          <Input
            type="date"
            label={t("leave.endDate")}
            value={formState.end_date}
            onChange={(event) =>
              onFormStateChange((current) => ({
                ...current,
                end_date: event.target.value,
              }))
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            type="number"
            min={1}
            max={80}
            step="0.5"
            label={t("leave.weeklyWorkHours")}
            value={formState.weekly_work_hours}
            onChange={(event) =>
              onFormStateChange((current) => ({
                ...current,
                weekly_work_hours: Number(event.target.value || 0),
              }))
            }
          />
          <div className="rounded-2xl border border-border-strong bg-bg-accent px-4 py-3 text-sm text-muted-strong">
            {t("leave.estimatedLeaveHours")}:{" "}
            {t("leave.hoursShort", {
              hours: (
                ((formState.weekly_work_hours || 0) / 5) *
                workingDayCount
              ).toFixed(2),
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border-strong bg-bg-accent px-4 py-3 text-sm text-muted-strong">
          {t("leave.weekendNotice")}
          <div className="mt-1 font-semibold text-text">
            {t("leave.workingDays")}: {workingDayCount}
          </div>
        </div>

        {selectedDates.length > 0 ? (
          <div className="rounded-2xl border border-border-strong bg-surface-strong px-4 py-3 text-xs text-muted">
            {t("leave.selectedDates")}: {selectedDates.join(", ")}
          </div>
        ) : null}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isSaving}
            icon={<CalendarDays className="h-4 w-4" />}
          >
            {isSaving ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
