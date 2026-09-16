import { z } from "zod";
import { uuidSchema } from "../lib/zodSchemas";

export const leaveRequestStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const leaveDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const leaveRequestCreateSchema = z
  .object({
    start_date: leaveDateSchema,
    end_date: leaveDateSchema,
    weekly_work_hours: z.number().finite().positive().max(80).optional(),
  })
  .strict();

export const leaveRequestUpdateSchema = z
  .object({
    start_date: leaveDateSchema,
    end_date: leaveDateSchema,
    weekly_work_hours: z.number().finite().positive().max(80).optional(),
  })
  .strict();

export const leaveRequestStatusUpdateSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
  })
  .strict();

export type LeaveRequestStatus = z.infer<typeof leaveRequestStatusSchema>;
export type LeaveRequestCreatePayload = z.infer<typeof leaveRequestCreateSchema>;
export type LeaveRequestUpdatePayload = z.infer<typeof leaveRequestUpdateSchema>;
export type LeaveRequestStatusUpdatePayload = z.infer<
  typeof leaveRequestStatusUpdateSchema
>;

export interface LeaveRequest {
  id: string;
  user_id: string;
  company_id: string;
  start_date: string;
  end_date: string;
  weekly_work_hours: number | null;
  hours_taken: number | null;
  status: LeaveRequestStatus;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string;
    role: string;
  } | null;
}

export interface LeaveRequestConflictErrorPayload {
  error: "LOGGED_HOURS_EXIST";
  conflicting_dates: string[];
}

export const leaveRequestIdSchema = uuidSchema;
