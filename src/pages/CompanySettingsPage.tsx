import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { fetchClients, fetchProjects } from "../services/clientProjectService";
import { CompanySettingsHeader } from "../components/company-settings/CompanySettingsHeader";
import { ClientManagementCard } from "../components/company-settings/ClientManagementCard";
import { ProjectManagementCard } from "../components/company-settings/ProjectManagementCard";
import type { Client, Project } from "../types/client-project";

export const CompanySettingsPage: React.FC = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients", profile?.id, profile?.company_id],
    queryFn: () => fetchClients(profile?.company_id || ""),
    enabled: Boolean(profile?.company_id),
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects", profile?.id, profile?.company_id],
    queryFn: () => fetchProjects(profile?.company_id || ""),
    enabled: Boolean(profile?.company_id),
  });

  const refreshCompanySettings = () => {
    queryClient.invalidateQueries({
      queryKey: ["clients", profile?.id, profile?.company_id],
    });
    queryClient.invalidateQueries({
      queryKey: ["projects", profile?.id, profile?.company_id],
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <CompanySettingsHeader
        title="Company Settings"
        subtitle="Manage your clients and project structure"
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <ClientManagementCard
          clients={clients}
          onRefresh={refreshCompanySettings}
          companyId={profile?.company_id || ""}
        />

        <ProjectManagementCard
          companyId={profile?.company_id || ""}
          clients={clients}
          projects={projects}
          onRefresh={refreshCompanySettings}
        />
      </div>
    </div>
  );
};
