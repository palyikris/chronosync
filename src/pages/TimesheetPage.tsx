import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import {
  fetchUserTimesheets,
  fetchSelectableCompanyUsers,
  createTimesheetEntry,
  deleteTimesheetEntry,
  updateTimesheetEntry,
} from "../services/timesheetService";
import { fetchClients, fetchProjects } from "../services/clientProjectService";
import { TimesheetCalendar } from "../components/timesheet/TimesheetCalendar";
import { TimesheetEntryList } from "../components/timesheet/TimesheetEntryList";
import { TimesheetEntryModal } from "../components/timesheet/TimesheetEntryModal";
import { Select } from "../components/shared/Select";
import { getRoleLabel } from "../utils/getRoleLabel";
import type { Client, Project } from "../types/client-project";
import type {
  SelectableTimesheetUser,
  TimesheetEntry,
  TimesheetEntryUpdatePayload,
  TimesheetFormData,
} from "../types/timesheet";

const pad = (value: number) => String(value).padStart(2, "0");

const getLocalDateValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const getMonthKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

export const TimesheetPage: React.FC = () => {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

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
    queryFn: () => fetchClients(targetCompanyId || undefined),
    enabled: Boolean(targetCompanyId || isSuperAdmin),
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects", targetCompanyId || "all", formData.client_id],
    queryFn: () =>
      fetchProjects(
        targetCompanyId || undefined,
        formData.client_id || undefined,
      ),
    enabled: Boolean((targetCompanyId || isSuperAdmin) && formData.client_id),
  });

  // --------------------------------------------------------------------------
  // TanStack Query: Fetch Logs
  // --------------------------------------------------------------------------
  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ["timesheets", targetUserId, yearMonth],
    enabled: Boolean(targetUserId),
    queryFn: () => fetchUserTimesheets(yearMonth, targetUserId),
  });

  const selectedDayLogs = timesheets.filter(
    (log) => log.work_date === selectedDate,
  );
  const totalDailyHours = selectedDayLogs.reduce(
    (acc, log) => acc + Number(log.hours_logged),
    0,
  );

  const totalMonthlyHours = timesheets.reduce(
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
      queryClient.invalidateQueries({
        queryKey: ["timesheets", targetUserId, yearMonth],
      });
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
      queryClient.invalidateQueries({
        queryKey: ["timesheets", targetUserId, yearMonth],
      });
      closeModal();
    },
  });

  // --------------------------------------------------------------------------
  // TanStack Mutation: Delete Log Entry
  // --------------------------------------------------------------------------
  const deleteMutation = useMutation({
    mutationFn: deleteTimesheetEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["timesheets", targetUserId, yearMonth],
      });
    },
  });

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
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-text">My Logs</h1>
          <p className="mt-1 text-sm text-muted">
            Review and manage your daily time entries
          </p>
        </div>

        {(isSuperAdmin || isCompanyAdmin) && (
          <div className="w-full sm:max-w-md">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Viewing Timesheet For
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
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6 items-start lg:items-stretch">
        <TimesheetCalendar
          currentDate={currentDate}
          selectedDate={selectedDate}
          timesheets={timesheets}
          totalMonthlyHours={totalMonthlyHours}
          onSelectDate={setSelectedDate}
          onPreviousMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />

        <div className="col-span-12 lg:col-span-4 lg:sticky lg:top-6">
          <TimesheetEntryList
            selectedDate={selectedDate}
            totalDailyHours={totalDailyHours}
            entries={selectedDayLogs}
            loading={isLoading}
            onAddEntry={openCreateModal}
            onEditEntry={openEditModal}
            onDeleteEntry={(entryId) => deleteMutation.mutate(entryId)}
            isUpdating={updateMutation.isPending}
            isDeleting={deleteMutation.isPending}
            clients={clients}
            canManageTarget={canManageTarget}
          />
        </div>
      </div>

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
