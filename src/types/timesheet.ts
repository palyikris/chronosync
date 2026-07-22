import type React from "react";
import type { Client, Project } from "./client-project";
import type { UserProfile, UserRole } from "./auth";

export interface TimesheetEntry {
  id: string;
  user_id: string;
  company_id: string;
  client_id: string;
  project_id: string;
  work_date: string;
  hours_logged: number;
  description: string;
  created_at: string;
}

export interface NewTimesheetPayload {
  work_date: string;
  hours_logged: number;
  description: string;
  company_id: string;
  client_id: string;
  project_id: string;
  target_user_id?: string;
}

export type TimesheetEntryUpdatePayload = Partial<
  Pick<
    TimesheetEntry,
    "work_date" | "hours_logged" | "description" | "client_id" | "project_id"
  >
>;

export type SelectableTimesheetUser = Pick<
  UserProfile,
  "id" | "company_id" | "full_name" | "role"
> & {
  role: UserRole;
};

export type TimesheetFormData = Pick<
  NewTimesheetPayload,
  "work_date" | "hours_logged" | "description" | "company_id" | "client_id" | "project_id"
>;

export interface TimesheetCalendarProps {
  currentDate: Date;
  selectedDate: string;
  timesheets: TimesheetEntry[];
  totalMonthlyHours: number;
  onSelectDate: (date: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export interface TimesheetEntryListProps {
  selectedDate: string;
  totalDailyHours: number;
  entries: TimesheetEntry[];
  loading: boolean;
  onAddEntry: () => void;
  onEditEntry: (entry: TimesheetEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  isUpdating: boolean;
  isDeleting: boolean;
  clients: Client[];
  canManageTarget: boolean;
}

export interface TimesheetEntryModalProps {
  open: boolean;
  isEditing: boolean;
  formData: TimesheetFormData;
  clients: Client[];
  projects: Project[];
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onChange: React.Dispatch<React.SetStateAction<TimesheetFormData>>;
  isSaving: boolean;
}

export interface TimesheetSummaryProps {
  totalMonthlyHours: number;
}