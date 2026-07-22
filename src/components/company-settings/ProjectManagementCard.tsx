import React from "react";
import { FolderPlus, Plus } from "lucide-react";
import { Button } from "../shared/Button";
import { Card } from "../shared/Card";
import { Input } from "../shared/Input";
import { Select } from "../shared/Select";
import type { ProjectManagementCardProps } from "../../types/company-settings";

export const ProjectManagementCard: React.FC<ProjectManagementCardProps> = ({
  clients,
  projects,
  selectedClientId,
  projectName,
  onSelectedClientIdChange,
  onProjectNameChange,
  onSubmit,
  isSaving,
}) => {
  const selectedClient = clients.find((client) => client.id === selectedClientId);

  return (
    <Card className="space-y-6 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-bg-accent p-2.5 text-primary-strong">
          <FolderPlus className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-bold text-text">2. Add Project to Client</h2>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <Select
          required
          value={selectedClientId}
          onChange={(event) => onSelectedClientIdChange(event.target.value)}
        >
          <option value="">Select a Client First...</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </Select>

        <div className="flex gap-2">
          <Input
            type="text"
            required
            disabled={!selectedClientId}
            placeholder={selectedClientId ? "Project Name" : "Select client above"}
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            className="flex-1 disabled:cursor-not-allowed disabled:bg-[#f3f4f5]"
          />
          <Button
            type="submit"
            disabled={!selectedClientId || isSaving}
            className="gap-1 rounded-xl px-4"
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </form>

      <div className="max-h-60 space-y-2 overflow-y-auto">
        <h3 className="text-xs font-semibold uppercase text-muted">
          {selectedClient ? `Projects for ${selectedClient.name}` : "All Projects"}
        </h3>
        {projects.length === 0 ? (
          <p className="text-sm italic text-muted-strong">No projects created yet.</p>
        ) : (
          projects
            .filter((project) => (!selectedClientId ? true : project.client_id === selectedClientId))
            .map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between rounded-xl border border-border-strong bg-bg p-3 text-sm font-medium text-text"
              >
                <span>{project.name}</span>
                <span className="rounded bg-bg-accent px-2 py-0.5 text-xs text-muted-strong">
                  {clients.find((client) => client.id === project.client_id)?.name}
                </span>
              </div>
            ))
        )}
      </div>
    </Card>
  );
};