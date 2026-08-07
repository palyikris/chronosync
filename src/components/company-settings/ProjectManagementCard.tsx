import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  PencilLine,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "../shared/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../shared/Card";
import { Modal } from "../shared/Modal";
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

  const selectedClient = clients.find(
    (client) => client.id === newProjectClientId,
  );
  const visibleProjects = selectedClient
    ? projects
        .filter((project) => project.client_id === selectedClient.id)
        .sort((a, b) => a.name.localeCompare(b.name))
    : projects;

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
    <Card className="space-y-6 p-6 shadow-sm">
      <CardHeader className="rounded-t-2xl border-b-0 bg-transparent px-0 py-0">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-bg-accent p-2.5 text-primary-strong">
            <FolderPlus className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-text">
              {t("companySettings.projectsTitle")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-strong">
              {t("companySettings.projectsSubtitle")}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-0 pb-0">
        <div className="flex items-center justify-between rounded-xl border border-border-strong bg-bg-accent px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text">
              {t("companySettings.projectsTitle")}
            </p>
            <p className="text-xs text-muted-strong">
              {t("companySettings.projectsSubtitle")}
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowNewProjectForm((value) => !value)}
            className="rounded-xl px-3"
            aria-label={
              showNewProjectForm ? "Hide project form" : "Show project form"
            }
            icon={
              showNewProjectForm ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )
            }
          />
        </div>

        {showNewProjectForm && (
          <form onSubmit={handleCreate} className="space-y-3">
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
                className="disabled:cursor-not-allowed disabled:bg-[#f3f4f5]"
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
              {selectedClient
                ? t("companySettings.creatingUnder", {
                    clientName: selectedClient.name,
                  })
                : t("companySettings.pickClientToCreate")}
            </p>
          </form>
        )}

        <div className="max-h-100 space-y-2 overflow-y-auto px-2">
          {visibleProjects.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-strong bg-bg-accent px-4 py-3 text-sm text-muted-strong">
              {selectedClient
                ? t("companySettings.noProjectsForClient", {
                    clientName: selectedClient.name,
                  })
                : t("companySettings.noProjects")}
            </p>
          ) : (
            visibleProjects.map((project) => (
              <div
                key={project.id}
                className={`flex items-center justify-between gap-3 rounded-xl border border-border-strong bg-bg p-3 ${
                  project.is_active ? "" : "opacity-60"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-text">
                    {project.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-strong">
                    {clients.find((client) => client.id === project.client_id)
                      ?.name ?? t("companySettings.unknownClient")}
                  </p>
                  <p className="mt-1 text-xs text-muted-strong">
                    {t("companySettings.estimatedHoursPerMonthLabel")}:{" "}
                    {project.estimated_hours_per_month}
                  </p>
                  <p className="mt-1 text-xs text-muted-strong">
                    {project.is_active
                      ? t("common.active")
                      : t("common.inactive")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleToggleActivity(project)}
                    disabled={loading}
                    className="rounded-xl px-3"
                    icon={
                      project.is_active ? (
                        <ToggleRight className="h-4 w-4" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )
                    }
                  ></Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingProject(project)}
                    disabled={loading}
                    className="rounded-xl px-3"
                    icon={<PencilLine className="h-4 w-4" />}
                  ></Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setDeletingProjectId(project.id)}
                    disabled={loading}
                    className="rounded-xl px-3"
                    icon={<Trash2 className="h-4 w-4" />}
                  ></Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {editingProject && (
        <Modal
          open={!!editingProject}
          onClose={() => setEditingProject(null)}
          title={t("companySettings.editProject")}
        >
          <div className="space-y-4 p-4">
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
          </div>
        </Modal>
      )}

      {deletingProjectId && (
        <Modal
          open={!!deletingProjectId}
          onClose={() => setDeletingProjectId(null)}
          title={t("companySettings.deleteProject")}
        >
          <div className="space-y-4 p-4">
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
          </div>
        </Modal>
      )}
    </Card>
  );
};
