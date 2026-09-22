import type React from "react";
import type { Client, Project } from "./client-project";

export type InvoiceProvider = "szamlazz_hu" | "billingo";

export interface InvoiceSettings {
  invoice_provider: InvoiceProvider;
  api_key_configured: boolean;
}

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
  companyId: string;
  clients: Client[];
  projects: Project[];
  onRefresh: () => void;
}