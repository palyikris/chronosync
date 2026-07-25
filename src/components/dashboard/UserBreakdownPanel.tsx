// src/components/dashboard/UserBreakdownPanel.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { BreakdownPanel } from "./BreakdownPanel";
import type { UserWorkBreakdown, BreakdownItem } from "../../types/dashboard";

interface UserBreakdownPanelProps {
  breakdown: UserWorkBreakdown[];
}

export const UserBreakdownPanel: React.FC<UserBreakdownPanelProps> = ({
  breakdown,
}) => {
  const { t } = useTranslation();
  const items: BreakdownItem[] = breakdown.map((u) => ({
    id: u.userId,
    primaryLabel: u.userName,
    secondaryLabel: u.userEmail,
    totalHours: u.totalHours,
    percentage: u.percentage,
  }));

  return (
    <BreakdownPanel
      title={t("dashboard.breakdownUsersTitle")}
      subtitle={t("dashboard.breakdownUsersSubtitle")}
      emptyMessage={t("dashboard.breakdownUsersEmpty")}
      items={items}
    />
  );
};
