import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

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
  const checkedDates = [];
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
    from: table => {
      let mutation;
      const query = {
        select: () => query, eq: () => query,
        insert: rows => { mutation = rows[0]; return query; },
        update: row => { mutation = row; return query; },
        single: async () => {
          if (table === "projects") return { data: { client_id: "client-1", company_id: "company-1" }, error: null };
          if (!mutation) return { data: { user_id: "user-1", work_date: "2026-10-20" }, error: null };
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
  return { service: exports, storage, writes, checkedDates };
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
