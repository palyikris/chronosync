import type React from "react";
import { z } from "zod";
import type { Client, Project } from "./client-project";
import type { UserProfile, UserRole } from "./auth";

const timesheetDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

const timesheetTextSchema = z.string().trim().min(1).max(2000);

const timesheetIdSchema = z.string().trim().min(1);

const timesheetHoursSchema = z
  .number()
  .finite()
  .positive()
  .max(24, "Hours logged cannot exceed 24");

export const newTimesheetPayloadSchema = z
  .object({
    work_date: timesheetDateSchema,
    hours_logged: timesheetHoursSchema,
    description: timesheetTextSchema,
    company_id: timesheetIdSchema,
    client_id: timesheetIdSchema,
    project_id: timesheetIdSchema,
    target_user_id: timesheetIdSchema.optional(),
  })
  .strict();

export const timesheetEntryUpdatePayloadSchema = z
  .object({
    work_date: timesheetDateSchema.optional(),
    hours_logged: timesheetHoursSchema.optional(),
    description: timesheetTextSchema.optional(),
    client_id: timesheetIdSchema.optional(),
    project_id: timesheetIdSchema.optional(),
  })
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one timesheet field must be provided",
  });

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

export type NewTimesheetPayload = z.infer<typeof newTimesheetPayloadSchema>;

export type TimesheetEntryUpdatePayload = z.infer<
  typeof timesheetEntryUpdatePayloadSchema
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