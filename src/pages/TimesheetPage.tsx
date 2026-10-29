import React, { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useFavoriteProjects } from "../hooks/useFavoriteProjects";
import {
  TIMESHEET_REFRESH_EVENT,
  cloneEntry,
  fetchUserTimesheets,
  fetchUserAttentionTimesheets,
  fetchSelectableCompanyUsers,
  createTimesheetEntry,
  deleteTimesheetEntry,
  updateTimesheetEntry,
} from "../services/timesheetService";
import { fetchApprovedLeaveDatesForUser } from "../services/leaveService";
import {
  fetchClients,
  fetchProjects,
} from "../services/clientProjectService";
import { TimesheetCalendar } from "../components/timesheet/TimesheetCalendar";
import { TimesheetEntryFilter } from "../components/timesheet/TimesheetEntryFilter";
import { TimesheetViewSwitcher } from "../components/timesheet/TimesheetViewSwitcher";
import { TimesheetEntryList } from "../components/timesheet/TimesheetEntryList";
import { TimesheetEntryModal } from "../components/timesheet/TimesheetEntryModal";
import { Button } from "../components/shared/Button";
import { LoadError } from "../components/shared/LoadError";
import { Card } from "../components/shared/Card";
import { Select } from "../components/shared/Select";
import { getRoleLabel } from "../utils/getRoleLabel";
import { getLocalDateValue } from "../utils/timesheetWorkflow";
import {
  getEntryPreferencesKey,
  getRecentEntryProjects,
  isAvailableEntryProject,
  isSameFavoriteProject,
  readEntryPreferences,
  rememberEntryProject,
  writeEntryPreferences,
} from "../utils/timesheetEntryPreferences";
import { DateLockedForLeaveError } from "../services/leaveService";
import type { Client, Project } from "../types/client-project";
import type {
  SelectableTimesheetUser,
  NewTimesheetPayload,
  TimesheetEntry,
  TimesheetEntryPreferences,
  TimesheetFavoriteProject,
  TimesheetEntryUpdatePayload,
  TimesheetFormData,
  TimesheetViewMode,
} from "../types/timesheet";

const pad = (value: number) => String(value).padStart(2, "0");

const getMonthKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

const TIMESHEET_VIEW_STORAGE_KEY = "chronosync:timesheet:view";
const MOBILE_TIMESHEET_QUERY = "(max-width: 639px)";

const getViewPreference = (): TimesheetViewMode => {
  if (typeof window === "undefined") return "calendar";
  if (window.matchMedia(MOBILE_TIMESHEET_QUERY).matches) return "list";

  const stored = window.localStorage.getItem(TIMESHEET_VIEW_STORAGE_KEY);
  if (stored === "calendar" || stored === "list" || stored === "attention") {
    return stored;
  }

  return "calendar";
};

