import test from "node:test";
import assert from "node:assert/strict";

import { calculateLeaveHoursForDateRange } from "../src/utils/leaveHours.ts";
import { getLeaveRequestBadgeClasses } from "../src/components/leave/leaveRequestHelpers.ts";

test("calculateLeaveHoursForDateRange uses the employee weekly hours for a single workday", () => {
  assert.equal(calculateLeaveHoursForDateRange(20, "2026-10-05", "2026-10-05"), 4);
});

test("calculateLeaveHoursForDateRange skips weekends and keeps weekly hours proportional", () => {
  assert.equal(calculateLeaveHoursForDateRange(20, "2026-10-05", "2026-10-08"), 16);
});

test("getLeaveRequestBadgeClasses reserves space for the self-request badge icon", () => {
  const classes = getLeaveRequestBadgeClasses("APPROVED", true);

  assert.match(classes, /relative/);
  assert.match(classes, /pr-5/);
  assert.match(classes, /border-green-200/);
});
