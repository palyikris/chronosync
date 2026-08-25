import type { TimesheetEntry } from "../../types/timesheet";

export interface TimesheetReviewRecord extends Omit<
  TimesheetEntry,
  "client_id"
> {
  profiles?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
  } | null;
  projects?: {
    id: string;
    name: string;
  } | null;
  clients?: {
    id: string;
    name: string;
  } | null;
}

export interface TimesheetReviewTableProps {
  entries: TimesheetReviewRecord[];
  isLoading?: boolean;
}

export interface ProjectGroup {
  projectId: string;
  projectName: string;
  entries: TimesheetReviewRecord[];
  totalHours: number;
}

export interface ClientGroup {
  clientId: string;
  clientName: string;
  projects: ProjectGroup[];
  totalHours: number;
  totalEntriesCount: number;
}
