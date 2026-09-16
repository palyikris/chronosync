import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "../shared/Card";
import type { LeaveStatsCardsProps } from "./types";

export const LeaveStatsCards: React.FC<LeaveStatsCardsProps> = ({
  totalRequests,
  pendingRequests,
  approvedRequests,
}) => {
  const { t } = useTranslation();

  const cards = useMemo(
    () => [
      { label: t("leave.totalRequests"), value: totalRequests },
      { label: t("leave.pendingRequests"), value: pendingRequests },
      { label: t("leave.approvedRequests"), value: approvedRequests },
    ],
    [approvedRequests, pendingRequests, t, totalRequests],
  );

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              {card.label}
            </div>
            <div className="mt-3 text-3xl font-extrabold text-text">
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
