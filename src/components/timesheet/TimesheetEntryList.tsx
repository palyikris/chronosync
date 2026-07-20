import React from "react";
import { Edit, History, Plus, Trash2 } from "lucide-react";
import { type TimesheetEntry } from "../../services/timesheetService";
import { Button } from "../shared/Button";
import { Card, CardContent, CardFooter, CardHeader } from "../shared/Card";

interface TimesheetEntryListProps {
  selectedDate: string;
  totalDailyHours: number;
  entries: TimesheetEntry[];
  loading: boolean;
  onAddEntry: () => void;
  onEditEntry: (entry: TimesheetEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

export const TimesheetEntryList: React.FC<TimesheetEntryListProps> = ({
  selectedDate,
  totalDailyHours,
  entries,
  loading,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
  isUpdating,
  isDeleting,
}) => {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-bold text-text">Entries for {selectedDate}</h3>
        <p className="text-xs text-muted">Total: {totalDailyHours} hours logged</p>
      </CardHeader>

      <CardContent className="space-y-3 max-h-[380px] overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted">Loading entries...</div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted">No hours logged for this date.</div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="group relative rounded-xl border border-border-strong bg-surface-strong p-3 transition-all hover:shadow-md"
            >
              <div className="mb-1 flex items-start justify-between">
                <span className="rounded bg-[#e3e2e6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-strong">
                  Work Log
                </span>
                <span className="text-sm font-bold text-primary-strong">{entry.hours_logged} hrs</span>
              </div>

              <p className="mb-2 text-sm font-normal text-text">
                {entry.description || "No description provided."}
              </p>

              <div className="flex items-center justify-between text-xs text-muted">
                <span className="flex items-center gap-1">
                  <History className="h-3.5 w-3.5" /> Logged
                </span>

                <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditEntry(entry)}
                    disabled={isUpdating}
                    className="h-8 w-8 rounded-full text-primary-strong hover:bg-[#e6f0d6]"
                    aria-label="Edit entry"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteEntry(entry.id)}
                    disabled={isDeleting}
                    className="h-8 w-8 rounded-full text-danger hover:bg-red-50"
                    aria-label="Delete entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <CardFooter>
        <Button variant="dashed" className="w-full rounded-xl" onClick={onAddEntry}>
          <Plus className="h-4 w-4" /> Add Entry for {selectedDate}
        </Button>
      </CardFooter>
    </Card>
  );
};