import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronRight,
  FileSpreadsheet,
  FolderPlus,
  PencilLine,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "../shared/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../shared/Card";
import { Modal } from "../shared/Modal";
import { cn } from "../../utils/cn";
import type { ProjectManagementCardProps } from "../../types/company-settings";
import {
  createProject,
  deleteProject,
  updateProjectActivity,
  updateProject,
} from "../../services/clientProjectService";
import type { Project } from "../../types/client-project";
import { Select } from "../shared/Select";
import { Input } from "../shared/Input";
import { ProjectImportModal } from "./ProjectImportModal";

const normalizeEstimatedHours = (value: string) => {
  if (value === "") return 0;

  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
};

export const ProjectManagementCard: React.FC<ProjectManagementCardProps> = ({
  companyId,
  clients,
  projects,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectClientId, setNewProjectClientId] = useState("");
  const [newProjectEstimatedHours, setNewProjectEstimatedHours] = useState(0);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProjectFiltersCollapsed, setIsProjectFiltersCollapsed] =
    useState(true);
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
  const [projectClientFilter, setProjectClientFilter] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const selectedClientForNewProject = clients.find(
    (client) => client.id === newProjectClientId,
  );
  const visibleProjects = useMemo(() => {
    const normalizedTerm = projectSearchTerm.trim().toLowerCase();

    return [...projects]
      .filter((project) => {
        const matchesSearch =
          !normalizedTerm ||
          project.name.toLowerCase().includes(normalizedTerm);

        const matchesClient =
          !projectClientFilter || project.client_id === projectClientFilter;

        const matchesStatus =
          projectStatusFilter === "all"
            ? true
            : projectStatusFilter === "active"
              ? project.is_active
              : !project.is_active;

        return matchesSearch && matchesClient && matchesStatus;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projectClientFilter, projectSearchTerm, projectStatusFilter, projects]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newProjectName.trim() || !newProjectClientId) return;

    try {
      setLoading(true);
      await createProject(
        companyId,
        newProjectClientId,
        newProjectName.trim(),
        newProjectEstimatedHours,
      );
      setNewProjectName("");
      setNewProjectClientId("");
      setNewProjectEstimatedHours(0);
      onRefresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : t("companySettings.failedCreateProject"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingProject || !editingProject.name.trim()) return;

    try {
      setLoading(true);
      await updateProject(
        editingProject.id,
        editingProject.name.trim(),
        editingProject.estimated_hours_per_month ?? 0,
      );
      setEditingProject(null);
      onRefresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : t("companySettings.failedUpdateProject"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivity = async (project: Project) => {
    try {
      setLoading(true);
      await updateProjectActivity(project.id, !project.is_active);
      onRefresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : t("companySettings.failedUpdateProjectActivity"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProjectId) return;

    try {
      setLoading(true);
      await deleteProject(deletingProjectId);
      setDeletingProjectId(null);
      onRefresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : t("companySettings.failedDeleteProject"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border-strong">
      <CardHeader className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/30 text-primary-strong ring-1 ring-primary-strong/10">
            <FolderPlus className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">
                {t("companySettings.projectsTitle")}
              </CardTitle>
              <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-strong ring-1 ring-border">
                {projects.length}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-strong sm:text-sm">
              {t("companySettings.projectsSubtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <Button
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 sm:flex-none"
            icon={<FileSpreadsheet />}
          >
            {t("companySettings.projectImportButton")}
          </Button>
          <Button
            type="button"
            variant={showNewProjectForm ? "secondary" : "primary"}
            onClick={() => setShowNewProjectForm((value) => !value)}
            className="flex-1 sm:flex-none"
            icon={showNewProjectForm ? <X /> : <Plus />}
          >
            {showNewProjectForm
              ? t("common.cancel")
              : t("companySettings.newProjectButton")}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-5">
        {showNewProjectForm && (
          <form
            onSubmit={handleCreate}
            className="space-y-3 rounded-2xl border border-primary-strong/15 bg-primary/[0.08] p-4"
          >
            <div className="grid gap-3 md:grid-cols-[1fr_1.1fr_0.8fr_auto] md:items-end">
              <Select
                id="new-project-client"
                label={t("companySettings.projectClientLabel")}
                leftIcon="person"
                required
                value={newProjectClientId}
                onChange={(event) => setNewProjectClientId(event.target.value)}
              >
                <option value="">
                  {t("companySettings.selectClientFirst")}
                </option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>

              <Input
                id="new-project-name"
                type="text"
                label={t("companySettings.projectNameLabel")}
                leftIcon="folder_open"
                required
                disabled={!newProjectClientId}
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                className="disabled:cursor-not-allowed disabled:bg-slate-100"
              />

              <Input
                id="new-project-estimated-hours"
                type="number"
                min="0"
                step="1"
                label={t("companySettings.estimatedHoursPerMonthLabel")}
                leftIcon="schedule"
                required
                value={newProjectEstimatedHours}
                onChange={(event) =>
                  setNewProjectEstimatedHours(
                    normalizeEstimatedHours(event.target.value),
                  )
                }
              />

              <Button
                type="submit"
                disabled={
                  !newProjectClientId || !newProjectName.trim() || loading
                }
                className="gap-1 rounded-xl px-4"
                icon={<Plus className="h-4 w-4" />}
              >
                {t("common.add")}
              </Button>
            </div>
            <p className="text-xs text-muted-strong">
              {selectedClientForNewProject
                ? t("companySettings.creatingUnder", {
                    clientName: selectedClientForNewProject.name,
                  })
                : t("companySettings.pickClientToCreate")}
            </p>
          </form>
        )}

        <div className="flex items-center gap-3 transition-all duration-300 ease-out">
          <div
            inert={isProjectFiltersCollapsed}
            className={cn(
              "grid flex-1 gap-3 overflow-hidden transition-all duration-300 ease-out lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-end",
              isProjectFiltersCollapsed
                ? "pointer-events-none max-w-0 translate-x-[-10px] opacity-0"
                : "max-w-[1400px] translate-x-0 opacity-100",
            )}
          >
            <Input
              id="project-search"
              type="text"
              aria-label={t("companySettings.searchProjects")}
              placeholder={t("companySettings.projectSearchPlaceholder")}
              leftIcon={<Search className="h-4 w-4" />}
              value={projectSearchTerm}
              onChange={(event) => setProjectSearchTerm(event.target.value)}
            />

            <Select
              id="project-client-filter"
              label={t("companySettings.projectClientFilterLabel")}
              value={projectClientFilter}
              onChange={(event) => setProjectClientFilter(event.target.value)}
            >
              <option value="">
                {t("companySettings.projectFilterAllClients")}
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>

            <Select
              id="project-status-filter"
              label={t("companySettings.projectStatusFilterLabel")}
              value={projectStatusFilter}
              onChange={(event) =>
                setProjectStatusFilter(
                  event.target.value as "all" | "active" | "inactive",
                )
              }
            >
              <option value="all">
                {t("companySettings.projectFilterAllStatuses")}
              </option>
              <option value="active">
                {t("companySettings.projectFilterActive")}
              </option>
              <option value="inactive">
                {t("companySettings.projectFilterInactive")}
              </option>
            </Select>
          </div>

          <div className="flex shrink-0 items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-[2.75rem] min-h-[2.75rem] px-4 transition-[transform,background-color,border-color,box-shadow] duration-300 ease-out",
                !isProjectFiltersCollapsed && "translate-x-1",
              )}
              onClick={() => {
                setIsProjectFiltersCollapsed((value) => !value);
              }}
              icon={
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform duration-300 ease-out",
                    !isProjectFiltersCollapsed && "rotate-180",
                  )}
                />
              }
            >
              {isProjectFiltersCollapsed
                ? t("companySettings.showFilters")
                : t("companySettings.hideFilters")}
            </Button>
          </div>
        </div>

        <div className="max-h-100 space-y-3 overflow-x-hidden overflow-y-auto pr-1">
          {visibleProjects.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-strong bg-bg-accent px-4 py-6 text-center text-sm text-muted-strong">
              {projectClientFilter
                ? (() => {
                    const client = clients.find(
                      (item) => item.id === projectClientFilter,
                    );

                    return client
                      ? t("companySettings.noProjectsForClient", {
                          clientName: client.name,
                        })
                      : t("companySettings.noProjectsMatchFilter");
                  })()
                : t("companySettings.noProjectsMatchFilter")}
            </p>
          ) : (
            visibleProjects.map((project) => (
              <article
                key={project.id}
                className="group rounded-2xl border border-border-strong bg-surface-strong/80 p-4 shadow-[0_1px_2px_rgba(76,65,92,0.035)] transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary-strong/35 hover:bg-surface-strong hover:shadow-card"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-accent text-primary-strong ring-1 ring-border">
                      <FolderPlus className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-text">
                          {project.name}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${
                            project.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {project.is_active
                            ? t("common.active")
                            : t("common.inactive")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 self-start rounded-xl border border-border bg-bg-accent/80 p-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleToggleActivity(project)}
                      disabled={loading}
                      className={project.is_active ? "text-primary-strong" : ""}
                      tooltip={
                        project.is_active
                          ? t("companySettings.deactivateProject")
                          : t("companySettings.activateProject")
                      }
                      aria-label={
                        project.is_active
                          ? t("companySettings.deactivateProject")
                          : t("companySettings.activateProject")
                      }
                      icon={
                        project.is_active ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingProject(project)}
                      disabled={loading}
                      tooltip={t("companySettings.editProject")}
                      aria-label={t("companySettings.editProject")}
                      icon={<PencilLine className="h-4 w-4" />}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeletingProjectId(project.id)}
                      disabled={loading}
                      className="text-danger hover:bg-danger-bg hover:text-danger"
                      tooltip={t("companySettings.deleteProject")}
                      aria-label={t("companySettings.deleteProject")}
                      icon={<Trash2 className="h-4 w-4" />}
                    />
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-x-5 gap-y-3 border-t border-border pt-3 sm:ml-[3.25rem] sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted">
                      {t("companySettings.projectClientLabel")}
                    </dt>
                    <dd className="mt-0.5 truncate text-sm font-medium text-text">
                      {clients.find((client) => client.id === project.client_id)
                        ?.name ?? t("companySettings.unknownClient")}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted">
                      {t("companySettings.estimatedHoursPerMonthLabel")}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium tabular-nums text-text">
                      {project.estimated_hours_per_month}
                    </dd>
                  </div>
                </dl>
              </article>
            ))
          )}
        </div>
      </CardContent>

      {editingProject && (
        <Modal
          open={!!editingProject}
          onClose={() => { if (!loading) setEditingProject(null); }}
          title={t("companySettings.editProject")}
          className="w-xl max-w-full"
        >
          <fieldset disabled={loading} className="min-w-0 space-y-4 p-4">
            <Input
              id="edit-project-name"
              type="text"
              label={t("companySettings.projectNamePlaceholder")}
              leftIcon="folder_open"
              value={editingProject.name}
              onChange={(event) =>
                setEditingProject({
                  ...editingProject,
                  name: event.target.value,
                })
              }
            />
            <Input
              id="edit-project-estimated-hours"
              type="number"
              min="0"
              step="1"
              label={t("companySettings.estimatedHoursPerMonthLabel")}
              leftIcon="schedule"
              required
              value={editingProject.estimated_hours_per_month}
              onChange={(event) =>
                setEditingProject({
                  ...editingProject,
                  estimated_hours_per_month: normalizeEstimatedHours(
                    event.target.value,
                  ),
                })
              }
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setEditingProject(null)}
                className="rounded-xl"
                icon={<X className="h-4 w-4" />}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={loading}
                className="rounded-xl"
                icon={<Check className="h-4 w-4" />}
              >
                {t("companySettings.saveChanges")}
              </Button>
            </div>
          </fieldset>
        </Modal>
      )}

      {deletingProjectId && (
        <Modal
          open={!!deletingProjectId}
          onClose={() => { if (!loading) setDeletingProjectId(null); }}
          title={t("companySettings.deleteProject")}
        >
          <fieldset disabled={loading} className="min-w-0 space-y-4 p-4">
            <p className="text-sm text-slate-600">
              {t("companySettings.confirmDeleteProject")}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeletingProjectId(null)}
                className="rounded-xl"
                icon={<X className="h-4 w-4" />}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-xl"
                icon={<Trash2 className="h-4 w-4" />}
              >
                {t("companySettings.confirmDelete")}
              </Button>
            </div>
          </fieldset>
        </Modal>
      )}

      <ProjectImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        companyId={companyId}
        onImportComplete={onRefresh}
      />
    </Card>
  );
};
