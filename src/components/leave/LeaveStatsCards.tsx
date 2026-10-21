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
        accentClass: "border-blue-200 bg-blue-50/90",
        dotClass: "bg-blue-500",
        labelClass: "text-blue-700",
        valueClass: "text-blue-900",
      },
      {
        label: t("leave.approvedRequests"),
        value: approvedRequests,
        accentClass: "border-green-200 bg-green-50/90",
        dotClass: "bg-green-500",
        labelClass: "text-green-700",
        valueClass: "text-green-900",
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
