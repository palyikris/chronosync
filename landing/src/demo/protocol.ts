export const DEMO_ROUTES = ["/timesheet", "/admin/review", "/admin/billing"] as const;
export type DemoRoute = (typeof DEMO_ROUTES)[number];

export type DemoSnapshot = {
  hours: number;
  draftHours: number;
  submittedHours: number;
  approvedHours: number;
  entryCount: number;
  reviewed: boolean;
};

export const isDemoRoute = (value: unknown): value is DemoRoute =>
  DEMO_ROUTES.some(route => route === value);

export function isDemoSnapshot(value: unknown): value is DemoSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Record<string, unknown>;
  return ["hours", "draftHours", "submittedHours", "approvedHours", "entryCount"]
    .every(key => typeof snapshot[key] === "number" && Number.isFinite(snapshot[key]))
    && typeof snapshot.reviewed === "boolean";
}
