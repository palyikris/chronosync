import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  type TimesheetEntry,
  type NewTimesheetPayload,
  fetchUserTimesheets,
  createTimesheetEntry,
  deleteTimesheetEntry,
  updateTimesheetEntry,
} from "../services/timesheetService";
import { Card, CardContent } from "../components/shared/Card";
import { Button } from "../components/shared/Button";
import { TimesheetCalendar } from "../components/timesheet/TimesheetCalendar";
import { TimesheetEntryList } from "../components/timesheet/TimesheetEntryList";
import { TimesheetEntryModal } from "../components/timesheet/TimesheetEntryModal";
import { TimesheetSummary } from "../components/timesheet/TimesheetSummary";

interface TimesheetFormData extends NewTimesheetPayload {
  work_date: string;
}

export const TimesheetPage: React.FC = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Date State Management (Defaulting to Current Month)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<TimesheetFormData>({
    work_date: new Date().toISOString().split("T")[0],
    hours_logged: 8.0,
    description: "",
    company_id: "",
  });

  const yearMonth = currentDate.toISOString().slice(0, 7); // "YYYY-MM"

  // --------------------------------------------------------------------------
  // TanStack Query: Fetch Logs
  // --------------------------------------------------------------------------
  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ["timesheets", yearMonth],
    queryFn: () => fetchUserTimesheets(yearMonth),
  });

  const selectedDayLogs = timesheets.filter((log) => log.work_date === selectedDate);
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
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TimesheetFormData> }) =>
      updateTimesheetEntry(id, payload),
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
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#191c1d]">
            My Logs: {profile?.full_name}
          </h1>
          <p className="text-sm text-[#5e5e62] mt-1">
            Review and manage your daily time entries
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Card className="rounded-full">
            <CardContent className="flex items-center gap-2 px-4 py-2">
              <span className="text-sm font-medium text-[#191c1d]">
                {currentDate.toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        <TimesheetCalendar
          currentDate={currentDate}
          selectedDate={selectedDate}
          timesheets={timesheets}
          onSelectDate={setSelectedDate}
          onPreviousMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />

        <div className="col-span-12 lg:col-span-4 space-y-6">
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

          <TimesheetSummary totalMonthlyHours={totalMonthlyHours} />
        </div>
      </div>

      <Button
        onClick={openCreateModal}
        className="fixed bottom-8 right-8 z-40 h-14 w-14 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95"
        aria-label="Log hours"
      >
        <Plus className="w-7 h-7" />
      </Button>

      <TimesheetEntryModal
        open={isModalOpen}
        isEditing={Boolean(editEntryId)}
        formData={formData}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
        onChange={setFormData}
        isSaving={editEntryId ? updateMutation.isPending : createMutation.isPending}
      />
    </div>
  );
};
