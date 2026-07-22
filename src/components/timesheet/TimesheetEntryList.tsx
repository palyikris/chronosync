import React from "react";
import { Edit, History, Plus, Trash2 } from "lucide-react";
import { Button } from "../shared/Button";
import { Card, CardContent, CardFooter, CardHeader } from "../shared/Card";
import type { TimesheetEntryListProps } from "../../types/timesheet";

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
  clients,
  canManageTarget,
}) => {
  const selectedDayLabel = new Date(
    `${selectedDate}T12:00:00`,
  ).toLocaleDateString("default", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Selected Day
            </p>
            <h3 className="mt-1 font-bold text-text">{selectedDayLabel}</h3>
            <p className="text-xs text-muted">{totalDailyHours} hours logged</p>
          </div>
          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-strong">
            Live detail
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted">
            Loading entries...
          </div>
        ) : entries.length === 0 ? (
          <div className="space-y-3 py-10 text-center text-sm text-muted">
            <p>No hours logged for this date.</p>
            <p>Use the button below to add the first entry.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="group relative rounded-xl border border-border-strong bg-surface-strong p-3 transition-all hover:shadow-md"
            >
              <div className="mb-1 flex items-start justify-between">
                <span className="rounded bg-[#e3e2e6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-strong">
                  {(() => {
                    const clientName =
                      clients.find((c) => c.id === entry.client_id)?.name ?? "";
                    return clientName || "Unknown Client";
                  })()}
                </span>
                <span className="text-sm font-bold text-primary-strong">
                  {entry.hours_logged} hrs
                </span>
              </div>

              <p className="mb-2 text-sm font-normal text-text">
                {entry.description || "No description provided."}
              </p>

              <div className="flex items-center justify-between text-xs text-muted">
                <span className="flex items-center gap-1">
                  <History className="h-3.5 w-3.5" /> Logged
                </span>

                {canManageTarget ? (
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
                ) : (
                  <span className="text-xs text-muted">Read only</span>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>

      {canManageTarget ? (
        <CardFooter className="mt-auto bg-bg-accent/60">
          <Button
            variant="primary"
            className="w-full rounded-xl"
            onClick={onAddEntry}
          >
            <Plus className="h-4 w-4" /> Add Entry
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
};