export const TimesheetPage: React.FC = () => {
  const { profile, user } = useAuth();
  const favorites = useFavoriteProjects();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Date State Management (Defaulting to Current Month)
  const [currentDate, setCurrentDate] = useState(monthStart);
  const [selectedDate, setSelectedDate] = useState<string>(
    getLocalDateValue(today),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [pendingCopyEntry, setPendingCopyEntry] =
    useState<TimesheetEntry | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [preferredViewMode, setViewMode] =
    useState<TimesheetViewMode>(getViewPreference);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);
  const [entryFeedback, setEntryFeedback] = useState<typeof feedback>(null);
  const [preferenceOverride, setPreferenceOverride] = useState<{
    key: string;
    value: TimesheetEntryPreferences;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState<TimesheetFormData>({
    work_date: getLocalDateValue(today),
    hours_logged: "",
    description: "",
    company_id: "",
    client_id: "",
    project_id: "",
  });

  const yearMonth = getMonthKey(currentDate);
  const previousMonthKey = getMonthKey(
    new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
  );
  const nextMonthKey = getMonthKey(
    new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
  );
  const isSuperAdmin = profile?.role === "super_admin";

  const { data: selectableUsers = [] } = useQuery<SelectableTimesheetUser[]>({
    queryKey: ["timesheet-users", profile?.company_id, profile?.role],
    queryFn: () =>
      fetchSelectableCompanyUsers(profile?.company_id, Boolean(isSuperAdmin)),
    enabled: Boolean(profile && isSuperAdmin),
  });

  const currentUserOption: SelectableTimesheetUser | null = profile
    ? {
        id: profile.id,
        company_id: profile.company_id,
        full_name: profile.full_name,
        role: profile.role,
      }
    : null;

  const availableUsers = isSuperAdmin
    ? selectableUsers.length > 0
      ? selectableUsers
      : currentUserOption
        ? [currentUserOption]
        : []
    : currentUserOption
      ? [currentUserOption]
      : [];

  const activeTargetUser =
    availableUsers.find((candidate) => candidate.id === selectedUserId) ??
    currentUserOption;

  const targetCompanyId =
    activeTargetUser?.company_id ?? profile?.company_id ?? "";

  const canManageTarget = Boolean(
    activeTargetUser &&
    user &&
    profile &&
    (isSuperAdmin ||
      (activeTargetUser.role !== "super_admin" &&
        activeTargetUser.company_id === profile.company_id)),
  );

  const targetUserId = activeTargetUser?.id ?? user?.id;
  const preferencesKey = getEntryPreferencesKey(
    user?.id ?? "", targetCompanyId, targetUserId ?? "",
  );
  const storedPreferences = React.useMemo(
    () => readEntryPreferences(preferencesKey), [preferencesKey],
  );
  const entryPreferences = preferenceOverride?.key === preferencesKey
    ? preferenceOverride.value : storedPreferences;
  const saveEntryPreferences = (value: TimesheetEntryPreferences) => {
    writeEntryPreferences(preferencesKey, value);
    setPreferenceOverride({ key: preferencesKey, value });
  };

  const { data: allClients = [], isError: clientsError } = useQuery<Client[]>({
    queryKey: ["all-clients", targetCompanyId || "all"],
    queryFn: () => fetchClients(targetCompanyId || ""),
    enabled: Boolean(targetCompanyId || isSuperAdmin),
  });

  const { data: allProjects = [], isError: projectsError } = useQuery<Project[]>({
    queryKey: ["all-projects", targetCompanyId || "all"],
    queryFn: () => fetchProjects(targetCompanyId || ""),
    enabled: Boolean(targetCompanyId || isSuperAdmin),
  });

  const activeClients = React.useMemo(() => allClients.filter(client => client.is_active), [allClients]);
  const activeProjects = React.useMemo(() => allProjects.filter(project =>
    project.is_active && project.client_id === formData.client_id &&
    activeClients.some(client => client.id === project.client_id)), [allProjects, activeClients, formData.client_id]);

  // --------------------------------------------------------------------------
  // TanStack Query: Fetch Logs
  // --------------------------------------------------------------------------
  const {
    data: currentMonthTimesheets = [],
    isLoading: isLoadingCurrentMonth,
    isError: timesheetsError,
  } = useQuery({
    queryKey: ["timesheets", targetUserId, yearMonth],
    enabled: Boolean(targetUserId),
    queryFn: () => fetchUserTimesheets(yearMonth, targetUserId),
  });

  const { data: previousMonthTimesheets = [], isError: previousMonthError } = useQuery({
    queryKey: ["timesheets", targetUserId, previousMonthKey],
    enabled: Boolean(targetUserId),
    queryFn: () => fetchUserTimesheets(previousMonthKey, targetUserId),
  });

  const { data: nextMonthTimesheets = [], isError: nextMonthError } = useQuery({
    queryKey: ["timesheets", targetUserId, nextMonthKey],
    enabled: Boolean(targetUserId),
    queryFn: () => fetchUserTimesheets(nextMonthKey, targetUserId),
  });

  const {
    data: attentionTimesheets = [],
    isLoading: isLoadingAttention,
    isError: attentionError,
    isSuccess: attentionLoaded,
  } = useQuery({
    queryKey: ["timesheets", targetUserId, "needs-attention"],
    enabled: Boolean(targetUserId),
    queryFn: () => fetchUserAttentionTimesheets(targetUserId),
  });

  const attentionIsEmpty = attentionLoaded && attentionTimesheets.length === 0;
  const viewMode = preferredViewMode === "attention" && attentionIsEmpty
    ? "calendar" : preferredViewMode;
  // Clear an obsolete selection so new drafts do not reopen this view later.
  if (viewMode !== preferredViewMode) setViewMode(viewMode);

  const { data: approvedLeaveDates = [], isError: leaveError } = useQuery({
    queryKey: ["approved-leave-dates", targetUserId],
    enabled: Boolean(targetUserId),
    queryFn: () => fetchApprovedLeaveDatesForUser(targetUserId!),
  });

  const isLoading = viewMode === "attention" ? isLoadingAttention : isLoadingCurrentMonth;
  const hasLoadError = clientsError || projectsError || leaveError || (
    viewMode === "attention"
      ? attentionError
      : timesheetsError || previousMonthError || nextMonthError
  );
  const canEditEntries = canManageTarget && !hasLoadError && !isLoading;
  const retryLoading = () => {
    for (const key of ["all-clients", "all-projects", "timesheets", "approved-leave-dates"]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const timesheets = React.useMemo(() => {
    const mergedMap = new Map<string, TimesheetEntry>();

    for (const entry of [
      ...currentMonthTimesheets,
      ...previousMonthTimesheets,
      ...nextMonthTimesheets,
    ]) {
      mergedMap.set(entry.id, entry);
    }

    return Array.from(mergedMap.values());
  }, [currentMonthTimesheets, previousMonthTimesheets, nextMonthTimesheets]);

  const recentProjects = React.useMemo(() => getRecentEntryProjects(
    timesheets, entryPreferences.recentProjects, allClients, allProjects, targetCompanyId,
  ), [timesheets, entryPreferences.recentProjects, allClients, allProjects, targetCompanyId]);
  const favoriteProjects = favorites.projects.filter(task =>
    isAvailableEntryProject(task, allClients, allProjects, targetCompanyId));
  const toggleFavoriteProject = async (task: TimesheetFavoriteProject) => {
    if (favorites.isSaving || favorites.isLoading || favorites.isError) return;
    const existing = favorites.projects.find(item => task.id
      ? item.id === task.id : isSameFavoriteProject(item, task));
    try {
      if (existing) await favorites.remove(existing.id);
      else await favorites.save({ payload: {
        project_id: task.project_id,
      } });
      setEntryFeedback({ type: "success", message: t(existing
        ? "userSettings.favoriteDeleted" : "userSettings.favoriteSaved") });
    } catch {
      setEntryFeedback({ type: "error", message: t(existing
        ? "userSettings.favoriteDeleteFailed" : "userSettings.favoriteSaveFailed") });
    }
  };

  const hasEntryFilter = Boolean(selectedClientId);

  const filteredAttentionTimesheets = React.useMemo(
    () => attentionTimesheets.filter((entry) =>
      (!selectedClientId || entry.client_id === selectedClientId) &&
      (!selectedProjectId || entry.project_id === selectedProjectId),
    ),
    [attentionTimesheets, selectedClientId, selectedProjectId],
  );

  const filteredTimesheets = React.useMemo(() => {
    if (!hasEntryFilter) {
      return timesheets;
    }

    return timesheets.filter((entry) => {
      const matchesClient = entry.client_id === selectedClientId;
      const matchesProject = selectedProjectId
        ? entry.project_id === selectedProjectId
        : true;

      return matchesClient && matchesProject;
    });
  }, [hasEntryFilter, selectedClientId, selectedProjectId, timesheets]);

  const filteredCurrentMonthTimesheets = React.useMemo(() => {
    if (!hasEntryFilter) {
      return currentMonthTimesheets;
    }

    return currentMonthTimesheets.filter((entry) => {
      const matchesClient = entry.client_id === selectedClientId;
      const matchesProject = selectedProjectId
        ? entry.project_id === selectedProjectId
        : true;

      return matchesClient && matchesProject;
    });
  }, [
    hasEntryFilter,
    selectedClientId,
    selectedProjectId,
    currentMonthTimesheets,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // The mobile day view should not replace the saved desktop preference.
    if (window.matchMedia(MOBILE_TIMESHEET_QUERY).matches) return;
    window.localStorage.setItem(TIMESHEET_VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    const handleTimesheetRefresh = () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["timesheets-for-review"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
    };

    window.addEventListener(TIMESHEET_REFRESH_EVENT, handleTimesheetRefresh);
    return () => {
      window.removeEventListener(
        TIMESHEET_REFRESH_EVENT,
        handleTimesheetRefresh,
      );
    };
  }, [queryClient]);

  const selectedDayLogs = filteredTimesheets.filter(
    (log) => log.work_date === selectedDate,
  );
  const totalDailyHours = selectedDayLogs.reduce(
    (acc, log) => acc + Number(log.hours_logged),
    0,
  );

  const totalCurrentMonthHours = filteredCurrentMonthTimesheets.reduce(
    (acc, log) => acc + Number(log.hours_logged),
    0,
  );
  const isSelectedDateLocked = approvedLeaveDates.includes(selectedDate);

  const modalClients = React.useMemo(() => {
    if (!editEntryId || activeClients.some((item) => item.id === formData.client_id)) {
      return activeClients;
    }

    const currentClient = allClients.find(
      (item) => item.id === formData.client_id,
    );
    return currentClient ? [currentClient, ...activeClients] : activeClients;
  }, [activeClients, allClients, editEntryId, formData.client_id]);

  const modalProjects = React.useMemo(() => {
    if (
      !editEntryId ||
      activeProjects.some((item) => item.id === formData.project_id)
    ) {
      return activeProjects;
    }

    const currentProject = allProjects.find(
      (item) => item.id === formData.project_id,
    );
    return currentProject ? [currentProject, ...activeProjects] : activeProjects;
  }, [activeProjects, allProjects, editEntryId, formData.project_id]);

  const showMutationError = (error: unknown, fallbackKey: string) => {
    const message =
      error instanceof DateLockedForLeaveError
        ? t("leave.dateLockedForLeave")
        : error instanceof Error
          ? error.message
          : t(fallbackKey);
    setFeedback({ type: "error", message });
    if (isModalOpen) setEntryFeedback({ type: "error", message });
  };

  const resetForm = useCallback((date = selectedDate) => {
    const recent = recentProjects.find(project =>
      (!selectedClientId || project.client_id === selectedClientId) &&
      (!selectedProjectId || project.project_id === selectedProjectId));
    const filteredProject = allProjects.find(project =>
      project.id === selectedProjectId && project.client_id === selectedClientId &&
      isAvailableEntryProject({ client_id: project.client_id, project_id: project.id },
        allClients, allProjects, targetCompanyId));
    const filteredClient = activeClients.find(client => client.id === selectedClientId);
    setFormData({
      work_date: date,
      hours_logged: recent?.hours_logged ?? "",
      description: "",
      company_id: targetCompanyId,
      client_id: filteredClient?.id ?? recent?.client_id ?? "",
      project_id: filteredProject?.id ?? recent?.project_id ?? "",
    });
  }, [selectedDate, targetCompanyId, recentProjects, selectedClientId, selectedProjectId,
    allProjects, allClients, activeClients]);

  const applyMonthChange = (nextDate: Date) => {
    setCurrentDate(nextDate);
    setSelectedDate(getLocalDateValue(nextDate));
  };

  const openCreateModal = useCallback(() => {
    if (!canEditEntries || isSelectedDateLocked || isModalOpen) return;
    setEditEntryId(null);
    setEntryFeedback(null);
    resetForm();
    setIsModalOpen(true);
  }, [
    canEditEntries,
    isSelectedDateLocked,
    isModalOpen,
    resetForm,
    setEntryFeedback,
    setEditEntryId,
    setIsModalOpen,
  ]);

  useEffect(() => {
    const handleNewEntryShortcut = (event: KeyboardEvent) => {
      if (
        event.ctrlKey &&
        event.shiftKey &&
        event.key.toLowerCase() === "n"
      ) {
        event.preventDefault();
        openCreateModal();
      }
    };

    window.addEventListener("keydown", handleNewEntryShortcut, true);
    return () => {
      window.removeEventListener("keydown", handleNewEntryShortcut, true);
    };
  }, [openCreateModal]);

  const openEditModal = (entry: TimesheetEntry) => {
    if (!canEditEntries) return;
    setEntryFeedback(null);
    setFormData({
      work_date: entry.work_date,
      hours_logged: Number(entry.hours_logged),
      description: entry.description || "",
      company_id: entry.company_id,
      client_id: entry.client_id,
      project_id: entry.project_id,
      status: entry.status,
      rejection_reason: entry.rejection_reason,
    });
    setEditEntryId(entry.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditEntryId(null);
    setEntryFeedback(null);
  };

  // --------------------------------------------------------------------------
  // TanStack Mutation: Create Log Entry
  // --------------------------------------------------------------------------
  const createMutation = useMutation({
    mutationFn: ({ payload }: { payload: NewTimesheetPayload; addAnother: boolean }) =>
      createTimesheetEntry(payload),
    onSuccess: (_entry, { payload, addAnother }) => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["timesheets-for-review"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      saveEntryPreferences(rememberEntryProject(entryPreferences, {
        client_id: payload.client_id,
        project_id: payload.project_id,
        hours_logged: payload.hours_logged,
      }));
      if (addAnother) {
        setFormData({
          work_date: payload.work_date,
          hours_logged: payload.hours_logged,
          description: "",
          company_id: payload.company_id,
          client_id: payload.client_id,
          project_id: payload.project_id,
        });
        setEntryFeedback({ type: "success", message: t("timesheet.entrySavedAddAnother") });
      } else {
        closeModal();
      }
      setFeedback({ type: "success", message: t("timesheet.entrySaved") });
    },
    onError: (error) => showMutationError(error, "timesheet.saveFailed"),
  });

  // --------------------------------------------------------------------------
  // TanStack Mutation: Update Log Entry
  // --------------------------------------------------------------------------
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
      resubmit,
    }: {
      id: string;
      payload: TimesheetEntryUpdatePayload;
      resubmit: boolean;
    }) => updateTimesheetEntry(id, payload, { resubmit }),
    onSuccess: (_entry, { resubmit }) => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["timesheets-for-review"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      closeModal();
      setFeedback({
        type: "success",
        message: t(resubmit ? "timesheet.entryResubmitted" : "timesheet.entrySaved"),
      });
    },
    onError: (error) => showMutationError(error, "timesheet.saveFailed"),
  });

  // --------------------------------------------------------------------------
  // TanStack Mutation: Delete Log Entry
  // --------------------------------------------------------------------------
  const deleteMutation = useMutation({
    mutationFn: deleteTimesheetEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["timesheets-for-review"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      setFeedback({ type: "success", message: t("timesheet.entryDeleted") });
    },
    onError: (error) => showMutationError(error, "timesheet.deleteFailed"),
  });

  const duplicateMutation = useMutation({
    mutationFn: ({
      entry,
      workDate,
    }: {
      entry: TimesheetEntry;
      workDate: string;
    }) => cloneEntry(entry.id, workDate),
    onError: (error) => {
      showMutationError(error, "timesheet.duplicateFailed");
    },
    onSuccess: () => {
      setFeedback({ type: "success", message: t("timesheet.entryDuplicated") });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["timesheets", targetUserId],
      });
      setPendingCopyEntry(null);
    },
  });

  const applySelectedDate = (nextDate: Date) => {
    const nextDateValue = getLocalDateValue(nextDate);
    setSelectedDate(nextDateValue);
    setCurrentDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
  };

  const handlePrevMonth = () => {
    applyMonthChange(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    applyMonthChange(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const handlePreviousWeek = () => {
    const selected = new Date(`${selectedDate}T12:00:00`);
    selected.setDate(selected.getDate() - 7);
    applySelectedDate(selected);
  };

  const handlePreviousDay = () => {
    const selected = new Date(`${selectedDate}T12:00:00`);
    selected.setDate(selected.getDate() - 1);
    applySelectedDate(selected);
  };

  const handleNextDay = () => {
    const selected = new Date(`${selectedDate}T12:00:00`);
    selected.setDate(selected.getDate() + 1);
    applySelectedDate(selected);
  };

  const handleNextWeek = () => {
    const selected = new Date(`${selectedDate}T12:00:00`);
    selected.setDate(selected.getDate() + 7);
    applySelectedDate(selected);
  };

  const handleGoToToday = () => {
    applySelectedDate(new Date());
  };

  const handleCalendarSelect = (date: string) => {
    if (pendingCopyEntry) {
      setSelectedDate(date);
      setCurrentDate(new Date(`${date}T12:00:00`));
      duplicateMutation.mutate({ entry: pendingCopyEntry, workDate: date });
      return;
    }

    setSelectedDate(date);
    setCurrentDate(new Date(`${date}T12:00:00`));
  };

  const handleStartCopy = (entry: TimesheetEntry) => {
    if (approvedLeaveDates.includes(entry.work_date)) return;
    setPendingCopyEntry(entry);
    setViewMode("calendar");
  };

  const handleCancelCopy = () => {
    setPendingCopyEntry(null);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (createMutation.isPending || updateMutation.isPending) return;
    if (!targetCompanyId || !targetUserId || !canManageTarget) return;
    if (!formData.client_id || !formData.project_id) return;

    const parsedHours =
      typeof formData.hours_logged === "number"
        ? formData.hours_logged
        : Number.parseFloat(formData.hours_logged);

    if (!Number.isFinite(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
      return;
    }
    setEntryFeedback(null);

    if (editEntryId) {
      updateMutation.mutate({
        id: editEntryId,
        resubmit: formData.status === "rejected",
        payload: {
          work_date: formData.work_date,
          hours_logged: parsedHours,
          description: formData.description,
          client_id: formData.client_id,
          project_id: formData.project_id,
        },
      });
    } else {
      const submitter = (e.nativeEvent as SubmitEvent).submitter;
      createMutation.mutate({
        payload: {
          ...formData,
          hours_logged: parsedHours,
          company_id: targetCompanyId,
          target_user_id: targetUserId,
        },
        addAnother: submitter instanceof HTMLButtonElement && submitter.value === "add-another",
      });
    }
  };

  const handleSelectedUserChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setSelectedUserId(event.target.value);
    setSelectedClientId("");
    setSelectedProjectId("");
    setPendingCopyEntry(null);
    closeModal();
  };

  const handleClientFilterChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedProjectId("");
  };

  const handleProjectFilterChange = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const handleResetFilters = () => {
    setSelectedClientId("");
    setSelectedProjectId("");
  };

  const viewModeSwitcher = (
    <TimesheetViewSwitcher
      value={viewMode}
      attentionCount={!isLoadingAttention && !attentionError ? attentionTimesheets.length : undefined}
      attentionLoading={isLoadingAttention}
      onChange={(view) => {
        setPendingCopyEntry(null);
        setViewMode(view);
      }}
    />
  );

  const listNavigationControls = (
    <Card className="p-2.5 sm:p-3">
      <div className="flex w-full flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
        <div className="grid w-full grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-stretch gap-1.5 sm:contents">
          <Button
            variant="outline"
            size="icon"
            aria-label={t("timesheet.previousDay")}
            onClick={handlePreviousDay}
            icon={<ChevronLeft className="h-4 w-4" />}
          />
          <Button
            variant="outline"
            size="sm"
            className="min-w-0 px-1.5 sm:px-3"
            onClick={handleGoToToday}
          >
            {t("common.today")}
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("timesheet.nextDay")}
            onClick={handleNextDay}
            icon={<ChevronRight className="h-4 w-4" />}
          />
        </div>
        <div className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-w-0 px-1.5 [&>span]:min-w-0 [&>span]:whitespace-normal [&>span]:text-center [&>span]:leading-tight sm:px-3"
            onClick={handlePreviousWeek}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            {t("timesheet.previousWeek")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-w-0 px-1.5 [&>span]:min-w-0 [&>span]:whitespace-normal [&>span]:text-center [&>span]:leading-tight sm:px-3"
            onClick={handleNextWeek}
            icon={<ChevronRight className="h-4 w-4" />}
          >
            {t("timesheet.nextWeek")}
          </Button>
        </div>
      </div>
    </Card>
  );

  const addEntryButton = (
    <Button
      variant="primary"
      size="sm"
      onClick={openCreateModal}
      disabled={!canEditEntries || isSelectedDateLocked}
      className="rounded-xl px-4 shadow-[0_10px_22px_rgba(96,120,42,0.22)] ring-2 ring-primary/15 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(96,120,42,0.28)]"
      icon={<Plus className="h-4 w-4" />}
    >
      {isSelectedDateLocked ? t("leave.lockedDay") : t("timesheet.addEntry")}
    </Button>
  );

  return (
    <div className="mx-auto w-full min-w-0 space-y-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:space-y-5 sm:pb-10">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-[23px] font-semibold tracking-[-0.03em] text-text sm:text-[28px]">
            {t("timesheet.title")}
          </h1>
          <p className="mt-1 text-[13px] leading-5 text-muted sm:mt-1.5 sm:text-sm">{t("timesheet.subtitle")}</p>
        </div>
        <div className="hidden shrink-0 sm:block">{addEntryButton}</div>
      </div>

      {isSuperAdmin ? (
        <>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            {t("timesheet.viewingFor")}
          </label>
          <div className="max-w-xl">
            <Select
              value={targetUserId ?? ""}
              onChange={handleSelectedUserChange}
              disabled={!availableUsers.length || createMutation.isPending || updateMutation.isPending}
            >
              {availableUsers.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.full_name} · {getRoleLabel(candidate.role)}
                </option>
              ))}
            </Select>
          </div>
        </>
      ) : null}

      {hasLoadError ? <LoadError onRetry={retryLoading} /> : null}
      {feedback ? (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === "error"
              ? "border-danger-border bg-danger-bg text-danger"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <TimesheetEntryFilter
        clients={allClients}
        projects={allProjects}
        selectedClientId={selectedClientId}
        selectedProjectId={selectedProjectId}
        viewModeSwitcher={viewModeSwitcher}
        onClientChange={handleClientFilterChange}
        onProjectChange={handleProjectFilterChange}
        onReset={handleResetFilters}
      />

      {viewMode === "calendar" ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.75fr)] xl:items-stretch">
            <div className="order-2 min-w-0 space-y-3 xl:order-1">
              {pendingCopyEntry ? (
                <Card className="border-dashed border-primary/40 bg-primary/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-strong">
                        {t("timesheet.copyModeTitle")}
                      </p>
                      <p className="mt-1 text-sm text-text">
                        {t("timesheet.copyModeDescription")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelCopy}
                    >
                      {t("timesheet.cancel")}
                    </Button>
                  </div>
                </Card>
              ) : null}

              <TimesheetCalendar
                currentDate={currentDate}
                selectedDate={selectedDate}
                timesheets={filteredCurrentMonthTimesheets}
                totalMonthlyHours={totalCurrentMonthHours}
                lockedDates={approvedLeaveDates}
                copyModeActive={Boolean(pendingCopyEntry)}
                onSelectDate={handleCalendarSelect}
                onPreviousMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
              />
            </div>

            <div className="order-1 flex h-full min-w-0 flex-col xl:sticky xl:top-6 xl:order-2">
              <div className="flex min-h-0 flex-1 flex-col">
                <TimesheetEntryList
                  selectedDate={selectedDate}
                  totalDailyHours={totalDailyHours}
                  entries={selectedDayLogs}
                  allEntries={timesheets}
                  hasEntryFilter={hasEntryFilter}
                  loading={isLoading}
                  onEditEntry={openEditModal}
                  onDuplicateEntry={handleStartCopy}
                  onDeleteEntry={(entryId) => deleteMutation.mutate(entryId)}
                  isUpdating={updateMutation.isPending}
                  isDuplicating={duplicateMutation.isPending}
                  isDeleting={deleteMutation.isPending}
                  clients={allClients}
                  projects={allProjects}
                  canManageTarget={canEditEntries}
                  onFeedback={setFeedback}
                  isSelectedDateLocked={isSelectedDateLocked}
                  viewMode={viewMode}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}

      {viewMode === "list" ? (
        <>
          {listNavigationControls}

          <TimesheetEntryList
            selectedDate={selectedDate}
            totalDailyHours={totalDailyHours}
            entries={selectedDayLogs}
            allEntries={timesheets}
            hasEntryFilter={hasEntryFilter}
            loading={isLoading}
            onEditEntry={openEditModal}
            onDuplicateEntry={handleStartCopy}
            onDeleteEntry={(entryId) => deleteMutation.mutate(entryId)}
            isUpdating={updateMutation.isPending}
            isDuplicating={duplicateMutation.isPending}
            isDeleting={deleteMutation.isPending}
            clients={allClients}
            projects={allProjects}
            canManageTarget={canEditEntries}
            onFeedback={setFeedback}
            isSelectedDateLocked={isSelectedDateLocked}
            viewMode={viewMode}
          />
        </>
      ) : null}

      {viewMode === "attention" ? (
        <TimesheetEntryList
          selectedDate={selectedDate}
          totalDailyHours={0}
          entries={filteredAttentionTimesheets}
          allEntries={attentionTimesheets}
          loading={isLoadingAttention}
          loadFailed={hasLoadError}
          hasEntryFilter={hasEntryFilter}
          onEditEntry={openEditModal}
          onDuplicateEntry={handleStartCopy}
          onDeleteEntry={(entryId) => deleteMutation.mutate(entryId)}
          isUpdating={updateMutation.isPending}
          isDuplicating={duplicateMutation.isPending}
          isDeleting={deleteMutation.isPending}
          clients={allClients}
          projects={allProjects}
          canManageTarget={canEditEntries}
          onFeedback={setFeedback}
          lockedDates={approvedLeaveDates}
          viewMode={viewMode}
        />
      ) : null}

      {canEditEntries ? (
        <div className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 sm:hidden">
          <div className="rounded-2xl border border-border bg-surface-strong/95 p-2 shadow-lg backdrop-blur">
            <Button
              variant="primary"
              size="md"
              onClick={openCreateModal}
              disabled={isSelectedDateLocked}
              className="w-full rounded-xl px-4 shadow-[0_10px_22px_rgba(96,120,42,0.22)] ring-2 ring-primary/15 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(96,120,42,0.28)]"
              icon={<Plus className="h-4 w-4" />}
            >
              {isSelectedDateLocked
                ? t("leave.lockedDay")
                : t("timesheet.addEntry")}
            </Button>
          </div>
        </div>
      ) : null}

      <TimesheetEntryModal
        open={isModalOpen}
        isEditing={Boolean(editEntryId)}
        formData={formData}
        clients={modalClients}
        projects={modalProjects}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
        onChange={setFormData}
        recentProjects={recentProjects}
        shortcutProjects={allProjects}
        favoriteProjects={favoriteProjects}
        favoritesLoading={favorites.isLoading}
        favoritesError={favorites.isError}
        isSavingFavorite={favorites.isSaving}
        onRetryFavorites={() => { void favorites.retry(); }}
        onToggleFavorite={task => { void toggleFavoriteProject(task); }}
        feedback={entryFeedback}
        isSaving={
          editEntryId ? updateMutation.isPending : createMutation.isPending
        }
      />
    </div>
  );
};
