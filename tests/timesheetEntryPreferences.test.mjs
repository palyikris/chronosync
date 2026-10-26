import test from "node:test";
import assert from "node:assert/strict";
import {
  getEntryPreferencesKey, getRecentEntryProjects, isAvailableEntryProject,
  isSameFavoriteProject, readEntryPreferences, rememberEntryProject, writeEntryPreferences,
} from "../src/utils/timesheetEntryPreferences.ts";

const client = (id, overrides = {}) => ({ id, company_id: "company", is_active: true, ...overrides });
const project = (id, client_id = "client", overrides = {}) => ({ id, client_id, company_id: "company", is_active: true, ...overrides });
const shortcut = (project_id, hours_logged = 1) => ({ client_id: "client", project_id, hours_logged });
const entry = (id, project_id, created_at, hours_logged = 1) => ({
  id, ...shortcut(project_id, hours_logged), company_id: "company", created_at,
});

test("recent choices are unique, use the latest duration, and exclude inactive or mismatched projects", () => {
  const result = getRecentEntryProjects([
    entry("old", "p1", "2026-10-01", 8), entry("new", "p1", "2026-10-25", 0.5),
    entry("other", "p2", "2026-10-24"), entry("inactive", "p3", "2026-10-26"),
    entry("wrong-client", "p4", "2026-10-26"),
    { ...entry("wrong-company", "p5", "2026-10-26"), company_id: "another" },
  ], [], [client("client")], [project("p1"), project("p2"), project("p3", "client", { is_active: false }),
    project("p4", "other"), project("p5")], "company");
  assert.deepEqual(result, [shortcut("p1", 0.5), shortcut("p2")]);
});

test("saved choices survive month changes and stale choices are filtered", () => {
  const result = getRecentEntryProjects([entry("one", "p1", "2026-10-01")],
    [shortcut("removed"), shortcut("p2", 2)], [client("client")],
    [project("p1"), project("p2")], "company");
  assert.deepEqual(result, [shortcut("p2", 2), shortcut("p1")]);
  assert.equal(isAvailableEntryProject(shortcut("p1"), [client("client", { is_active: false })], [project("p1")], "company"), false);
  assert.equal(isAvailableEntryProject(shortcut("p1"), [client("client")], [project("p1", "client", { company_id: "other" })], "company"), false);
});

test("successful saves remember the project and favourite identity ignores duration", () => {
  const favoriteProjects = [{ client_id: "client", project_id: "p1" }];
  const result = rememberEntryProject({ recentProjects: [shortcut("p2"), shortcut("p1"), shortcut("p3"), shortcut("p4")] }, shortcut("p1", 0.25));
  assert.deepEqual(result.recentProjects, [shortcut("p1", 0.25), shortcut("p2"), shortcut("p3"), shortcut("p4")]);
  assert.equal(isSameFavoriteProject(favoriteProjects[0], { client_id: "client", project_id: "p1" }), true);
  assert.equal(isSameFavoriteProject(favoriteProjects[0], { client_id: "client", project_id: "p2" }), false);
});

test("preferences isolate the viewer, company, and timesheet owner", t => {
  const previous = globalThis.window;
  t.after(() => { globalThis.window = previous; });
  const storage = new Map();
  globalThis.window = { localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } };
  const key = getEntryPreferencesKey("viewer", "company", "owner");
  const value = { recentProjects: [shortcut("p1")] };
  writeEntryPreferences(key, value);
  assert.deepEqual(readEntryPreferences(key), value);
  for (const other of [["other", "company", "owner"], ["viewer", "other", "owner"], ["viewer", "company", "other"]]) {
    assert.deepEqual(readEntryPreferences(getEntryPreferencesKey(...other)), { recentProjects: [] });
  }
  storage.set(key, JSON.stringify({ recentProjects: [shortcut("p1", -1), shortcut("p2")],
    favoriteProjects: [{ ...shortcut("p1"), description: "  Planning  ", work_date: "wrong" }, { ...shortcut("p2"), description: " " }] }));
  assert.deepEqual(readEntryPreferences(key), { recentProjects: [shortcut("p2")] });
  storage.set(key, "corrupt JSON");
  assert.deepEqual(readEntryPreferences(key), { recentProjects: [] });
});

test("unavailable browser storage does not block entry creation", t => {
  const previous = globalThis.window;
  t.after(() => { globalThis.window = previous; });
  globalThis.window = { get localStorage() { throw new Error("Storage unavailable"); } };
  assert.deepEqual(readEntryPreferences("key"), { recentProjects: [] });
  assert.doesNotThrow(() => writeEntryPreferences("key", { recentProjects: [] }));
});
