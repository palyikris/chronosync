import type React from "react";
import type { LeaveRequest } from "../../types/leave";

export type LeaveFormState = {
  start_date: string;
  end_date: string;
  weekly_work_hours: number;
};

export interface LeaveErrorBannerProps {
  error: string | null;
  conflictingDates: string[];
}

export interface LeaveStatsCardsProps {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
}

export interface LeaveCalendarPanelProps {
  currentDate: Date;
  leaveRequests: LeaveRequest[];
  currentUserId?: string;
  isAdmin: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export interface LeaveRequestListProps {
  currentDate: Date;
  leaveRequests: LeaveRequest[];
  currentUserId?: string;
  isAdmin: boolean;
  onEditRequest: (request: LeaveRequest) => void;
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onDeleteRequest: (requestId: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
  isDeleting: boolean;
}

export interface LeaveRequestModalProps {
  open: boolean;
  editingRequest: LeaveRequest | null;
  formState: LeaveFormState;
  onClose: () => void;
  onSubmit: () => void;
  onFormStateChange: React.Dispatch<React.SetStateAction<LeaveFormState>>;
  isSaving: boolean;
  workingDayCount: number;
  selectedDates: string[];
}
