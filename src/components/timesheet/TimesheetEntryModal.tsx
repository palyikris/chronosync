import React from "react";
import { Info, Settings2, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "../shared/Button";
import { DatePicker } from "../shared/DatePicker";
import { Input } from "../shared/Input";
import { Modal } from "../shared/Modal";
import { Select } from "../shared/Select";
import { Textarea } from "../shared/Textarea";
import { isSameFavoriteProject } from "../../utils/timesheetEntryPreferences";
import { billingMultiplierSchema } from "../../types/timesheet";
import { usePopoverDismiss } from "../../hooks/usePopoverDismiss";
import type { TimesheetEntryModalProps } from "../../types/timesheet";
import styles from "./TimesheetEntryModal.module.css";

const DURATION_SHORTCUTS = [0.25, 0.5, 1, 2, 4, 8];

function BillingMultiplierInfo() {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const infoId = React.useId();
  usePopoverDismiss(open, rootRef, buttonRef, () => setOpen(false));

  return (
    <div ref={rootRef} className="relative shrink-0" onKeyDownCapture={event => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
      }
    }}>
      <button ref={buttonRef} type="button"
        aria-label={t("timesheet.billingMultiplierInfo")} aria-expanded={open}
        aria-controls={open ? infoId : undefined} aria-describedby={open ? infoId : undefined}
        onClick={() => setOpen(current => !current)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-strong transition-colors hover:bg-primary/10 hover:text-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong">
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <p id={infoId} role="tooltip"
          className="absolute right-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-lg border border-border bg-surface-strong px-3 py-2 text-xs leading-5 text-muted-strong shadow-lg">
          {t("timesheet.billingMultiplierHint")}
        </p>
      ) : null}
    </div>
  );
}

