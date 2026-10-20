import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/useAuth";
import { getKPIsForCompany, getTimesheetReviews } from "../services/reviewService";
import { KpiSummaryCards, type KpiSummaryCardItem } from "../components/shared/KpiSummaryCards";
import {
  TimesheetReviewFilterPopover,
  type TimesheetReviewFilterState,
} from "../components/review/TimesheetReviewFilterPopover";
import { ClockArrowUp, ClockCheck, UserRoundSearch } from "lucide-react";
import { useMemo, useState } from "react";
import type { TimesheetEntryStatus } from "../types/timesheet";
import {
  fetchClients,
  fetchProjects,
} from "../services/clientProjectService";
import { fetchSelectableCompanyUsers } from "../services/timesheetService";
import { TimesheetReviewTable } from "../components/review/TimesheetReviewTable";

export default function TimesheetReviewPage() {
  const { profile } = useAuth();
  const { t } = useTranslation();

  const [statusFilter, setStatusFilter] = useState<TimesheetEntryStatus | "all">("all");
  const [userIdFilter, setUserIdFilter] = useState<string | null>(null);
  const [startDateFilter, setStartDateFilter] = useState<string | null>(null);
  const [endDateFilter, setEndDateFilter] = useState<string | null>(null);
  const [projectIdFilter, setProjectIdFilter] = useState<string | null>(null);
  const [clientIdFilter, setClientIdFilter] = useState<string | null>(null);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  const {
    data: kpis,
    isLoading,
    isError: isKpiError,
  } = useQuery({
    queryKey: ["kpis", profile?.company_id],
    queryFn: () => getKPIsForCompany(profile?.company_id || ""),
    enabled: !!profile?.company_id,
  });

  const { data: reviewClients = [], isError: isClientsError } = useQuery({
    queryKey: ["review-clients", profile?.company_id],
    queryFn: () => fetchClients(profile?.company_id || ""),
    enabled: !!profile?.company_id,
  });

  const { data: reviewProjects = [], isError: isProjectsError } = useQuery({
    queryKey: ["review-projects", profile?.company_id],
    queryFn: () => fetchProjects(profile?.company_id || ""),
    enabled: !!profile?.company_id,
  });

  const { data: employees = [], isError: isEmployeesError } = useQuery({
    queryKey: ["review-employees", profile?.company_id],
    queryFn: () => fetchSelectableCompanyUsers(profile?.company_id),
    enabled: !!profile?.company_id,
  });

  const {
    data: timesheetsForReview = [],
    isLoading: isReviewLoading,
    isError: isReviewError,
  } = useQuery({
    queryKey: [
      "timesheets-for-review",
      profile?.company_id,
      statusFilter,
      userIdFilter,
      startDateFilter,
      endDateFilter,
      projectIdFilter,
      clientIdFilter,
    ],
    queryFn: () => getTimesheetReviews(profile?.company_id || "", {
      status: statusFilter,
      userId: userIdFilter,
      startDate: startDateFilter,
      endDate: endDateFilter,
      projectId: projectIdFilter,
      clientId: clientIdFilter,
    }),
    enabled: !!profile?.company_id,
  });

  const tableResetKey = useMemo(
    () =>
      [
        statusFilter,
        userIdFilter,
        startDateFilter,
        endDateFilter,
        projectIdFilter,
        clientIdFilter,
      ].join(":"),
    [
      statusFilter,
      userIdFilter,
      startDateFilter,
      endDateFilter,
      projectIdFilter,
      clientIdFilter,
    ],
  );

  const hasLoadError =
    isKpiError ||
    isClientsError ||
    isProjectsError ||
    isEmployeesError ||
    isReviewError;

  const reviewFilters: TimesheetReviewFilterState = {
    status: statusFilter,
    userId: userIdFilter,
    startDate: startDateFilter,
    endDate: endDateFilter,
    projectId: projectIdFilter,
    clientId: clientIdFilter,
  };

  const handleResetFilters = () => {
    setStatusFilter("all");
    setUserIdFilter(null);
    setStartDateFilter(null);
    setEndDateFilter(null);
    setProjectIdFilter(null);
    setClientIdFilter(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary-strong"></div>
      </div>
    );
  }

  const kpiItems: KpiSummaryCardItem[] = [
    {
      title: t("timesheetReview.kpiTotalSubmitted"),
      value: kpis?.totalSubmittedHours ?? 0,
      subtitle: t("timesheetReview.kpiTotalSubmittedSubtitle"),
      icon: ClockArrowUp,
      valueSuffix: " " + t("review.kpiHours"),
    },
    {
      title: t("timesheetReview.kpiTotalApproved"),
      value: kpis?.totalApprovedHours ?? 0,
      subtitle: t("timesheetReview.kpiTotalApprovedSubtitle"),
      icon: ClockCheck,
      valueSuffix: " " + t("review.kpiHours"),
    },
    // {
    //   title: "Total Rejected Hours",
    //   value: data?.totalRejected ?? 0,
    //   subtitle: "Total hours rejected by company admins",
    //   icon: ClockAlert,
    //   valueSuffix: " hrs",
    // },
    {
      title: t("timesheetReview.kpiPendingEmployees"),
      value: kpis?.employeesPendingReview ?? 0,
      subtitle: t("timesheetReview.kpiPendingEmployeesSubtitle"),
      icon: UserRoundSearch,
    },
  ];

  return (
    <div className="mx-auto w-full space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-text sm:text-[28px]">
            {t("navigation.timesheetReview")}
          </h1>
        </div>

        <TimesheetReviewFilterPopover
          filters={reviewFilters}
          onChange={(nextFilters) => {
            setStatusFilter(nextFilters.status);
            setUserIdFilter(nextFilters.userId);
            setStartDateFilter(nextFilters.startDate);
            setEndDateFilter(nextFilters.endDate);
            setProjectIdFilter(nextFilters.projectId);
            setClientIdFilter(nextFilters.clientId);
          }}
          clients={reviewClients}
          projects={reviewProjects}
          isOpen={isFilterPopoverOpen}
          onToggle={() => setIsFilterPopoverOpen((open) => !open)}
          onReset={handleResetFilters}
          employees={employees}
        />
      </div>

      <KpiSummaryCards items={kpiItems}></KpiSummaryCards>

      {hasLoadError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {t("timesheetReview.loadError")}
        </div>
      ) : null}

      <TimesheetReviewTable
        key={tableResetKey}
        entries={timesheetsForReview}
        isLoading={isReviewLoading}
      ></TimesheetReviewTable>
    </div>
  );
}
