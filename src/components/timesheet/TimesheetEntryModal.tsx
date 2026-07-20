import React from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Button } from "../shared/Button";
import { Input } from "../shared/Input";
import { Modal } from "../shared/Modal";
import { Textarea } from "../shared/Textarea";

interface TimesheetFormData {
  work_date: string;
  hours_logged: number;
  description: string;
  company_id: string;
}

interface TimesheetEntryModalProps {
  open: boolean;
  isEditing: boolean;
  formData: TimesheetFormData;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onChange: React.Dispatch<React.SetStateAction<TimesheetFormData>>;
  isSaving: boolean;
}

export const TimesheetEntryModal: React.FC<TimesheetEntryModalProps> = ({
  open,
  isEditing,
  formData,
  onClose,
  onSubmit,
  onChange,
  isSaving,
}) => {
  return (
    <Modal open={open} title={isEditing ? "Edit Entry" : "Log New Entry"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-semibold text-muted">Date</label>
            <Input
              type="date"
              required
              value={formData.work_date}
              onChange={(event) =>
                onChange((current) => ({ ...current, work_date: event.target.value }))
              }
              leftIcon={<CalendarIcon className="h-4 w-4" />}
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-semibold text-muted">Total Hours</label>
            <Input
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              required
              value={formData.hours_logged}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  hours_logged: parseFloat(event.target.value) || 0,
                }))
              }
              leftIcon={<Clock className="h-4 w-4" />}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted">Task Description</label>
          <Textarea
            rows={3}
            required
            value={formData.description}
            onChange={(event) =>
              onChange((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="What did you work on today?"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1 rounded-full" disabled={isSaving}>
            {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Save Entry"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};