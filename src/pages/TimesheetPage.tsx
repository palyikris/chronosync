import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Calendar, ChevronLeft, ChevronRight, List } from "lucide-react";
import { useAuth } from "../context/useAuth";
import {
  TIMESHEET_REFRESH_EVENT,
  cloneEntry,
  fetchUserTimesheets,
  fetchSelectableCompanyUsers,
  createTimesheetEntry,
  deleteTimesheetEntry,
  updateTimesheetEntry,
} from "../services/timesheetService";
import {
  fetchActiveClients,
  fetchActiveProjects,
} from "../services/clientProjectService";
import { TimesheetCalendar } from "../components/timesheet/TimesheetCalendar";
import { TimesheetEntryList } from "../components/timesheet/TimesheetEntryList";
import { TimesheetEntryModal } from "../components/timesheet/TimesheetEntryModal";
import { Button } from "../components/shared/Button";
import { Card } from "../components/shared/Card";
import { Select } from "../components/shared/Select";
import { getRoleLabel } from "../utils/getRoleLabel";
import type { Client, Project } from "../types/client-project";
import type {
  SelectableTimesheetUser,
  TimesheetEntry,
  TimesheetEntryUpdatePayload,
  TimesheetFormData,
  TimesheetViewMode,
} from "../types/timesheet";

const pad = (value: number) => String(value).padStart(2, "0");

const getLocalDateValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const getMonthKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

const TIMESHEET_VIEW_STORAGE_KEY = "chronosync:timesheet:view";

const getViewPreference = (): TimesheetViewMode => {
  if (typeof window === "undefined") return "calendar";

  const stored = window.localStorage.getItem(TIMESHEET_VIEW_STORAGE_KEY);
  if (stored === "grid" || stored === "calendar" || stored === "list") {
    return stored;
  }

  return "calendar";
};

