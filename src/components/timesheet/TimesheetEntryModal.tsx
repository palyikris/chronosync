import React from "react";
import { Clock, Info, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "../shared/Button";
import { DatePicker } from "../shared/DatePicker";
import { Input } from "../shared/Input";
import { Modal } from "../shared/Modal";
import { Select } from "../shared/Select";
import { Textarea } from "../shared/Textarea";
import { isSameFavoriteProject } from "../../utils/timesheetEntryPreferences";
import type { TimesheetEntryModalProps } from "../../types/timesheet";

const DURATION_SHORTCUTS = [0.25, 0.5, 1, 2, 4, 8];

export const TimesheetEntryModal: React.FC<TimesheetEntryModalProps> = ({
  open, isEditing, formData, clients, projects, onClose, onSubmit, onChange,
  isSaving, recentProjects, shortcutProjects, favoriteProjects, favoritesLoading,
  favoritesError, isSavingFavorite, onRetryFavorites, onToggleFavorite, feedback,
}) => {
  const { t, i18n } = useTranslation();
  const formId = React.useId();
  const descriptionRef = React.useRef<HTMLTextAreaElement>(null);
  const isResubmitting = isEditing && formData.status === "rejected";
  const selectedClient = clients.find(client => client.id === formData.client_id);
  const showEnglishDescriptionHint = selectedClient?.invoice_attachment_language === "en";
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
  const cannotSubmit = isSaving || !formData.client_id || !formData.project_id;

  React.useEffect(() => {
    if (open && !isSaving && feedback?.type === "success") descriptionRef.current?.focus();
  }, [open, isSaving, feedback]);

  return (
    <Modal
      open={open}
      title={isResubmitting ? t("timesheet.editAndResubmit")
        : t(isEditing ? "timesheet.entryTitleEdit" : "timesheet.entryTitleNew")}
      onClose={() => { if (!isSaving) onClose(); }}
      className="max-w-xl"
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
              variant="outline"
              className="min-w-0 flex-[1.4] [&>span]:whitespace-normal sm:flex-none"
              disabled={cannotSubmit}
            >
              {t("timesheet.saveAndAddAnother")}
            </Button>
          ) : null}
          <Button
            form={formId}
            type="submit"
            className="min-w-0 flex-1 [&>span]:whitespace-normal sm:flex-none"
            disabled={cannotSubmit}
          >
            {isSaving ? t(isResubmitting ? "timesheet.resubmitting" : "timesheet.saving")
              : isResubmitting ? t("timesheet.saveAndResubmit")
                : t(isEditing ? "timesheet.saveChanges" : "timesheet.saveEntry")}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-4 p-4 sm:p-5">
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

        <fieldset disabled={isSaving} className="min-w-0 space-y-4">
          {!isEditing ? (
            <div role="group" aria-label={t("timesheet.favoriteProjects")} className="flex items-center gap-3">
              {favoritesError ? (
                <div role="alert" className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs text-danger">
                  <span>{t("userSettings.favoritesLoadFailed")}</span>
                  <Button size="sm" variant="ghost" onClick={onRetryFavorites}>{t("common.retry")}</Button>
                </div>
              ) : (
                <Select
                  aria-label={t("timesheet.favoriteProjects")}
                  placeholder={t(favoritesLoading ? "timesheet.loading" : "timesheet.useFavoriteProject")}
                  className="min-w-0 flex-1"
                  leftIcon={<Star className="h-4 w-4" />}
                  disabled={favoritesLoading || isSavingFavorite}
                  value=""
                  onChange={event => {
                    if (!event.target.value) return;
                    const project = favoriteProjects[Number(event.target.value)];
                    if (!project) return;
                    onChange(current => ({ ...current, client_id: project.client_id, project_id: project.project_id }));
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
                className="shrink-0 text-xs font-medium text-muted underline underline-offset-2 hover:text-text">
                {t("timesheet.manageFavorites")}
              </Link>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-3">
              <div className="min-w-0">
                <label htmlFor="timesheet-entry-date" className="mb-1 block text-xs font-semibold text-muted">{t("timesheet.date")}</label>
                <DatePicker id="timesheet-entry-date" ariaLabel={t("timesheet.date")} required showIcon={false}
                  value={formData.work_date} onChange={value => onChange(current => ({ ...current, work_date: value }))} />
              </div>
              <div className="min-w-0">
                <label htmlFor="timesheet-entry-hours" className="mb-1 block text-xs font-semibold text-muted">{t("timesheet.totalHours")}</label>
                <Input id="timesheet-entry-hours" aria-label={t("timesheet.totalHours")}
                  type="number" inputMode="decimal" step="any" min="0.01" max="24" required
                  value={formData.hours_logged} leftIcon={<Clock className="h-4 w-4" />}
                  onChange={event => onChange(current => ({ ...current,
                    hours_logged: Number.isNaN(event.target.valueAsNumber) ? "" : event.target.valueAsNumber }))} />
              </div>
            </div>
            <div role="group" aria-label={t("timesheet.durationShortcuts")}
              className="flex rounded-lg border border-border bg-bg-accent/45 p-0.5">
              {DURATION_SHORTCUTS.map(hours => (
                <button key={hours} type="button" aria-pressed={formData.hours_logged === hours}
                  className={`min-h-11 min-w-0 flex-1 rounded-md px-1 text-[11.5px] transition-colors sm:min-h-8 ${
                    formData.hours_logged === hours ? "bg-primary/15 font-semibold text-primary-strong" : "text-muted hover:bg-black/4 hover:text-text"}`}
                  onClick={() => onChange(current => ({ ...current, hours_logged: hours }))}>
                  {durationLabel(hours)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label htmlFor="timesheet-entry-client" className="mb-2 flex h-7 items-center text-xs font-semibold text-muted">{t("timesheet.client")}</label>
                <Select id="timesheet-entry-client" aria-label={t("timesheet.client")} placeholder={t("timesheet.selectClient")} required value={formData.client_id}
                  onChange={event => onChange(current => ({ ...current, client_id: event.target.value, project_id: "" }))}>
                  <option value="">{t("timesheet.selectClient")}</option>
                  {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                </Select>
              </div>
              <div className="min-w-0">
                <div className="mb-2 flex h-7 items-center justify-between gap-2">
                  <label htmlFor="timesheet-entry-project" className="text-xs font-semibold text-muted">{t("timesheet.project")}</label>
                  <Button variant="ghost" size="icon" aria-label={favoriteAction} tooltip={favoriteAction}
                    disabled={favoritesLoading || favoritesError || isSavingFavorite || (!isFavorite && !canFavorite)}
                    aria-pressed={isFavorite} onClick={() => onToggleFavorite(currentProject)}
                    icon={<Star className={`h-4 w-4 ${isFavorite ? "fill-current text-primary-strong" : ""}`} />} />
                </div>
                <Select id="timesheet-entry-project" aria-label={t("timesheet.project")} required disabled={!formData.client_id}
                  placeholder={t(formData.client_id ? "timesheet.selectProject" : "timesheet.selectClientFirst")}
                  value={formData.project_id} onChange={event => onChange(current => ({ ...current, project_id: event.target.value }))}>
                  <option value="">{t(formData.client_id ? "timesheet.selectProject" : "timesheet.selectClientFirst")}</option>
                  {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                </Select>
              </div>
            </div>
            {!isEditing && recentProjects.length > 0 ? (
              <div role="group" aria-label={t("timesheet.recentProjects")} className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-[11px] text-muted">{t("timesheet.recentProjectsShort")}</span>
                <div className="flex min-w-0 gap-1 overflow-x-auto">
                  {recentProjects.map(project => (
                    <button key={project.project_id} type="button"
                      aria-label={`${projectName(project.project_id)} · ${clientName(project.client_id)}`}
                      title={`${projectName(project.project_id)} · ${clientName(project.client_id)}`}
                      aria-pressed={formData.project_id === project.project_id}
                      className={`min-h-11 shrink-0 rounded-md px-2 text-xs transition-colors sm:min-h-8 ${
                        formData.project_id === project.project_id ? "bg-primary/10 font-medium text-primary-strong" : "text-muted underline decoration-border-strong underline-offset-4 hover:text-text"}`}
                      onClick={() => onChange(current => ({ ...current, client_id: project.client_id, project_id: project.project_id }))}>
                      {projectName(project.project_id)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="timesheet-entry-description" className="text-xs font-semibold text-muted">{t("timesheet.taskDescription")}</label>
            </div>
            {showEnglishDescriptionHint ? (
              <p id="timesheet-description-requirement" role="status" className="flex items-start gap-1.5 text-xs leading-5 text-primary-strong">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{t("timesheet.englishDescriptionWarning")}</span>
              </p>
            ) : null}
            <Textarea ref={descriptionRef} id="timesheet-entry-description" aria-label={t("timesheet.taskDescription")}
              aria-describedby={showEnglishDescriptionHint ? "timesheet-description-requirement" : undefined}
              rows={3} required maxLength={2000} value={formData.description}
              onChange={event => onChange(current => ({ ...current, description: event.target.value }))}
              placeholder={t("timesheet.taskDescriptionPlaceholder")} />
          </div>
        </fieldset>
      </form>
    </Modal>
  );
};