export const TimesheetEntryModal: React.FC<TimesheetEntryModalProps> = ({
  open, isEditing, formData, clients, projects, onClose, onSubmit, onChange,
  isSaving, shortcutProjects, favoriteProjects, favoritesLoading,
  favoritesError, isSavingFavorite, onRetryFavorites, onToggleFavorite, feedback,
}) => {
  const { t, i18n } = useTranslation();
  const formId = React.useId();
  const descriptionRef = React.useRef<HTMLTextAreaElement>(null);
  const isResubmitting = isEditing && formData.status === "rejected";
  const selectedClient = clients.find(client => client.id === formData.client_id);
  const showEnglishDescriptionHint = selectedClient?.invoice_attachment_language === "en";
  const isPayroll = projects.find(project => project.id === formData.project_id)?.is_payroll;
  const multiplier = formData.billing_multiplier ?? 1;
  const validMultiplier = !isPayroll || billingMultiplierSchema.safeParse(multiplier).success;
  const currentProject = {
    client_id: formData.client_id,
    project_id: formData.project_id,
  };
  const isFavorite = favoriteProjects.some(project => isSameFavoriteProject(project, currentProject));
  const canFavorite = Boolean(currentProject.client_id && currentProject.project_id &&
    selectedClient?.is_active && projects.some(project =>
      project.id === currentProject.project_id && project.is_active));
  const favoriteAction = isFavorite ? t("timesheet.removeCurrentFavorite") : t("timesheet.saveFavoriteProject");
  const durationLabel = (hours: number) => hours < 1
    ? t("timesheet.durationMinutes", { minutes: hours * 60 })
    : t("timesheet.durationShortcut", {
      duration: new Intl.NumberFormat(i18n.resolvedLanguage).format(hours),
    });
  const projectName = (id: string) => shortcutProjects.find(project => project.id === id)?.name;
  const clientName = (id: string) => clients.find(client => client.id === id)?.name;
  const cannotSubmit = isSaving || !formData.client_id || !formData.project_id || !validMultiplier;

  React.useEffect(() => {
    if (open && !isSaving && feedback?.type === "success") descriptionRef.current?.focus();
  }, [open, isSaving, feedback]);

  return (
    <Modal
      open={open}
      title={isResubmitting ? t("timesheet.editAndResubmit")
        : t(isEditing ? "timesheet.entryTitleEdit" : "timesheet.entryTitleNew")}
      onClose={() => { if (!isSaving) onClose(); }}
      className="max-w-[40rem]"
      footer={
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="mr-auto"
            onClick={onClose}
            disabled={isSaving}
          >
            {t("timesheet.cancel")}
          </Button>
          {!isEditing ? (
            <Button
              form={formId}
              type="submit"
              name="saveAction"
              value="add-another"
              variant="ghost"
              aria-label={t("timesheet.saveAndAddAnother")}
              className="min-w-0 [&>span]:whitespace-normal"
              disabled={cannotSubmit}
            >
              {t("timesheet.saveAndAddAnotherShort")}
            </Button>
          ) : null}
          <Button
            form={formId}
            type="submit"
            className="min-w-0 px-4 [&>span]:whitespace-normal sm:px-5"
            disabled={cannotSubmit}
          >
            {isSaving ? t(isResubmitting ? "timesheet.resubmitting" : "timesheet.saving")
              : isResubmitting ? t("timesheet.saveAndResubmit")
                : t(isEditing ? "timesheet.saveChanges" : "timesheet.saveEntry")}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-5 p-5 sm:p-6">
        {feedback ? (
          <p role={feedback.type === "error" ? "alert" : "status"}
            className={`rounded-lg px-3 py-2 text-xs ${feedback.type === "error"
              ? "bg-danger-bg text-danger" : "bg-primary/8 text-primary-strong"}`}>
            {feedback.message}
          </p>
        ) : null}
        {isResubmitting ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            <p className="text-xs font-semibold">{t("timesheet.rejectionReasonTitle")}</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{formData.rejection_reason?.trim() || t("timesheet.noRejectionReason")}</p>
          </div>
        ) : null}

        <fieldset disabled={isSaving} className="min-w-0 space-y-5">
          {!isEditing ? (
            <div role="group" aria-label={t("timesheet.favoriteProjects")} className="flex items-center gap-2 border-b border-border/60 pb-4">
                {favoritesError ? (
                  <div role="alert" className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs text-danger">
                    <span>{t("userSettings.favoritesLoadFailed")}</span>
                    <Button size="sm" variant="ghost" onClick={onRetryFavorites}>{t("common.retry")}</Button>
                  </div>
                ) : (
                  <Select
                    aria-label={t("timesheet.favoriteProjects")}
                    placeholder={t(favoritesLoading ? "timesheet.loading" : "timesheet.useFavoriteProject")}
                    className={`min-w-0 flex-1 ${styles.favoritePicker}`}
                    leftIcon={<Star className="h-3.5 w-3.5" />}
                    disabled={favoritesLoading || isSavingFavorite}
                    value=""
                    onChange={event => {
                      if (!event.target.value) return;
                      const project = favoriteProjects[Number(event.target.value)];
                      if (!project) return;
                      onChange(current => ({ ...current, client_id: project.client_id, project_id: project.project_id, billing_multiplier: 1 }));
                      descriptionRef.current?.focus();
                    }}
                  >
                    <option value="" disabled>{t(favoriteProjects.length ? "timesheet.useFavoriteProject" : "timesheet.noFavoriteProjectsShort")}</option>
                    {favoriteProjects.map((project, index) => (
                      <option key={project.id ?? index} value={index}>
                        {projectName(project.project_id)} · {clientName(project.client_id)}
                      </option>
                    ))}
                  </Select>
                )}
                <Link to="/settings#favorite-projects" aria-label={t("timesheet.manageFavoriteProjects")}
                  title={t("timesheet.manageFavoriteProjects")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-bg-accent hover:text-text focus-visible:outline-2 focus-visible:outline-primary-strong">
                  <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="timesheet-entry-client" className="mb-2 block text-xs font-medium text-muted-strong">{t("timesheet.client")}</label>
              <Select id="timesheet-entry-client" aria-label={t("timesheet.client")} placeholder={t("timesheet.selectClient")} required value={formData.client_id}
                onChange={event => onChange(current => ({ ...current, client_id: event.target.value, project_id: "", billing_multiplier: 1 }))}>
                <option value="">{t("timesheet.selectClient")}</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
              </Select>
            </div>
            <div className="min-w-0">
              <label htmlFor="timesheet-entry-project" className="mb-2 block text-xs font-medium text-muted-strong">{t("timesheet.project")}</label>
              <div className="flex items-center gap-1">
                <Select id="timesheet-entry-project" aria-label={t("timesheet.project")} required disabled={!formData.client_id}
                  className="min-w-0 flex-1"
                  placeholder={t(formData.client_id ? "timesheet.selectProject" : "timesheet.selectClientFirst")}
                  value={formData.project_id} onChange={event => onChange(current => ({ ...current, project_id: event.target.value, billing_multiplier: 1 }))}>
                  <option value="">{t(formData.client_id ? "timesheet.selectProject" : "timesheet.selectClientFirst")}</option>
                  {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                </Select>
                <Button variant="ghost" size="icon" aria-label={favoriteAction} tooltip={favoriteAction}
                  disabled={favoritesLoading || favoritesError || isSavingFavorite || (!isFavorite && !canFavorite)}
                  aria-pressed={isFavorite} onClick={() => onToggleFavorite(currentProject)}
                  icon={<Star className={`h-4 w-4 ${isFavorite ? "fill-current text-primary-strong" : ""}`} />} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className={`grid gap-4 ${isPayroll ? "grid-cols-2 sm:grid-cols-[1.1fr_0.9fr_1fr]" : "grid-cols-[1.15fr_0.85fr]"}`}>
              <div className={`min-w-0 ${isPayroll ? "col-span-2 sm:col-span-1" : ""}`}>
                <label htmlFor="timesheet-entry-date" className="mb-2 block text-xs font-medium text-muted-strong">{t("timesheet.date")}</label>
                <DatePicker id="timesheet-entry-date" ariaLabel={t("timesheet.date")} required showIcon={false}
                  value={formData.work_date} onChange={value => onChange(current => ({ ...current, work_date: value }))} />
              </div>
              <div className="min-w-0">
                <label htmlFor="timesheet-entry-hours" className="mb-2 block text-xs font-medium text-muted-strong">{t("timesheet.totalHours")}</label>
                <Input id="timesheet-entry-hours" aria-label={t("timesheet.totalHours")}
                  type="number" inputMode="decimal" step="any" min="0.01" max="24" required
                  value={formData.hours_logged}
                  onChange={event => onChange(current => ({ ...current,
                    hours_logged: Number.isNaN(event.target.valueAsNumber) ? "" : event.target.valueAsNumber }))} />
              </div>
              {isPayroll ? (
                <div className="min-w-0">
                  <label htmlFor="timesheet-entry-multiplier" className="mb-2 block text-xs font-medium text-muted-strong">{t("timesheet.billingMultiplierShort")}</label>
                  <div className="flex items-center gap-1">
                    <Input id="timesheet-entry-multiplier" type="number" inputMode="numeric"
                      className="min-w-0 flex-1" min="1" max="2147483647" step="1" required
                      aria-label={t("timesheet.billingMultiplier")} value={multiplier}
                      onChange={event => onChange(current => ({ ...current,
                        billing_multiplier: Number.isNaN(event.target.valueAsNumber) ? "" : event.target.valueAsNumber }))}
                      aria-invalid={!validMultiplier}
                      aria-describedby={!validMultiplier ? "timesheet-entry-multiplier-error" : undefined} />
                    <BillingMultiplierInfo />
                  </div>
                </div>
              ) : null}
            </div>
            {isPayroll && !validMultiplier ? (
              <p id="timesheet-entry-multiplier-error" role="alert" className="text-xs text-danger">
                {t("timesheet.billingMultiplierInvalid")}
              </p>
            ) : null}
            <div role="group" aria-label={t("timesheet.durationShortcuts")}
              className="flex flex-wrap items-center justify-end gap-1">
              {DURATION_SHORTCUTS.map(hours => (
                <button key={hours} type="button" aria-pressed={formData.hours_logged === hours}
                  className={`min-h-8 rounded-md px-2.5 text-[11px] transition-colors ${
                    formData.hours_logged === hours ? "bg-primary/12 font-medium text-primary-strong" : "text-muted hover:bg-bg-accent hover:text-text"}`}
                  onClick={() => onChange(current => ({ ...current, hours_logged: hours }))}>
                  {durationLabel(hours)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="timesheet-entry-description" className="block text-xs font-medium text-muted-strong">{t("timesheet.taskDescription")}</label>
            <Textarea ref={descriptionRef} id="timesheet-entry-description" aria-label={t("timesheet.taskDescription")}
              aria-describedby={showEnglishDescriptionHint ? "timesheet-description-requirement" : undefined}
              className="min-h-24" rows={3} required maxLength={2000} value={formData.description}
              onChange={event => onChange(current => ({ ...current, description: event.target.value }))}
              placeholder={t("timesheet.taskDescriptionPlaceholder")} />
            {showEnglishDescriptionHint ? (
              <p id="timesheet-description-requirement" role="status" className="text-[11px] leading-5 text-muted">
                {t("timesheet.englishDescriptionWarning")}
              </p>
            ) : null}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
};
