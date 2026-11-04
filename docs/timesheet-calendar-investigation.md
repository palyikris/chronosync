# Timesheet calendar entries appearing to disappear

Investigated on 29 October 2026 after Barbara Travnyik reported that calendar day totals disappeared after adding an entry and returned after refreshing. Whether a client/project filter was active is unknown.

## Production evidence

Read-only inspection of the timesheet API logs and aggregate database counts found:

- Barbara has 54 October entries and 50 September entries.
- On 29 October, the October API response contained 50 rows before the morning saves, then 51, 52, 53 and 54 rows after the four saves. The last save was at 09:00:24 Budapest time; its month refetch returned all 54 rows.
- The subsequent month refetch at 09:00:45 also returned 54 rows. The examined requests succeeded, and the retained API logs contained no failed timesheet GET for her user ID.
- The create service inserts one entry and invalidates the cached queries. It does not delete or replace other entries. The page uses separate query keys for each user/month and for the attention view.

The observed post-save responses do not support data loss, API truncation or a failed read as the explanation for this incident. Logs contain row counts rather than response bodies or browser state, so they cannot prove which entries the browser rendered or which filters Barbara selected.

## Reproduced UI behavior

`TimesheetPage` calculates both the calendar's day/month totals and the selected-day entries from the client/project-filtered arrays. `TimesheetEntryFilter` allows its controls to collapse while keeping that filter active. Previously, the collapsed panel did not identify the selected client/project or explain that totals were filtered. A day containing only another client's work consequently appeared empty. The selected-day empty state also said that no hours had been logged.

The filter IDs are React state, initialized to empty strings. A browser refresh clears them and restores all totals. Saving an entry preserves them. This reproduces the reported disappearing-totals/refresh-restores-them behavior, although it does not establish that Barbara had selected a filter. Saving itself does not activate a filter in the inspected code.

## Fix

- Always show the active client/project and explain that calendar totals and entries are filtered, including when the filter controls are collapsed.
- Keep the existing Clear filters action visible so all entries can be restored without refreshing.
- In calendar and list views, describe an empty filtered result as no matching entries and explain how to clear the filter, instead of claiming that no hours were logged.
- Provide the text in English and Hungarian.

## Verification

`tests/timesheet-calendar/smoke.mjs` runs the real page with intercepted API requests and 54 synthetic monthly entries. It checks that existing entries/totals survive a slow post-save refetch, that saving does not change the filter, that the collapsed filter remains identified, that clearing it restores every entry, that empty results explain filtering, and that refreshing resets the filter. Both languages and narrow/wide layouts are covered. The regression failed on the original UI because the collapsed active-filter explanation was absent.

Validation passed: the English/Hungarian calendar regression, all 13 unit test files, the production build, and ESLint for the changed components and regression. The existing entry workflow also passed all 66 checks using a temporary copy with local resources fetched through Playwright's API transport; its normal browser transport encountered `ERR_NETWORK_CHANGED` during startup/reload. The API mocks and workflow assertions were unchanged.

Run Vite with `VITE_SUPABASE_URL=http://127.0.0.1:54321` and a fake `VITE_SUPABASE_PUBLISHABLE_KEY`, then run `node tests/timesheet-calendar/smoke.mjs` with Playwright available. `CALENDAR_UI_BASE_URL` defaults to `http://127.0.0.1:5196`; `PLAYWRIGHT_CHROMIUM_EXECUTABLE` may select an installed Chromium binary. No hosted writes are made.

If this recurs with no active filter, capture the affected work date, calendar screenshot, and browser network response before refreshing. That would distinguish a rendering issue from a different client state problem; the current evidence cannot identify such a separate defect.
