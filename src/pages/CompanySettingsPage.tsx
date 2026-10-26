import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/useAuth";
import { fetchClients, fetchProjects } from "../services/clientProjectService";
import { CompanySettingsHeader } from "../components/company-settings/CompanySettingsHeader";
import { ClientManagementCard } from "../components/company-settings/ClientManagementCard";
import { ProjectManagementCard } from "../components/company-settings/ProjectManagementCard";
import { CompanyLogoCard } from "../components/company-settings/CompanyLogoCard";
import { LeaveConfigurationCard } from "../components/company-settings/LeaveConfigurationCard";
import { getCompanyLogoUrl } from "../services/companyLogoService";
import { InvoiceSettingsCard } from "../components/company-settings/InvoiceSettingsCard";
import { companyService } from "../services/companyService";
import { LoadError } from "../components/shared/LoadError";
import { PageLoading } from "../components/shared/PageLoading";

export const CompanySettingsPage: React.FC = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const companyId = profile?.company_id || "";
  const clientsQuery = useQuery({
    queryKey: ["all-clients", companyId],
    queryFn: () => fetchClients(companyId),
    enabled: Boolean(companyId),
  });
  const projectsQuery = useQuery({
    queryKey: ["all-projects", companyId],
    queryFn: () => fetchProjects(companyId),
    enabled: Boolean(companyId),
  });
  const companyQuery = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => companyService.fetchCompany(companyId),
    enabled: Boolean(companyId),
  });
  const invoiceQuery = useQuery({
    queryKey: ["invoice-settings", companyId],
    queryFn: () => companyService.getInvoiceSettings(companyId),
    enabled: Boolean(companyId),
  });
  const clients = clientsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const company = companyQuery.data;
  const invoiceSettings = invoiceQuery.data;

  const refreshCompanySettings = () => {
    // Client/project changes affect selectors, reports, and invoice selections.
    for (const key of ["all-clients", "all-projects", "clients", "projects", "active-clients", "active-projects", "activeClients", "review-clients", "review-projects", "adminDashboard"]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
  const refreshInvoiceSettings = () => {
    void queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    void queryClient.invalidateQueries({ queryKey: ["invoice-settings", companyId] });
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <CompanySettingsHeader title={t("companySettings.title")} subtitle={t("companySettings.subtitle")} />
      <div className="flex flex-col gap-6">
        {clientsQuery.isLoading || projectsQuery.isLoading ? <PageLoading />
          : clientsQuery.isError || projectsQuery.isError ? <LoadError
            retrying={clientsQuery.isFetching || projectsQuery.isFetching}
            onRetry={() => { void clientsQuery.refetch(); void projectsQuery.refetch(); }} />
          : <>
            <ClientManagementCard clients={clients} onRefresh={refreshCompanySettings} companyId={companyId} />
            <ProjectManagementCard companyId={companyId} clients={clients} projects={projects} onRefresh={refreshCompanySettings} />
            <LeaveConfigurationCard companyId={companyId} clients={clients} projects={projects} />
          </>}
        {companyQuery.isLoading || invoiceQuery.isLoading ? <PageLoading />
          : companyQuery.isError || invoiceQuery.isError ? <LoadError
            retrying={companyQuery.isFetching || invoiceQuery.isFetching}
            onRetry={() => { void companyQuery.refetch(); void invoiceQuery.refetch(); }} />
          : <InvoiceSettingsCard
            key={`${companyId}-${invoiceSettings?.invoice_provider}-${invoiceSettings?.api_key_configured}-${company?.szamlazz_test_mode}`}
            companyId={companyId} settings={invoiceSettings}
            initialTestMode={company?.szamlazz_test_mode ?? true} onUpdate={refreshInvoiceSettings} />}
        <CompanyLogoCard key={companyId} companyId={companyId} initialLogoUrl={companyId ? getCompanyLogoUrl(companyId) : null} />
      </div>
    </div>
  );
};
