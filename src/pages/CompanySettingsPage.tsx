import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/useAuth";
import { fetchClients, fetchProjects } from "../services/clientProjectService";
import { CompanySettingsHeader } from "../components/company-settings/CompanySettingsHeader";
import { ClientManagementCard } from "../components/company-settings/ClientManagementCard";
import { ProjectManagementCard } from "../components/company-settings/ProjectManagementCard";
import type { Client, Project } from "../types/client-project";
import { CompanyLogoCard } from "../components/company-settings/CompanyLogoCard";
import { LeaveConfigurationCard } from "../components/company-settings/LeaveConfigurationCard";
import { getCompanyLogoUrl } from "../services/companyLogoService";
import { InvoiceSettingsCard } from "../components/company-settings/InvoiceSettingsCard";
import { companyService } from "../services/companyService";

export const CompanySettingsPage: React.FC = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const companyId = profile?.company_id || "";

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients", profile?.id, profile?.company_id],
    queryFn: () => fetchClients(profile?.company_id || ""),
    enabled: Boolean(profile?.company_id),
  });

  const { data: company, refetch: refetchCompanyData } = useQuery({
    queryKey: ["company", profile?.company_id],
    queryFn: () => companyService.fetchCompany(profile?.company_id || ""),
    enabled: Boolean(profile?.company_id),
  });

  const { data: invoiceSettings } = useQuery({
    queryKey: ["invoice-settings", profile?.company_id],
    queryFn: () => companyService.getInvoiceSettings(companyId),
    enabled: Boolean(companyId),
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
    <div className="mx-auto w-full space-y-8">
      <CompanySettingsHeader
        title={t("companySettings.title")}
        subtitle={t("companySettings.subtitle")}
      />

      <div className="flex flex-col gap-8">
        <ClientManagementCard
          clients={clients}
          onRefresh={refreshCompanySettings}
          companyId={companyId}
        />

        <ProjectManagementCard
          companyId={companyId}
          clients={clients}
          projects={projects}
          onRefresh={refreshCompanySettings}
        />

        <LeaveConfigurationCard
          companyId={companyId}
          clients={clients}
          projects={projects}
        />

        <InvoiceSettingsCard
          key={`${companyId}-${invoiceSettings?.invoice_provider ?? "szamlazz_hu"}-${invoiceSettings?.api_key_configured ?? false}-${company?.szamlazz_test_mode ?? true}`}
          companyId={companyId}
          settings={invoiceSettings}
          initialTestMode={company?.szamlazz_test_mode ?? true}
          onUpdate={refetchCompanyData}
        />

        <CompanyLogoCard
          key={companyId}
          companyId={companyId}
          initialLogoUrl={companyId ? getCompanyLogoUrl(companyId) : null}
        />
      </div>
    </div>
  );
};
