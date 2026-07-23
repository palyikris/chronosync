import React, { useState } from "react";
import {
  FolderPlus,
  PencilLine,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { Button } from "../shared/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../shared/Card";
import { Input } from "../shared/Input";
import { Modal } from "../shared/Modal";
import type { ProjectManagementCardProps } from "../../types/company-settings";
import {
  createProject,
  deleteProject,
  updateProjectActivity,
  updateProject,
} from "../../services/clientProjectService";
import type { Project } from "../../types/client-project";

export const ProjectManagementCard: React.FC<ProjectManagementCardProps> = ({
  companyId,
  clients,
  projects,
  onRefresh,
}) => {
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectClientId, setNewProjectClientId] = useState("");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

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
      await createProject(companyId, newProjectClientId, newProjectName.trim());
      setNewProjectName("");
      setNewProjectClientId("");
      onRefresh();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to create project",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingProject || !editingProject.name.trim()) return;

    try {
      setLoading(true);
      await updateProject(editingProject.id, editingProject.name.trim());
      setEditingProject(null);
      onRefresh();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to update project",
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
          : "Failed to update project activity",
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
          : "Failed to delete project. Check dependent records first.",
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
              2. Manage Projects
            </CardTitle>
            <p className="mt-1 text-sm text-muted-strong">
              Create, rename, and remove project records from one place.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-0 pb-0">
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_1.1fr_auto] md:items-end">
            <select
              required
              value={newProjectClientId}
              onChange={(event) => setNewProjectClientId(event.target.value)}
              className="h-11 rounded-xl border border-border-strong bg-bg px-3 text-sm text-text outline-none transition focus:border-primary"
            >
              <option value="">Select a client first...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>

            <Input
              type="text"
              required
              disabled={!newProjectClientId}
              placeholder={
                newProjectClientId ? "New project name" : "Select client"
              }
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              className="disabled:cursor-not-allowed disabled:bg-[#f3f4f5]"
            />

            <Button
              type="submit"
              disabled={
                !newProjectClientId || !newProjectName.trim() || loading
              }
              className="gap-1 rounded-xl px-4"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-strong">
            {selectedClient
              ? `Creating under ${selectedClient.name}`
              : "Pick a client to attach the new project."}
          </p>
        </form>

        <div className="max-h-72 space-y-2 overflow-y-auto px-2">
          {visibleProjects.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-strong bg-bg-accent px-4 py-3 text-sm text-muted-strong">
              {selectedClient
                ? `No projects found for ${selectedClient.name}.`
                : "No projects yet. Add your first project above to get started."}
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
                      ?.name ?? "Unknown client"}
                  </p>
                  <p className="mt-1 text-xs text-muted-strong">
                    {project.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleToggleActivity(project)}
                    disabled={loading}
                    className="gap-1 rounded-xl px-3"
                  >
                    {project.is_active ? (
                      <ToggleRight className="h-4 w-4" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingProject(project)}
                    disabled={loading}
                    className="gap-1 rounded-xl px-3"
                  >
                    <PencilLine className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setDeletingProjectId(project.id)}
                    disabled={loading}
                    className="gap-1 rounded-xl px-3"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
          title="Edit Project"
        >
          <div className="space-y-4 p-4">
            <Input
              placeholder="Project Name"
              value={editingProject.name}
              onChange={(event) =>
                setEditingProject({
                  ...editingProject,
                  name: event.target.value,
                })
              }
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setEditingProject(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={loading}
                className="rounded-xl"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {deletingProjectId && (
        <Modal
          open={!!deletingProjectId}
          onClose={() => setDeletingProjectId(null)}
          title="Delete Project"
        >
          <div className="space-y-4 p-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete this project? Deleting a project
              may fail if dependent records exist.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeletingProjectId(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-xl"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};
