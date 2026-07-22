import React from "react";
import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "../shared/Card";
import type { TimesheetSummaryProps } from "../../types/timesheet";

export const TimesheetSummary: React.FC<TimesheetSummaryProps> = ({ totalMonthlyHours }) => {
  return (
    <Card className="border-primary/60 bg-primary/20">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted">Monthly Total</div>
          <div className="text-xl font-extrabold text-primary-foreground">
            {totalMonthlyHours} hrs <span className="text-xs font-normal text-gray-600">logged</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};