import React from "react";
import { Briefcase, Building2, Plus } from "lucide-react";
import { Button } from "../shared/Button";
import { Card } from "../shared/Card";
import { Input } from "../shared/Input";
import type { ClientManagementCardProps } from "../../types/company-settings";

export const ClientManagementCard: React.FC<ClientManagementCardProps> = ({
  clients,
  projects,
  clientName,
  onClientNameChange,
  onSubmit,
  isSaving,
}) => {
  return (
    <Card className="space-y-6 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-bg-accent p-2.5 text-primary-strong">
          <Building2 className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-bold text-text">1. Add Client</h2>
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          type="text"
          required
          placeholder="Client or Company Name"
          value={clientName}
          onChange={(event) => onClientNameChange(event.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={isSaving} className="gap-1 rounded-xl px-4">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </form>

      <div className="max-h-60 space-y-2 overflow-y-auto">
        <h3 className="text-xs font-semibold uppercase text-muted">Existing Clients</h3>
        {clients.length === 0 ? (
          <p className="text-sm italic text-muted-strong">No clients created yet.</p>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              className="flex items-center justify-between rounded-xl border border-border-strong bg-bg p-3 text-sm font-medium text-text"
            >
              <span className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted" />
                {client.name}
              </span>
              <span className="text-xs text-muted-strong">
                {projects.filter((project) => project.client_id === client.id).length} Projects
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};