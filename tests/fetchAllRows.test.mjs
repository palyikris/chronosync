import test from "node:test";
import assert from "node:assert/strict";
import { fetchAllRows } from "../src/utils/fetchAllRows.ts";

test("reports include all rows beyond the API limit, including a short final page", async () => {
  const source = Array.from({ length: 1234 }, (_, id) => ({ id }));
  const ranges = [];
  const rows = await fetchAllRows(async (from, to) => {
    ranges.push([from, to]);
    return { data: source.slice(from, to + 1), error: null };
  });
  assert.deepEqual(rows, source);
  assert.deepEqual(ranges.map(([from]) => from), [0, 500, 1000, 1234]);
});

test("a configured API cap below the requested page size does not truncate data", async () => {
  const source = Array.from({ length: 225 }, (_, id) => ({ id }));
  const rows = await fetchAllRows(async (from) => ({
    data: source.slice(from, from + 100), error: null,
  }));
  assert.deepEqual(rows, source);
});

test("a failed later page rejects instead of returning misleading partial totals", async () => {
  const failure = new Error("Page unavailable");
  await assert.rejects(fetchAllRows(async (from) => from === 0
    ? { data: [{ id: 1 }], error: null }
    : { data: null, error: failure }), failure);
});
