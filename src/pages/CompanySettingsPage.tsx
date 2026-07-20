import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import {
  type Client,
  type Project,
  fetchClients,
  fetchProjects,
  createClient,
  createProject,
} from "../services/clientProjectService";
import { CompanySettingsHeader } from "../components/company-settings/CompanySettingsHeader";
import { ClientManagementCard } from "../components/company-settings/ClientManagementCard";
import { ProjectManagementCard } from "../components/company-settings/ProjectManagementCard";

export const CompanySettingsPage: React.FC = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [clientName, setClientName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [projectName, setProjectName] = useState("");

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(),
  });

  const createClientMutation = useMutation({
    mutationFn: (name: string) => createClient(name, profile!.company_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setClientName("");
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: ({ name, clientId }: { name: string; clientId: string }) =>
      createProject(name, clientId, profile!.company_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setProjectName("");
    },
  });

  const handleAddClient = (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.company_id) return;
    if (!clientName.trim()) return;

    createClientMutation.mutate(clientName.trim());
  };

  const handleAddProject = (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.company_id) return;
    if (!projectName.trim() || !selectedClientId) return;

    createProjectMutation.mutate({
      name: projectName.trim(),
      clientId: selectedClientId,
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <CompanySettingsHeader
        title="Company Settings"
        subtitle="Manage your clients and project structure"
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ClientManagementCard
          clients={clients}
          projects={projects}
          clientName={clientName}
          onClientNameChange={setClientName}
          onSubmit={handleAddClient}
          isSaving={createClientMutation.isPending}
        />

        <ProjectManagementCard
          clients={clients}
          projects={projects}
          selectedClientId={selectedClientId}
          projectName={projectName}
          onSelectedClientIdChange={setSelectedClientId}
          onProjectNameChange={setProjectName}
          onSubmit={handleAddProject}
          isSaving={createProjectMutation.isPending}
        />
      </div>
    </div>
  );
};
