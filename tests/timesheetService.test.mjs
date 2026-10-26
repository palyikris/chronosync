import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { fetchAllRows } from "../src/utils/fetchAllRows.ts";

// Execute the real service against local API/storage fakes; no hosted writes.
function serviceFixture(t, options = {}) {
  const storage = new Map();
  const previousWindow = globalThis.window;
  globalThis.window = { localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  } };
  t.after(() => { globalThis.window = previousWindow; });
  const writes = [];
  const reads = [];
  const filters = [];
  const checkedDates = [];
  const supabase = {
    auth: { getUser: async () => ({ data: { user: options.loggedOut ? null : { id: "user-1" } } }) },
    from: table => {
      let mutation;
      const predicates = [];
      const ordering = [];
      const filter = (method, field, value) => {
        predicates.push({ method, field, value });
        filters.push({ method, field, value });
        return query;
      };
      const query = {
        select: () => query,
        eq: (field, value) => filter("eq", field, value),
        in: (field, value) => filter("in", field, value),
        gte: (field, value) => filter("gte", field, value),
        lt: (field, value) => filter("lt", field, value),
        order: (field, value) => { ordering.push([field, value]); return query; },
        range: async (from, to) => {
          reads.push({ table, from, to, predicates, ordering });
          if (options.failReadOffset === from) return { data: null, error: new Error("Read failed") };
          const rows = (options.rows ?? []).filter(row => predicates.every(({method, field, value}) =>
            method === "in" ? value.includes(row[field]) : method === "eq" ? row[field] === value
              : method === "gte" ? row[field] >= value : row[field] < value));
          for (const [field, {ascending}] of [...ordering].reverse()) {
            rows.sort((a, b) => String(a[field]).localeCompare(String(b[field])) * (ascending ? 1 : -1));
          }
          return { data: rows.slice(from, Math.min(to + 1, from + (options.pageSize ?? 500))), error: null };
        },
        insert: rows => { mutation = rows[0]; return query; },
        update: row => { mutation = row; return query; },
        single: async () => {
          if (table === "projects") return { data: { client_id: "client-1", company_id: "company-1" }, error: null };
          if (!mutation) return { data: { user_id: "user-1", work_date: "2026-10-20" }, error: null };
          if (options.existingStatus && predicates.some(({method, field, value}) =>
            method === "in" && field === "status" && !value.includes(options.existingStatus))) {
            return { data: null, error: new Error("Entry is no longer editable") };
          }
          writes.push(mutation);
          if (options.failWrite?.()) return { data: null, error: new Error("Offline") };
          return { data: { id: "entry-1", ...mutation }, error: null };
        },
      };
      return query;
    },
  };
  const modules = {
    "../lib/supabaseClient": { supabase },
    "../lib/i18n": { __esModule: true, default: { t: key => key } },
    "../utils/fetchAllRows": { fetchAllRows },
    "./leaveService": { assertTimesheetDateIsUnlocked: async (_user, date) => {
      checkedDates.push(date);
      if (options.lockedDate === date) throw new Error("Date locked");
    } },
    "../types/timesheet": {
      newTimesheetPayloadSchema: { parse: value => value },
      timesheetEntryUpdatePayloadSchema: { parse: value => value },
    },
    "../utils/timesheetWorkflow": {
      getLocalDateValue: date => [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-"),
      getRoundedTimerHours: minutes => Number((minutes / 60).toFixed(2)),
    },
  };
  const { outputText } = ts.transpileModule(readFileSync(new URL("../src/services/timesheetService.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  new Function("require", "exports", outputText)(name => {
    assert.ok(name in modules, `Unexpected dependency: ${name}`);
    return modules[name];
  }, exports);
  return { service: exports, storage, writes, checkedDates, reads, filters };
}

function timerAt(date) {
  return { started_at: date.toISOString(), project_id: "project-1", client_id: "client-1",
    company_id: "company-1", description: "Work" };
}

test("concurrent stop requests save one entry and preserve the timer's starting day", async t => {
  t.mock.method(Date, "now", () => new Date(2026, 9, 21, 0, 10).getTime());
  const { service, writes, storage } = serviceFixture(t);
  const timer = timerAt(new Date(2026, 9, 20, 23, 50));
  await service.startTimer(timer);
  const [first, second] = await Promise.all([service.stopTimer(timer), service.stopTimer(timer)]);
  assert.equal(writes.length, 1);
  assert.equal(first, second);
  assert.equal(writes[0].work_date, "2026-10-20");
  assert.equal(writes[0].hours_logged, 0.33);
  assert.equal(storage.size, 0);
});

test("starting again retains an already running timer", async t => {
  const { service } = serviceFixture(t);
  const original = timerAt(new Date(Date.now() - 60000));
  await service.startTimer(original);
  assert.deepEqual(await service.startTimer(timerAt(new Date())), original);
});

test("a failed save retains the timer and permits a successful retry", async t => {
  let fail = true;
  const { service, storage, writes } = serviceFixture(t, { failWrite: () => fail });
  const timer = timerAt(new Date(Date.now() - 60000));
  await service.startTimer(timer);
  await assert.rejects(service.stopTimer(timer), /Offline/);
  assert.equal(storage.size, 1);
  fail = false;
  await service.stopTimer(timer);
  assert.equal(writes.length, 2);
  assert.equal(storage.size, 0);
});

test("future timestamps and mismatched project/client pairs cannot create hours", async t => {
  const { service, writes } = serviceFixture(t);
  await assert.rejects(service.stopTimer(timerAt(new Date(Date.now() + 60000))), /invalidActiveTimerState/);
  await assert.rejects(service.stopTimer({ ...timerAt(new Date(Date.now() - 60000)), client_id: "other-client" }), /invalidActiveTimerState/);
  assert.equal(writes.length, 0);
});

test("corrupt persisted timestamps are discarded during timer hydration", async t => {
  const { service, storage } = serviceFixture(t);
  storage.set("chronosync:active-timer:user-1", JSON.stringify({ ...timerAt(new Date()), started_at: "invalid" }));
  assert.equal(await service.getActiveTimerState(), null);
  assert.equal(storage.size, 0);
});

test("moving an entry cannot bypass an approved leave lock on its original date", async t => {
  const { service, writes } = serviceFixture(t, { lockedDate: "2026-10-20" });
  await assert.rejects(service.updateTimesheetEntry("entry-1", { work_date: "2026-10-21" }), /Date locked/);
  assert.equal(writes.length, 0);
});

test("edits check the destination date and clear obsolete review metadata", async t => {
  const { service, checkedDates, writes } = serviceFixture(t);
  await service.updateTimesheetEntry("entry-1", { work_date: "2026-10-21", hours_logged: 3 });
  assert.deepEqual(checkedDates, ["2026-10-20", "2026-10-21"]);
  assert.equal(writes[0].status, "draft");
  for (const field of ["submitted_at", "approved_by", "approved_at", "rejection_reason"]) {
    assert.equal(writes[0][field], null);
  }
});

test("attention includes only the target user's unresolved entries across years, beyond a short API page", async t => {
  const rows = [
    { id: "draft", user_id: "other-user", work_date: "2023-01-01", status: "draft" },
    { id: "rejected-new", user_id: "other-user", work_date: "2026-10-20", status: "rejected" },
    { id: "rejected-old", user_id: "other-user", work_date: "2024-02-01", status: "rejected" },
    { id: "own-draft", user_id: "user-1", work_date: "2026-10-20", status: "draft" },
    ...["submitted", "approved", "invoiced"].map(status => ({ id: status, user_id: "other-user", work_date: "2024-02-01", status })),
  ];
  const { service, reads } = serviceFixture(t, { rows, pageSize: 1 });
  assert.deepEqual((await service.fetchUserAttentionTimesheets("other-user")).map(row => row.id),
    ["rejected-old", "rejected-new", "draft"]);
  assert.deepEqual(reads.map(read => read.from), [0, 1, 2, 3]);
  assert.ok(reads.every(read => read.predicates.every(predicate => predicate.field !== "work_date")));
  assert.deepEqual(reads[0].ordering.at(-1), ["id", { ascending: true }]);
});

test("attention defaults to the authenticated user and rejects incomplete or unauthenticated reads", async t => {
  const { service } = serviceFixture(t, {
    rows: [{ id: "own-draft", user_id: "user-1", work_date: "2020-01-01", status: "draft" }],
    failReadOffset: 1,
  });
  await assert.rejects(service.fetchUserAttentionTimesheets(), /Read failed/);
  const { service: loggedOut, reads } = serviceFixture(t, { loggedOut: true });
  await assert.rejects(loggedOut.fetchUserAttentionTimesheets(), /notAuthenticated/);
  assert.equal(reads.length, 0);
});

test("resubmission saves corrections and submits in one write, clearing old review metadata", async t => {
  const { service, writes, checkedDates } = serviceFixture(t);
  const saved = await service.updateTimesheetEntry("entry-1", {
    work_date: "2026-10-21", hours_logged: 3, description: "Added the requested detail",
  }, { resubmit: true });
  assert.equal(writes.length, 1);
  assert.equal(saved.status, "submitted");
  assert.equal(saved.description, "Added the requested detail");
  assert.ok(Number.isFinite(Date.parse(saved.submitted_at)));
  assert.deepEqual(checkedDates, ["2026-10-20", "2026-10-21"]);
  for (const field of ["approved_by", "approved_at", "rejection_reason"]) assert.equal(saved[field], null);
});

test("resubmission respects leave locks and does not overwrite an entry that has already changed status", async t => {
  const { service: locked, writes: lockedWrites } = serviceFixture(t, { lockedDate: "2026-10-21" });
  await assert.rejects(locked.updateTimesheetEntry("entry-1", { work_date: "2026-10-21" }, { resubmit: true }), /Date locked/);
  assert.equal(lockedWrites.length, 0);
  const { service: stale, writes: staleWrites } = serviceFixture(t, { existingStatus: "approved" });
  await assert.rejects(stale.updateTimesheetEntry("entry-1", { description: "Correction" }, { resubmit: true }), /no longer editable/);
  assert.equal(staleWrites.length, 0);
});
