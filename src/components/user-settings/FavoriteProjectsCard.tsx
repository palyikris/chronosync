import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/useAuth";
import { useFavoriteProjects } from "../../hooks/useFavoriteProjects";
import { fetchClients, fetchProjects } from "../../services/clientProjectService";
import type { SavedFavoriteProject } from "../../types/user-preferences";
import { Button } from "../shared/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../shared/Card";
import { LoadError } from "../shared/LoadError";
import { Select } from "../shared/Select";

type ProjectDraft = { id?: string; client_id: string; project_id: string };

export const FavoriteProjectsCard = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const favorites = useFavoriteProjects();
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const editorRef = useRef<HTMLFormElement>(null);
  const draftKey = draft ? draft.id ?? "new" : null;
  useEffect(() => {
    if (draftKey) editorRef.current?.querySelector<HTMLButtonElement>("#favorite-project-client")?.focus();
  }, [draftKey]);
  const clients = useQuery({
    queryKey: ["all-clients", profile?.company_id],
    queryFn: () => fetchClients(profile!.company_id),
    enabled: Boolean(profile?.company_id),
  });
  const projects = useQuery({
    queryKey: ["all-projects", profile?.company_id],
    queryFn: () => fetchProjects(profile!.company_id),
    enabled: Boolean(profile?.company_id),
  });
  const loading = favorites.isLoading || clients.isLoading || projects.isLoading;
  const loadFailed = favorites.isError || clients.isError || projects.isError;
  const activeClients = (clients.data ?? []).filter(client => client.is_active);
  const activeProjects = (projects.data ?? []).filter(project => project.is_active &&
    project.client_id === draft?.client_id && activeClients.some(client => client.id === project.client_id));
  const availableDraft = activeProjects.some(project => project.id === draft?.project_id);

  const editProject = (project: SavedFavoriteProject) => {
    const available = project.is_available && activeClients.some(client => client.id === project.client_id) &&
      projects.data?.some(item => item.id === project.project_id && item.is_active);
    setDraft({ id: project.id, client_id: available ? project.client_id : "", project_id: available ? project.project_id : "" });
    setFeedback(null);
  };
  const saveProject = async () => {
    if (!draft || !availableDraft || favorites.isSaving || loadFailed) return;
    if (favorites.projects.some(project => project.project_id === draft.project_id && project.id !== draft.id)) {
      setFeedback({ type: "error", message: t("userSettings.favoriteAlreadySaved") });
      return;
    }
    try {
      await favorites.save({ id: draft.id, payload: { project_id: draft.project_id } });
      setDraft(null);
      setFeedback({ type: "success", message: t("userSettings.favoriteSaved") });
    } catch {
      setFeedback({ type: "error", message: t("userSettings.favoriteSaveFailed") });
    }
  };
  const deleteProject = async (project: SavedFavoriteProject) => {
    if (favorites.isSaving) return;
    try {
      await favorites.remove(project.id);
      if (draft?.id === project.id) setDraft(null);
      setFeedback({ type: "success", message: t("userSettings.favoriteDeleted") });
    } catch {
      setFeedback({ type: "error", message: t("userSettings.favoriteDeleteFailed") });
    }
  };

  return (
    <Card id="favorite-projects" tabIndex={-1} className="scroll-mt-6 space-y-5 p-5">
      <CardHeader className="rounded-t-2xl border-b-0 bg-transparent px-0 py-0">
        <div className="flex items-start gap-3">
          <div className="rounded-[10px] bg-primary/10 p-2 text-primary-strong"><Star className="h-5 w-5" aria-hidden="true" /></div>
          <div>
            <CardTitle className="text-[15px] font-semibold text-text">{t("timesheet.favoriteProjects")}</CardTitle>
            <p className="mt-1 text-sm text-muted-strong">{t("userSettings.favoriteProjectsSubtitle")}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0">
        {feedback ? <p role={feedback.type === "error" ? "alert" : "status"} className={`text-sm ${feedback.type === "error" ? "text-danger" : "text-primary-strong"}`}>{feedback.message}</p> : null}
        {loadFailed ? <LoadError onRetry={() => { void favorites.retry(); void clients.refetch(); void projects.refetch(); }} />
          : loading ? <p role="status" className="text-sm text-muted">{t("timesheet.loading")}</p> : (
            <>
              {favorites.projects.length ? (
                <ul className="space-y-3">
                  {favorites.projects.map(project => (
                    <li key={project.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-bg-accent/45 p-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold text-text">{project.project_name || t("timesheet.unknownProject")}</p>
                        <p className="mt-1 break-words text-xs text-muted-strong">{project.client_name || t("timesheet.unknownClient")}</p>
                        {!project.is_available ? <p className="mt-1 text-xs text-danger">{t("userSettings.favoriteUnavailable")}</p> : null}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="outline" disabled={favorites.isSaving} aria-label={t("userSettings.editFavoriteProject", { project: project.project_name })} onClick={() => editProject(project)} icon={<Pencil className="h-4 w-4" />}>{t("common.edit")}</Button>
                        <Button size="sm" variant="ghost" disabled={favorites.isSaving} aria-label={t("userSettings.deleteFavoriteProject", { project: project.project_name })} onClick={() => { void deleteProject(project); }} icon={<Trash2 className="h-4 w-4" />}>{t("common.delete")}</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">{t("userSettings.noFavoriteProjects")}</p>}
              {!draft ? <Button size="sm" variant="outline" disabled={favorites.isSaving} icon={<Plus className="h-4 w-4" />} onClick={() => {
                setDraft({ client_id: "", project_id: "" }); setFeedback(null);
              }}>{t("userSettings.addFavoriteProject")}</Button> : null}
            </>
          )}
        {draft ? (
          <form ref={editorRef} onSubmit={event => { event.preventDefault(); void saveProject(); }} className="rounded-xl border border-border-strong bg-surface-strong p-4">
            <fieldset disabled={favorites.isSaving || loadFailed || loading} className="min-w-0 space-y-4">
              <h3 className="text-sm font-semibold text-text">{t(draft.id ? "userSettings.editFavoriteTitle" : "userSettings.addFavoriteProject")}</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="favorite-project-client" className="mb-1 block text-xs font-semibold text-muted">{t("timesheet.client")}</label>
                  <Select id="favorite-project-client" aria-label={t("timesheet.client")} placeholder={t("timesheet.selectClient")} required value={draft.client_id} onChange={event => setDraft({ ...draft, client_id: event.target.value, project_id: "" })}>
                    <option value="">{t("timesheet.selectClient")}</option>
                    {activeClients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                  </Select>
                </div>
                <div>
                  <label htmlFor="favorite-project-selection" className="mb-1 block text-xs font-semibold text-muted">{t("timesheet.project")}</label>
                  <Select id="favorite-project-selection" aria-label={t("timesheet.project")} placeholder={t(draft.client_id ? "timesheet.selectProject" : "timesheet.selectClientFirst")} required disabled={!draft.client_id} value={draft.project_id} onChange={event => setDraft({ ...draft, project_id: event.target.value })}>
                    <option value="">{t(draft.client_id ? "timesheet.selectProject" : "timesheet.selectClientFirst")}</option>
                    {activeProjects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={!availableDraft}>{t(favorites.isSaving ? "common.saving" : "userSettings.saveFavoriteProject")}</Button>
                <Button variant="outline" onClick={() => setDraft(null)}>{t("timesheet.cancel")}</Button>
              </div>
            </fieldset>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
};
