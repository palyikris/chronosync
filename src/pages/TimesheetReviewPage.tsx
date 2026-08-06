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
  fetchActiveClients,
  fetchActiveProjects,
} from "../services/clientProjectService";
import { TimesheetReviewTable } from "../components/review/TimesheetReviewTable";

export default function TimesheetReviewPage() {

  const { profile } = useAuth();
  const { t } = useTranslation();

  const [statusFilter, setStatusFilter] = useState<TimesheetEntryStatus | "all">("all");
  const [userFilter, setUserFilter] = useState<string | null>(null);
  const [startDateFilter, setStartDateFilter] = useState<string | null>(null);
  const [endDateFilter, setEndDateFilter] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  const { data: kpis, isLoading } = useQuery({
    queryKey: ["kpis", profile?.company_id],
    queryFn: () => getKPIsForCompany(profile?.company_id || ""),
    enabled: !!profile?.company_id,
  });

  const { data: activeClients = [] } = useQuery({
    queryKey: ["review-active-clients", profile?.company_id],
    queryFn: () => fetchActiveClients(profile?.company_id || ""),
    enabled: !!profile?.company_id,
  });

  const { data: activeProjects = [] } = useQuery({
    queryKey: ["review-active-projects", profile?.company_id],
    queryFn: () => fetchActiveProjects(profile?.company_id || ""),
    enabled: !!profile?.company_id,
  });

  const {data: timesheetsForReview} = useQuery({
    queryKey: ["timesheets-for-review", profile?.company_id, statusFilter, startDateFilter, endDateFilter, projectFilter, clientFilter],
    queryFn: () => getTimesheetReviews(profile?.company_id || "", {
      status: statusFilter,
      startDate: startDateFilter,
      endDate: endDateFilter,
      projectId: projectFilter
        ? activeProjects.find((project) => project.name === projectFilter)?.id ?? null
        : null,
      clientId: clientFilter
        ? activeClients.find((client) => client.name === clientFilter)?.id ?? null
        : null,
    }),
    enabled: !!profile?.company_id,
  });

  const filteredTimesheetsForReview = useMemo(() => {
    const searchTerm = userFilter?.trim().toLowerCase();

    if (!searchTerm) {
      return timesheetsForReview || [];
    }

    return (timesheetsForReview || []).filter((entry) => {
      const fullName = entry.profiles?.full_name?.toLowerCase() ?? "";
      const fallbackId = entry.user_id.toLowerCase();
      return fullName.includes(searchTerm) || fallbackId.includes(searchTerm);
    });
  }, [timesheetsForReview, userFilter]);

  const reviewFilters: TimesheetReviewFilterState = {
    status: statusFilter,
    user: userFilter,
    startDate: startDateFilter,
    endDate: endDateFilter,
    project: projectFilter,
    client: clientFilter,
  };

  const handleResetFilters = () => {
    const thisMonthFirstDay = new Date();
    thisMonthFirstDay.setDate(1);
    const thisMonthLastDay = new Date(thisMonthFirstDay.getFullYear(), thisMonthFirstDay.getMonth() + 1, 0);

    setStatusFilter("all");
    setUserFilter(null);
    setStartDateFilter(thisMonthFirstDay.toISOString().split("T")[0]);
    setEndDateFilter(thisMonthLastDay.toISOString().split("T")[0]);
    setProjectFilter(null);
    setClientFilter(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const kpiItems: KpiSummaryCardItem[] = [
    {
      title: t("timesheetReview.kpiTotalSubmitted"),
      value: kpis?.totalSubmitted ?? 0,
      subtitle: t("timesheetReview.kpiTotalSubmittedSubtitle"),
      icon: ClockArrowUp,
      valueSuffix: " hrs",
    },
    {
      title: t("timesheetReview.kpiTotalApproved"),
      value: kpis?.totalApproved ?? 0,
      subtitle: t("timesheetReview.kpiTotalApprovedSubtitle"),
      icon: ClockCheck,
      valueSuffix: " hrs",
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
  ]

  return (
    <div className="w-full mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">
            {t("navigation.timesheetReview")}
          </h1>
        </div>

        <TimesheetReviewFilterPopover
          filters={reviewFilters}
          onChange={(nextFilters) => {
            setStatusFilter(nextFilters.status);
            setUserFilter(nextFilters.user);
            setStartDateFilter(nextFilters.startDate);
            setEndDateFilter(nextFilters.endDate);
            setProjectFilter(nextFilters.project);
            setClientFilter(nextFilters.client);
          }}
          clients={activeClients}
          projects={activeProjects}
          isOpen={isFilterPopoverOpen}
          onToggle={() => setIsFilterPopoverOpen((open) => !open)}
          onReset={handleResetFilters}
        />
      </div>

      <KpiSummaryCards
        items={kpiItems}
      ></KpiSummaryCards>

      <TimesheetReviewTable
        entries={filteredTimesheetsForReview}
        isLoading={isLoading}
      ></TimesheetReviewTable>
    </div>
  )
}