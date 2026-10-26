import { CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

export function TimesheetRejectionNotice({ reason }: { reason?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-w-0 gap-2.5 rounded-xl border border-rose-200/80 bg-rose-50/70 p-3 text-rose-900">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-semibold">{t("timesheet.rejectionReasonTitle")}</p>
        <p className="whitespace-pre-wrap text-[13px] leading-5 [overflow-wrap:anywhere]">
          {reason?.trim() || t("timesheet.noRejectionReason")}
        </p>
      </div>
    </div>
  );
}
