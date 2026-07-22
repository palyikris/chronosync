import type React from "react";
import type { Client, Project } from "./client-project";

export interface CompanySettingsHeaderProps {
  title: string;
  subtitle: string;
}

export interface ClientManagementCardProps {
  clients: Client[];
  projects: Project[];
  clientName: string;
  onClientNameChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  isSaving: boolean;
}

export interface ProjectManagementCardProps {
  clients: Client[];
  projects: Project[];
  selectedClientId: string;
  projectName: string;
  onSelectedClientIdChange: (value: string) => void;
  onProjectNameChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  isSaving: boolean;
}