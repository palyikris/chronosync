import React from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LeaveErrorBannerProps } from "./types";

export const LeaveErrorBanner: React.FC<LeaveErrorBannerProps> = ({
  error,
  conflictingDates,
}) => {
  const { t } = useTranslation();

  if (!error) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="font-semibold">{error}</div>
          {conflictingDates.length > 0 ? (
            <div className="mt-1 text-xs">
              {t("leave.conflictingDates")}: {conflictingDates.join(", ")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
