import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import {
  type TimesheetEntry,
  type NewTimesheetPayload,
  fetchUserTimesheets,
  createTimesheetEntry,
  deleteTimesheetEntry,
  updateTimesheetEntry,
} from "../services/timesheetService";
import { TimesheetCalendar } from "../components/timesheet/TimesheetCalendar";
import { TimesheetEntryList } from "../components/timesheet/TimesheetEntryList";
import { TimesheetEntryModal } from "../components/timesheet/TimesheetEntryModal";

interface TimesheetFormData extends NewTimesheetPayload {
  work_date: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

const getLocalDateValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const getMonthKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

export const TimesheetPage: React.FC = () => {
  const { profile } = useAuth();
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

  // Form State
  const [formData, setFormData] = useState<TimesheetFormData>({
    work_date: getLocalDateValue(today),
    hours_logged: 8.0,
    description: "",
    company_id: "",
  });

  const yearMonth = getMonthKey(currentDate);

  // --------------------------------------------------------------------------
  // TanStack Query: Fetch Logs
  // --------------------------------------------------------------------------
  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ["timesheets", yearMonth],
    queryFn: () => fetchUserTimesheets(yearMonth),
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
      company_id: profile?.company_id ?? "",
    });
  };

  const applyMonthChange = (nextDate: Date) => {
    setCurrentDate(nextDate);
    setSelectedDate(getLocalDateValue(nextDate));
  };

  const openCreateModal = () => {
    setEditEntryId(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (entry: TimesheetEntry) => {
    setFormData({
      work_date: entry.work_date,
      hours_logged: Number(entry.hours_logged),
      description: entry.description || "",
      company_id: entry.company_id,
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
      queryClient.invalidateQueries({ queryKey: ["timesheets", yearMonth] });
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
      payload: Partial<TimesheetFormData>;
    }) => updateTimesheetEntry(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets", yearMonth] });
      closeModal();
    },
  });

  // --------------------------------------------------------------------------
  // TanStack Mutation: Delete Log Entry
  // --------------------------------------------------------------------------
  const deleteMutation = useMutation({
    mutationFn: deleteTimesheetEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets", yearMonth] });
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
    if (!profile?.company_id) return;

    if (editEntryId) {
      updateMutation.mutate({
        id: editEntryId,
        payload: {
          work_date: formData.work_date,
          hours_logged: formData.hours_logged,
          description: formData.description,
        },
      });
    } else {
      createMutation.mutate({
        ...formData,
        company_id: profile.company_id,
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">My Logs</h1>
          <p className="mt-1 text-sm text-muted">
            Review and manage your daily time entries
          </p>
        </div>
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
          />
        </div>
      </div>

      <TimesheetEntryModal
        open={isModalOpen}
        isEditing={Boolean(editEntryId)}
        formData={formData}
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
