# UX and efficiency audit — 26 October 2026

Reviewed the login, timesheet, leave, dashboard, review, team, company settings, invoice attachments, billing, and audit-log screens. Existing local UI and invoicing work was preserved.

| Issue | Fix |
| --- | --- |
| Every route was imported at startup, including charts and spreadsheet tools. | Lazy-load pages and keep the application layout visible while a page loads. The main JavaScript entry decreased from 1,736.65 kB to approximately 285 kB; page dependencies now live in separate chunks. |
| The root URL sent signed-in users through login, and several admin pages lacked route guards. | Redirect directly to the role's home screen and explicitly guard company/platform administration routes. Database authorization remains authoritative. |
| Session changes awaited profile queries inside the auth callback and repeatedly loaded the same profile. | Keep the auth callback synchronous, load profiles through a cancellable cached query, reject obsolete initialization results, and clear cached account data when identity changes. |
| An old saved `grid` preference rendered neither timesheet view. | Recover to the calendar view and persist the supported preference. |
| Fixed-width timesheet filters and an unconstrained grid overflowed phone screens. | Stack filters on small screens, constrain grid columns, and keep calendar scrolling inside its card. Collapsed filters no longer receive keyboard focus. |
| Opening a timesheet and choosing a client repeated client/project requests. | Derive active choices from the already-loaded company data. Editing historical inactive selections remains supported. |
| Long dropdowns clipped options and lacked keyboard navigation. | Make the option list scrollable; support arrow keys, Home/End, Escape, and focus restoration. Search updates no longer steal focus while navigating results. |
| Long dialogs could put their bottom actions outside the usable viewport. | Keep the header fixed within the dialog and scroll its body. Required dropdown validation focuses the visible control. |
| A hidden mobile sidebar remained keyboard-accessible; Escape did not close it. | Make it inert while closed, trap focus and lock background scrolling while open, restore opener focus on dismissal, and close it after navigation. Sign-out failures are visible. |
| Some failed requests appeared as empty lists. | Add localized error and retry controls for timesheets, leave requests, team members, and audit logs. |
| Review, leave, and timesheet actions could leave other screens showing stale data. | Invalidate the related timesheet, review, leave-lock, KPI, and dashboard caches after changes. |
| Work-hour settings bypassed browser validation and left profile-based defaults stale. | Submit through a validated form and refresh the account profile after saving. Settings drafts no longer require cascading synchronization effects. Leave configuration saves update the cached configuration and show confirmation. |
| Team search promised email matching but only matched names. | Match both names and email addresses. Remove member data logging from every table render. |
| Team Export did nothing, audit export was unreachable, and CSV fields were not escaped. | Export the filtered team/current audit page, preserve Unicode, quote commas/newlines/quotes, and treat formula-like values as text. |
| Audit search sent an unsupported OR across related resources, and typing could show stale responses. | Use a separate actor-search embed, safely quote search values, match full record UUIDs with equality, debounce requests, cancel obsolete queries, and order pagination deterministically. |
| Some form labels were unassociated and list navigation was hardcoded in English. | Generate control IDs, label timesheet inputs and icon actions, and add English/Hungarian text for new controls and errors. |
| Login recovery/access controls had no useful result. | Show clear company-administrator instructions for password recovery and account access. |
| Invoice attachments had no page heading. | Add a consistent page title. |

## Follow-up admin pass

| Issue | Fix |
| --- | --- |
| Selecting company administrators used `admin` instead of the stored `company_admin` role. | Correct the filter value and verify it against mixed-role member lists. |
| The super-admin company filter never affected the table. | Match company names case-insensitively and include company filtering in reset/active-filter state. |
| Team pagination controls were placeholders. | Paginate at 25 members, reset the page after filtering, clamp after list changes, and disable unavailable navigation. CSV export still includes every filtered member. |
| Failed member role/status/delete actions had no feedback; repeated clicks could conflict. | Show action errors, disable conflicting actions while saving, skip unchanged roles, and serialize password-reset requests. |
| Filter panels could open beyond the phone viewport and did not dismiss consistently. | Position shared panels within the viewport, support outside click/Escape and focus restoration, and preserve nested portaled dropdown interactions. |
| Hiding company client/project filters cleared the user's search. | Preserve filter values while collapsing the controls. |
| Company settings repeatedly fetched data already loaded by timesheets, while saves could leave other views stale. | Share company-scoped client/project queries and invalidate dependent selectors, reports, review data, and invoice selections. Refresh invoice provider settings after a save. |
| Failed settings loads could appear as empty data or default provider settings. | Render loading/error states before editable controls and expose retry actions. Company-list failures now have retry controls too. |
| Closing a dialog during an invitation or client/project write could hide the outcome. | Prevent dismissal during writes, disable client/project modal controls while saving, and retain invitation details on failure. |

## Verification

- Production build and TypeScript checks pass.
- ESLint passes.
- The Node unit suite passes across 11 test files, including CSV and audit-query regressions.
- 77 browser UX checks pass against an immutable production build with mocked API responses; shared-component checks run through the local Vite harness.
- 14 existing invoice UI checks pass on desktop and mobile.
- Mobile dashboard and entry-dialog screenshots were inspected.

Browser verification used isolated fake accounts and intercepted APIs. No live database, invoice issuance, email, or deployment action was performed. Live Supabase/backend integration was not exercised.

The browser regression runner is `tests/ux-ui/smoke.mjs`. It supports `UX_DIST_DIR` for a temporary production build, `UX_COMPONENT_BASE_URL` for the Vite component harness, and an optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Playwright must be available in Node's module path.
