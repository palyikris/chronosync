import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, ShieldCheck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../shared/Card";
import { Button } from "../shared/Button";
import { LoadError } from "../shared/LoadError";
import { Select } from "../shared/Select";
import { companyService } from "../../services/companyService";
import type { Client, Project } from "../../types/client-project";

interface LeaveConfigurationCardProps {
  companyId: string;
  clients: Client[];
  projects: Project[];
}

export const LeaveConfigurationCard: React.FC<LeaveConfigurationCardProps> = ({
  companyId,
  clients,
  projects,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [draftClientId, setSelectedClientId] = useState<string | null>(null);
  const [draftProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: companyLeaveConfig, isLoading, isError, refetch } = useQuery({
    queryKey: ["company-leave-config", companyId],
    queryFn: () => companyService.getCompanyLeaveConfig(companyId),
    enabled: Boolean(companyId),
  });

  const selectedClientId = draftClientId ?? companyLeaveConfig?.leave_client_id ?? "";
  const selectedProjectId = draftProjectId ?? companyLeaveConfig?.leave_project_id ?? "";

  const filteredProjects = useMemo(() => {
    if (!selectedClientId) {
      return projects;
    }

    return projects.filter((project) => project.client_id === selectedClientId);
  }, [projects, selectedClientId]);

  const handleSave = async () => {
    if (!companyId || isSaving) return;
    if (!selectedClientId || !selectedProjectId) {
      alert(t("companySettings.leaveConfigRequiresSelection"));
      return;
    }

    try {
      setIsSaving(true);
      await companyService.updateCompanyLeaveConfig(companyId, {
        leave_client_id: selectedClientId,
        leave_project_id: selectedProjectId,
      });
      queryClient.setQueryData(["company-leave-config", companyId], {
        ...companyLeaveConfig,
        leave_client_id: selectedClientId, leave_project_id: selectedProjectId,
      });
      setSelectedClientId(null);
      setSelectedProjectId(null);
      setSaved(true);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : t("companySettings.leaveConfigSaveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="space-y-5 p-5">
      <CardHeader className="rounded-t-2xl border-b-0 bg-transparent px-0 py-0">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-bg-accent p-2.5 text-primary-strong">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-[15px] font-semibold text-text">
              {t("companySettings.leaveConfigTitle")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-strong">
              {t("companySettings.leaveConfigSubtitle")}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-0 pb-0">
        {isError ? <LoadError onRetry={() => { void refetch(); }} /> : null}
        {saved ? <p role="status" className="text-sm text-primary-strong">{t("common.changesSaved")}</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            id="leave-client-select"
            label={t("companySettings.leaveClientLabel")}
            value={selectedClientId}
            onChange={(event) => {
              setSaved(false);
              setSelectedClientId(event.target.value);
              setSelectedProjectId("");
            }}
          >
            <option value="">{t("companySettings.selectClient")}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>

          <Select
            id="leave-project-select"
            label={t("companySettings.leaveProjectLabel")}
            value={selectedProjectId}
            onChange={(event) => { setSaved(false); setSelectedProjectId(event.target.value); }}
            disabled={!selectedClientId}
          >
            <option value="">{t("companySettings.selectProject")}</option>
            {filteredProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border-strong bg-bg-accent px-4 py-3 text-sm text-muted-strong">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary-strong" />
            <span>{t("companySettings.leaveConfigHint")}</span>
          </div>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading || isError || !selectedClientId || !selectedProjectId}
            variant="primary"
          >
            {isSaving
              ? t("common.saving")
              : t("companySettings.saveChanges")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
