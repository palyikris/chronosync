import type {
  TimesheetEntry,
  TimesheetGridAdapterResult,
  TimesheetGridRow,
} from "../types/timesheet";

const formatHours = (hours: number) => Number(hours.toFixed(2));

export function convertEntriesToGridRows(
  entries: TimesheetEntry[],
  projectsMap: Record<string, string>,
): TimesheetGridAdapterResult {
  const rowMap = new Map<string, TimesheetGridRow>();
  const dailyTotals: Record<string, number> = {};

  for (const entry of entries) {
    const rowKey = `${entry.project_id}::${entry.description.trim()}`;
    const projectName = projectsMap[entry.project_id] ?? "Unknown project";
    const hours = Number(entry.hours_logged) || 0;

    if (!rowMap.has(rowKey)) {
      rowMap.set(rowKey, {
        id: rowKey,
        project_id: entry.project_id,
        project_name: projectName,
        description: entry.description,
        dailyHours: {},
        weeklyTotal: 0,
      });
    }

    const row = rowMap.get(rowKey);
    if (!row) {
      continue;
    }

    row.dailyHours[entry.work_date] = formatHours(
      (row.dailyHours[entry.work_date] ?? 0) + hours,
    );
    row.weeklyTotal = formatHours(row.weeklyTotal + hours);

    dailyTotals[entry.work_date] = formatHours(
      (dailyTotals[entry.work_date] ?? 0) + hours,
    );
  }

  const rows = Array.from(rowMap.values()).sort((a, b) => {
    const projectSort = a.project_name.localeCompare(b.project_name);
    if (projectSort !== 0) {
      return projectSort;
    }

    return a.description.localeCompare(b.description);
  });

  const weeklyTotal = formatHours(
    Object.values(dailyTotals).reduce((sum, value) => sum + value, 0),
  );

  return {
    rows,
    dailyTotals,
    weeklyTotal,
  };
}
