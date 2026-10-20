import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateReviewKpis,
  clampReviewPage,
} from "../src/utils/reviewHelpers.ts";

test("calculateReviewKpis adds numeric database values instead of concatenating them", () => {
  const result = calculateReviewKpis([
    {
      status: "submitted",
      hours_logged: "1.5",
      user_id: "employee-a",
    },
    {
      status: "submitted",
      hours_logged: "2.5",
      user_id: "employee-a",
    },
    {
      status: "approved",
      hours_logged: 4,
      user_id: "employee-b",
    },
  ]);

  assert.equal(result.totalSubmittedHours, 4);
  assert.equal(result.totalApprovedHours, 4);
  assert.equal(result.employeesPendingReview, 1);
});

test("calculateReviewKpis counts pending employees by user id", () => {
  const result = calculateReviewKpis([
    { status: "submitted", hours_logged: 1, user_id: "employee-a" },
    { status: "submitted", hours_logged: 1, user_id: "employee-b" },
    { status: "rejected", hours_logged: 1, user_id: "employee-c" },
  ]);

  assert.equal(result.employeesPendingReview, 2);
  assert.equal(result.totalRejected, 1);
});

test("clampReviewPage keeps a filtered result on an available page", () => {
  assert.equal(clampReviewPage(4, 1), 1);
  assert.equal(clampReviewPage(0, 3), 1);
  assert.equal(clampReviewPage(2, 3), 2);
});
