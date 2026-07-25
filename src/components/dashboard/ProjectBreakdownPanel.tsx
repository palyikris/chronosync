// src/components/dashboard/ProjectBreakdownPanel.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { BreakdownPanel } from "./BreakdownPanel";
import type {
  ClientProjectBreakdown,
  BreakdownItem,
} from "../../types/dashboard";

interface ProjectBreakdownPanelProps {
  breakdown: ClientProjectBreakdown[];
}

export const ProjectBreakdownPanel: React.FC<ProjectBreakdownPanelProps> = ({
  breakdown,
}) => {
  const { t } = useTranslation();
  const items: BreakdownItem[] = breakdown.map((b) => ({
    id: `${b.clientId}-${b.projectId}`,
    primaryLabel: b.clientName,
    secondaryLabel: b.projectName,
    totalHours: b.totalHours,
    percentage: b.percentage,
  }));

  return (
    <BreakdownPanel
      title={t("dashboard.breakdownProjectsTitle")}
      subtitle={t("dashboard.breakdownProjectsSubtitle")}
      emptyMessage={t("dashboard.breakdownProjectsEmpty")}
      items={items}
    />
  );
};