export const TimesheetPage: React.FC = () => {
  const { profile, user } = useAuth();
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
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [viewMode, setViewMode] =
    useState<TimesheetViewMode>(getViewPreference);

  // Form State
  const [formData, setFormData] = useState<TimesheetFormData>({
    work_date: getLocalDateValue(today),
    hours_logged: 8.0,
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
  const isCompanyAdmin = profile?.role === "company_admin";

  const { data: selectableUsers = [] } = useQuery<SelectableTimesheetUser[]>({
    queryKey: ["timesheet-users", profile?.company_id, profile?.role],
    queryFn: () =>
      fetchSelectableCompanyUsers(profile?.company_id, Boolean(isSuperAdmin)),
    enabled: Boolean(profile && (isSuperAdmin || isCompanyAdmin)),
  });

  const currentUserOption: SelectableTimesheetUser | null = profile
    ? {
        id: profile.id,
        company_id: profile.company_id,
        full_name: profile.full_name,
        role: profile.role,
      }
    : null;

  const availableUsers =
    isSuperAdmin || isCompanyAdmin
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

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients", targetCompanyId || "all"],
    queryFn: () => fetchActiveClients(targetCompanyId || ""),
    enabled: Boolean(targetCompanyId || isSuperAdmin),
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects", targetCompanyId || "all", formData.client_id],
    queryFn: () =>
      fetchActiveProjects(
        targetCompanyId || "",
        formData.client_id || undefined,
      ),
    enabled: Boolean((targetCompanyId || isSuperAdmin) && formData.client_id),
  });

  // --------------------------------------------------------------------------
  // TanStack Query: Fetch Logs
  // --------------------------------------------------------------------------
  const {
    data: currentMonthTimesheets = [],
    isLoading: isLoadingCurrentMonth,
  } = useQuery({
    queryKey: ["timesheets", targetUserId, yearMonth],
    enabled: Boolean(targetUserId),
    queryFn: () => fetchUserTimesheets(yearMonth, targetUserId),
  });

  const { data: previousMonthTimesheets = [] } = useQuery({
    queryKey: ["timesheets", targetUserId, previousMonthKey],
    enabled: Boolean(targetUserId),
    queryFn: () => fetchUserTimesheets(previousMonthKey, targetUserId),
  });

  const { data: nextMonthTimesheets = [] } = useQuery({
    queryKey: ["timesheets", targetUserId, nextMonthKey],
    enabled: Boolean(targetUserId),
    queryFn: () => fetchUserTimesheets(nextMonthKey, targetUserId),
  });

  const isLoading = isLoadingCurrentMonth;

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TIMESHEET_VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    const handleTimesheetRefresh = () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    };

    window.addEventListener(TIMESHEET_REFRESH_EVENT, handleTimesheetRefresh);
    return () => {
      window.removeEventListener(
        TIMESHEET_REFRESH_EVENT,
        handleTimesheetRefresh,
      );
    };
  }, [queryClient]);

  const selectedDayLogs = timesheets.filter(
    (log) => log.work_date === selectedDate,
  );
  const totalDailyHours = selectedDayLogs.reduce(
    (acc, log) => acc + Number(log.hours_logged),
    0,
  );

  const totalCurrentMonthHours = currentMonthTimesheets.reduce(
    (acc, log) => acc + Number(log.hours_logged),
    0,
  );


  const resetForm = (date = selectedDate) => {
    setFormData({
      work_date: date,
      hours_logged: 8.0,
      description: "",
      company_id: targetCompanyId,
      client_id: "",
      project_id: "",
    });
  };

  const applyMonthChange = (nextDate: Date) => {
    setCurrentDate(nextDate);
    setSelectedDate(getLocalDateValue(nextDate));
  };

  const openCreateModal = () => {
    if (!canManageTarget) return;
    setEditEntryId(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (entry: TimesheetEntry) => {
    if (!canManageTarget) return;
    setFormData({
      work_date: entry.work_date,
      hours_logged: Number(entry.hours_logged),
      description: entry.description || "",
      company_id: entry.company_id,
      client_id: entry.client_id,
      project_id: entry.project_id,
    });
    setEditEntryId(entry.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditEntryId(null);
  };

  // --------------------------------------------------------------------------
  // TanStack Mutation: Create Log Entry
  // --------------------------------------------------------------------------
  const createMutation = useMutation({
    mutationFn: createTimesheetEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets", targetUserId] });
      closeModal();
      resetForm();
    },
  });

  // --------------------------------------------------------------------------
  // TanStack Mutation: Update Log Entry
  // --------------------------------------------------------------------------
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: TimesheetEntryUpdatePayload;
    }) => updateTimesheetEntry(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets", targetUserId] });
      closeModal();
    },
  });

  // --------------------------------------------------------------------------
  // TanStack Mutation: Delete Log Entry
  // --------------------------------------------------------------------------
  const deleteMutation = useMutation({
    mutationFn: deleteTimesheetEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets", targetUserId] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: cloneEntry,
    onMutate: async (entryId: string) => {
      await queryClient.cancelQueries({
        queryKey: ["timesheets", targetUserId],
      });

      const previousTimesheets =
        queryClient.getQueryData<TimesheetEntry[]>([
          "timesheets",
          targetUserId,
          yearMonth,
        ]) ?? [];
      const sourceEntry = previousTimesheets.find(
        (entry) => entry.id === entryId,
      );

      if (!sourceEntry) {
        return { previousTimesheets, optimisticEntryId: null };
      }

      const optimisticEntry: TimesheetEntry = {
        ...sourceEntry,
        id: `optimistic-${entryId}-${Date.now()}`,
        work_date: getLocalDateValue(new Date()),
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<TimesheetEntry[]>(
        ["timesheets", targetUserId, yearMonth],
        (currentTimesheets = []) => [optimisticEntry, ...currentTimesheets],
      );

      return { previousTimesheets, optimisticEntryId: optimisticEntry.id };
    },
    onError: (error, _entryId, context) => {
      if (context?.previousTimesheets) {
        queryClient.setQueryData(
          ["timesheets", targetUserId, yearMonth],
          context.previousTimesheets,
        );
      }

      const message =
        error instanceof Error ? error.message : t("timesheet.duplicateFailed");
      window.alert(message);
    },
    onSuccess: (createdEntry, _entryId, context) => {
      if (!context?.optimisticEntryId) return;

      queryClient.setQueryData<TimesheetEntry[]>(
        ["timesheets", targetUserId, yearMonth],
        (currentTimesheets = []) =>
          currentTimesheets.map((entry) =>
            entry.id === context.optimisticEntryId ? createdEntry : entry,
          ),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["timesheets", targetUserId],
      });
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

  const handleNextWeek = () => {
    const selected = new Date(`${selectedDate}T12:00:00`);
    selected.setDate(selected.getDate() + 7);
    applySelectedDate(selected);
  };

  const handleGoToToday = () => {
    applySelectedDate(new Date());
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCompanyId || !targetUserId || !canManageTarget) return;
    if (!formData.client_id || !formData.project_id) return;

    if (editEntryId) {
      updateMutation.mutate({
        id: editEntryId,
        payload: {
          work_date: formData.work_date,
          hours_logged: formData.hours_logged,
          description: formData.description,
          client_id: formData.client_id,
          project_id: formData.project_id,
        },
      });
    } else {
      createMutation.mutate({
        ...formData,
        company_id: targetCompanyId,
        target_user_id: targetUserId,
      });
    }
  };

  const handleSelectedUserChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setSelectedUserId(event.target.value);
    closeModal();
  };

  return (
    <div className="mx-auto w-full space-y-5">
      {isSuperAdmin || isCompanyAdmin ? (
        <>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            {t("timesheet.viewingFor")}
          </label>
          <Select
            value={targetUserId ?? ""}
            onChange={handleSelectedUserChange}
            disabled={!availableUsers.length}
          >
            {availableUsers.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.full_name} · {getRoleLabel(candidate.role)}
              </option>
            ))}
          </Select>
        </>
      ) : null}

      <Card className="p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex w-full flex-wrap items-center gap-2 rounded-full border border-border-strong bg-bg-accent p-1 xl:w-auto">
            <Button
              variant={viewMode === "calendar" ? "primary" : "ghost"}
              size="sm"
              className="rounded-full"
              onClick={() => setViewMode("calendar")}
              icon={<Calendar className="h-4 w-4" />}
            >
              Calendar View
            </Button>
            <Button
              variant={viewMode === "list" ? "primary" : "ghost"}
              size="sm"
              className="rounded-full"
              onClick={() => setViewMode("list")}
              icon={<List className="h-4 w-4" />}
            >
              List View
            </Button>
          </div>

          {viewMode === "list" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={handlePreviousWeek}
                icon={<ChevronLeft className="h-4 w-4" />}
              >
                Previous Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={handleGoToToday}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={handleNextWeek}
                icon={<ChevronRight className="h-4 w-4" />}
              >
                Next Week
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      {viewMode === "calendar" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.75fr)] lg:items-stretch">
          <TimesheetCalendar
            currentDate={currentDate}
            selectedDate={selectedDate}
            timesheets={currentMonthTimesheets}
            totalMonthlyHours={totalCurrentMonthHours}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setCurrentDate(new Date(`${date}T12:00:00`));
            }}
            onPreviousMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />

          <div className="flex h-full flex-col lg:sticky lg:top-6">
            <div className="flex min-h-0 flex-1 flex-col">
              <TimesheetEntryList
                selectedDate={selectedDate}
                totalDailyHours={totalDailyHours}
                entries={selectedDayLogs}
                loading={isLoading}
                onAddEntry={openCreateModal}
                onEditEntry={openEditModal}
                onDuplicateEntry={(entry) => duplicateMutation.mutate(entry.id)}
                onDeleteEntry={(entryId) => deleteMutation.mutate(entryId)}
                isUpdating={updateMutation.isPending}
                isDuplicating={duplicateMutation.isPending}
                isDeleting={deleteMutation.isPending}
                clients={clients}
                canManageTarget={canManageTarget}
                viewMode={viewMode}
              />
            </div>
          </div>
        </div>
      ) : null}

      {viewMode === "list" ? (
        <TimesheetEntryList
          selectedDate={selectedDate}
          totalDailyHours={totalDailyHours}
          entries={selectedDayLogs}
          loading={isLoading}
          onAddEntry={openCreateModal}
          onEditEntry={openEditModal}
          onDuplicateEntry={(entry) => duplicateMutation.mutate(entry.id)}
          onDeleteEntry={(entryId) => deleteMutation.mutate(entryId)}
          isUpdating={updateMutation.isPending}
          isDuplicating={duplicateMutation.isPending}
          isDeleting={deleteMutation.isPending}
          clients={clients}
          canManageTarget={canManageTarget}
          viewMode={viewMode}
        />
      ) : null}

      <TimesheetEntryModal
        open={isModalOpen}
        isEditing={Boolean(editEntryId)}
        formData={formData}
        clients={clients}
        projects={projects}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
        onChange={setFormData}
        isSaving={
          editEntryId ? updateMutation.isPending : createMutation.isPending
        }
      />
    </div>
  );
};
