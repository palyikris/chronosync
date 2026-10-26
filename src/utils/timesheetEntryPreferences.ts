import type { Client, Project } from "../types/client-project";
import type {
  TimesheetEntry,
  TimesheetEntryPreferences,
  TimesheetFavoriteProject,
  TimesheetProjectShortcut,
} from "../types/timesheet";

const emptyPreferences = (): TimesheetEntryPreferences => ({
  recentProjects: [],
});

export const getEntryPreferencesKey = (
  viewerId: string,
  companyId: string,
  targetUserId: string,
) => `chronosync:timesheet:entry:${viewerId}:${companyId}:${targetUserId}`;

const isProjectShortcut = (value: unknown): value is TimesheetProjectShortcut => {
  if (!value || typeof value !== "object") return false;
  const shortcut = value as TimesheetProjectShortcut;
  return typeof shortcut.client_id === "string" && Boolean(shortcut.client_id) &&
    typeof shortcut.project_id === "string" && Boolean(shortcut.project_id) &&
    typeof shortcut.hours_logged === "number" &&
    Number.isFinite(shortcut.hours_logged) &&
    shortcut.hours_logged > 0 && shortcut.hours_logged <= 24;
};

export const readEntryPreferences = (key: string): TimesheetEntryPreferences => {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (!stored || typeof stored !== "object") return emptyPreferences();
    const value = stored as TimesheetEntryPreferences;
    return {
      recentProjects: Array.isArray(value.recentProjects)
        ? value.recentProjects.filter(isProjectShortcut).slice(0, 4) : [],
    };
  } catch {
    return emptyPreferences();
  }
};

export const writeEntryPreferences = (
  key: string,
  preferences: TimesheetEntryPreferences,
) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(preferences));
  } catch {
    // Shortcuts still work in memory when browser storage is unavailable.
  }
};

export const isAvailableEntryProject = (
  shortcut: Pick<TimesheetProjectShortcut, "client_id" | "project_id">,
  clients: Client[],
  projects: Project[],
  companyId: string,
) => clients.some(client => client.id === shortcut.client_id &&
    client.company_id === companyId && client.is_active) &&
  projects.some(project => project.id === shortcut.project_id &&
    project.client_id === shortcut.client_id &&
    project.company_id === companyId && project.is_active);

export const getRecentEntryProjects = (
  entries: TimesheetEntry[],
  saved: TimesheetProjectShortcut[],
  clients: Client[],
  projects: Project[],
  companyId: string,
): TimesheetProjectShortcut[] => {
  const recent: TimesheetProjectShortcut[] = [];
  const history = [...entries]
    .filter(entry => entry.company_id === companyId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  for (const shortcut of [...saved, ...history]) {
    if (!isProjectShortcut(shortcut) ||
      !isAvailableEntryProject(shortcut, clients, projects, companyId) ||
      recent.some(item => item.project_id === shortcut.project_id)) continue;
    recent.push({
      client_id: shortcut.client_id,
      project_id: shortcut.project_id,
      hours_logged: shortcut.hours_logged,
    });
    if (recent.length === 4) break;
  }
  return recent;
};

export const isSameFavoriteProject = (
  left: TimesheetFavoriteProject,
  right: TimesheetFavoriteProject,
) => left.client_id === right.client_id && left.project_id === right.project_id;

export const rememberEntryProject = (
  preferences: TimesheetEntryPreferences,
  shortcut: TimesheetProjectShortcut,
): TimesheetEntryPreferences => ({
  ...preferences,
  recentProjects: [shortcut, ...preferences.recentProjects.filter(
    item => item.project_id !== shortcut.project_id,
  )].slice(0, 4),
});
