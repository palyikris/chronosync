import test from "node:test";
import assert from "node:assert/strict";

import {
  getDraftEntryIdsForPeriod,
  getLocalDateValue,
  getRoundedTimerHours,
} from "../src/utils/timesheetWorkflow.ts";

const entry = (id, workDate, status = "draft") => ({
  id,
  work_date: workDate,
  status,
});

test("timer hours preserve quarter-hours and use two-decimal precision", () => {
  assert.equal(getRoundedTimerHours(15), 0.25);
  assert.equal(getRoundedTimerHours(10), 0.17);
  assert.equal(getRoundedTimerHours(90), 1.5);
});

test("local date values use calendar fields instead of UTC serialization", () => {
  assert.equal(getLocalDateValue(new Date(2026, 9, 20, 23, 30)), "2026-10-20");
});

test("week submission follows the Monday-first calendar", () => {
  const entries = [
    entry("previous-sunday", "2026-10-18"),
    entry("monday", "2026-10-19"),
    entry("selected", "2026-10-21"),
    entry("sunday", "2026-10-25"),
    entry("next-monday", "2026-10-26"),
    entry("already-submitted", "2026-10-22", "submitted"),
  ];

  assert.deepEqual(
    getDraftEntryIdsForPeriod(entries, "2026-10-21", "week"),
    ["monday", "selected", "sunday"],
  );
});

test("day and month submission select only drafts in the requested period", () => {
  const entries = [
    entry("previous-month", "2026-09-30"),
    entry("first", "2026-10-01"),
    entry("selected", "2026-10-20"),
    entry("submitted", "2026-10-20", "submitted"),
    entry("last", "2026-10-31"),
    entry("next-month", "2026-11-01"),
  ];

  assert.deepEqual(
    getDraftEntryIdsForPeriod(entries, "2026-10-20", "day"),
    ["selected"],
  );
  assert.deepEqual(
    getDraftEntryIdsForPeriod(entries, "2026-10-20", "month"),
    ["first", "selected", "last"],
  );
});
