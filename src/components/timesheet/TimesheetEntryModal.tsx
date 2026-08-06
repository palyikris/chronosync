import React from "react";
import { Calendar as CalendarIcon, Check, Clock, Info, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";
import { Input } from "../shared/Input";
import { Modal } from "../shared/Modal";
import { Select } from "../shared/Select";
import { Textarea } from "../shared/Textarea";
import type { TimesheetEntryModalProps } from "../../types/timesheet";

export const TimesheetEntryModal: React.FC<TimesheetEntryModalProps> = ({
  open,
  isEditing,
  formData,
  clients,
  projects,
  onClose,
  onSubmit,
  onChange,
  isSaving,
}) => {
  const { t } = useTranslation();
  const selectedClient = clients.find(
    (client) => client.id === formData.client_id,
  );
  const showEnglishDescriptionHint =
    selectedClient?.invoice_attachment_language === "en";

  return (
    <Modal
      open={open}
      title={
        isEditing ? t("timesheet.entryTitleEdit") : t("timesheet.entryTitleNew")
      }
      onClose={onClose}
      className="max-w-2xl"
    >
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-semibold text-muted">
              {t("timesheet.date")}
            </label>
            <Input
              type="date"
              required
              value={formData.work_date}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                onChange((current) => ({
                  ...current,
                  work_date: event.target.value,
                }))
              }
              leftIcon={<CalendarIcon className="h-4 w-4" />}
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-semibold text-muted">
              {t("timesheet.totalHours")}
            </label>
            <Input
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              required
              value={formData.hours_logged}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                onChange((current) => ({
                  ...current,
                  hours_logged: parseFloat(event.target.value) || 0,
                }))
              }
              leftIcon={<Clock className="h-4 w-4" />}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">
            {t("timesheet.taskDescription")}
          </label>
          {showEnglishDescriptionHint ? (
            <div className="mb-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("timesheet.englishDescriptionWarning")}</span>
            </div>
          ) : null}
          <Textarea
            rows={3}
            required
            value={formData.description}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
              onChange((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder={t("timesheet.taskDescriptionPlaceholder")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-semibold text-muted">
              {t("timesheet.client")}
            </label>
            <Select
              required
              value={formData.client_id}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                onChange((current) => ({
                  ...current,
                  client_id: event.target.value,
                  project_id: "",
                }))
              }
            >
              <option value="">{t("timesheet.selectClient")}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-semibold text-muted">
              {t("timesheet.project")}
            </label>
            <Select
              required
              disabled={!formData.client_id}
              value={formData.project_id}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                onChange((current) => ({
                  ...current,
                  project_id: event.target.value,
                }))
              }
            >
              <option value="">
                {formData.client_id
                  ? t("timesheet.selectProject")
                  : t("timesheet.selectClientFirst")}
              </option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {formData.status === "rejected" && formData.rejection_reason && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
            <label className="">{t("timesheet.rejectionReasonLabel")}</label>
            <p className="font-semibold">{formData.rejection_reason}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-full"
            onClick={onClose}
            icon={<X className="h-4 w-4" />}
          >
            {t("timesheet.cancel")}
          </Button>
          <Button
            type="submit"
            className="flex-1 rounded-full"
            disabled={isSaving}
            icon={<Check className="h-4 w-4" />}
          >
            {isSaving
              ? t("timesheet.saving")
              : isEditing
                ? t("timesheet.saveChanges")
                : t("timesheet.saveEntry")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};