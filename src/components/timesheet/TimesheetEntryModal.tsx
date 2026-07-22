import React from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Button } from "../shared/Button";
import { Input } from "../shared/Input";
import { Modal } from "../shared/Modal";
import { Select } from "../shared/Select";
import { Textarea } from "../shared/Textarea";
import type { TimesheetEntryModalProps } from "../../types/timesheet";

export const TimesheetEntryModal: React.FC<TimesheetEntryModalProps> = ({
  open,
  isEditing,
  formData,
  clients,
  projects,
  onClose,
  onSubmit,
  onChange,
  isSaving,
}) => {
  return (
    <Modal
      open={open}
      title={isEditing ? "Edit Entry" : "Log New Entry"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-semibold text-muted">
              Date
            </label>
            <Input
              type="date"
              required
              value={formData.work_date}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  work_date: event.target.value,
                }))
              }
              leftIcon={<CalendarIcon className="h-4 w-4" />}
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-semibold text-muted">
              Total Hours
            </label>
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
          <label className="mb-1 block text-xs font-semibold text-muted">
            Task Description
          </label>
          <Textarea
            rows={3}
            required
            value={formData.description}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="What did you work on today?"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-semibold text-muted">
              Client
            </label>
            <Select
              required
              value={formData.client_id}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  client_id: event.target.value,
                  project_id: "",
                }))
              }
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-semibold text-muted">
              Project
            </label>
            <Select
              required
              disabled={!formData.client_id}
              value={formData.project_id}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  project_id: event.target.value,
                }))
              }
            >
              <option value="">
                {formData.client_id
                  ? "Select a project"
                  : "Select a client first"}
              </option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-full"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 rounded-full"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Save Entry"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};