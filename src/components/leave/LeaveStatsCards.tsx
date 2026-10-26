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
      {
        label: t("leave.totalRequests"),
        value: totalRequests,
        accentClass: "border-primary/20 bg-primary/5",
        dotClass: "bg-primary",
        labelClass: "text-primary-strong",
        valueClass: "text-text",
      },
      {
        label: t("leave.pendingRequests"),
        value: pendingRequests,
        accentClass: "border-info-border bg-info-bg",
        dotClass: "bg-info",
        labelClass: "text-info",
        valueClass: "text-info",
      },
      {
        label: t("leave.approvedRequests"),
        value: approvedRequests,
        accentClass: "border-success-border bg-success-bg",
        dotClass: "bg-success",
        labelClass: "text-success",
        valueClass: "text-success",
      },
    ],
    [approvedRequests, pendingRequests, t, totalRequests],
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} className={card.accentClass}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className={`text-[11px] font-medium ${card.labelClass}`}>
                {card.label}
              </div>
              <span className={`h-2.5 w-2.5 rounded-full ${card.dotClass}`} />
            </div>
            <div className={`mt-3 text-[28px] font-semibold tracking-[-0.04em] ${card.valueClass}`}>
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
