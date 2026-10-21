import test from "node:test";
import assert from "node:assert/strict";

import {
  aggregateDashboardData,
  calculateExpectedCapacityHours,
  getCurrentMonthDateRange,
  getDashboardDateRange,
  getMonthlyEstimateFactor,
  isValidDashboardDateRange,
  parseDashboardDate,
} from "../src/utils/dashboardCalculations.ts";

test("dashboard month defaults use local calendar dates without UTC drift", () => {
  assert.deepEqual(
    getCurrentMonthDateRange(new Date(2026, 9, 21, 8)),
    { startDate: "2026-10-01", endDate: "2026-10-31" },
  );
});

test("dashboard date validation rejects impossible and reversed ranges", () => {
  assert.equal(parseDashboardDate("2026-02-30"), null);
  assert.equal(isValidDashboardDateRange("2026-10-20", "2026-10-19"), false);
  assert.equal(isValidDashboardDateRange("2026-10-20", "2026-10-20"), true);
});

test("capacity uses the selected workdays and each active member's weekly hours", () => {
  const capacity = calculateExpectedCapacityHours(
    [
      { id: "full-time", weekly_work_hours: 40 },
      { id: "part-time", weekly_work_hours: 20 },
      { id: "default-hours", weekly_work_hours: null },
    ],
    "2026-10-05",
    "2026-10-09",
  );

  assert.equal(capacity, 100);
});

test("monthly estimates are prorated for partial and multi-month ranges", () => {
  assert.equal(getMonthlyEstimateFactor("2026-10-01", "2026-10-31"), 1);
  assert.equal(getMonthlyEstimateFactor("2026-10-01", "2026-11-30"), 2);
  assert.equal(
    Number(getMonthlyEstimateFactor("2026-10-01", "2026-10-15").toFixed(4)),
    Number((15 / 31).toFixed(4)),
  );
});

test("capacity utilization remains visible above 100 percent", () => {
  const data = aggregateDashboardData({
    activeProfiles: [{ id: "user-1", weekly_work_hours: 40 }],
    activeProjects: [],
    timesheetEntries: [
      {
        id: "entry-1",
        user_id: "user-1",
        work_date: "2026-10-05",
        hours_logged: 12,
        client_id: "client-1",
        project_id: "project-1",
        clients: { id: "client-1", name: "Acme" },
        projects: { id: "project-1", name: "Delivery" },
        profiles: { id: "user-1", full_name: "Ada Lovelace" },
      },
    ],
    startDate: "2026-10-05",
    endDate: "2026-10-05",
    labels: {
      unknown: "Unknown",
      unassignedClient: "Unassigned",
      generalProject: "General",
      unknownUser: "Unknown user",
    },
  });

  assert.equal(data.kpis.expectedCapacityHours, 8);
  assert.equal(data.kpis.capacityUtilizationPct, 150);
});

test("dashboard aggregation reports real utilization, active logger rate, and zero-hour days", () => {
  const data = aggregateDashboardData({
    activeProfiles: [
      { id: "user-1", weekly_work_hours: 40 },
      { id: "user-2", weekly_work_hours: 20 },
    ],
    activeProjects: [
      {
        id: "project-1",
        client_id: "client-1",
        name: "Delivery",
        estimated_hours_per_month: 310,
        clients: { id: "client-1", name: "Acme" },
      },
    ],
    timesheetEntries: [
      {
        id: "entry-1",
        user_id: "user-1",
        work_date: "2026-10-05",
        hours_logged: 8,
        client_id: "client-1",
        project_id: "project-1",
        clients: { id: "client-1", name: "Acme" },
        projects: { id: "project-1", name: "Delivery" },
        profiles: {
          id: "user-1",
          full_name: "Ada Lovelace",
        },
      },
      {
        id: "entry-2",
        user_id: "inactive-user",
        work_date: "2026-10-06",
        hours_logged: 4,
        client_id: "client-1",
        project_id: "project-1",
        clients: { id: "client-1", name: "Acme" },
        projects: { id: "project-1", name: "Delivery" },
        profiles: {
          id: "inactive-user",
          full_name: "Former Member",
        },
      },
    ],
    startDate: "2026-10-01",
    endDate: "2026-10-15",
    labels: {
      unknown: "Unknown",
      unassignedClient: "Unassigned",
      generalProject: "General",
      unknownUser: "Unknown user",
    },
  });

  assert.deepEqual(data.kpis, {
    totalLoggedHours: 12,
    activeLoggersCount: 1,
    totalActiveMembers: 2,
    activeLoggerRatePct: 50,
    expectedCapacityHours: 132,
    capacityUtilizationPct: 9,
  });
  assert.equal(data.userBreakdown[0].userEmail, undefined);
  assert.equal(data.clientProjectUtilization[0].estimatedHours, 150);
  assert.equal(data.clientProjectUtilization[0].utilizationPct, 8);
  assert.equal(data.dailyTrends.length, 15);
  assert.equal(data.dailyTrends[0].totalHours, 0);
  assert.equal(
    data.dailyTrends.find((trend) => trend.workDate === "2026-10-05")
      ?.totalHours,
    8,
  );
  assert.deepEqual(
    getDashboardDateRange("2026-10-30", "2026-11-02"),
    ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"],
  );
});
