# ChronoSync

ChronoSync is a role-aware workforce and company operations web app focused on time tracking, company administration, and dashboard reporting. It's a frontend application built with React + TypeScript and integrates with Supabase for auth and storage.

## Quick start

- Clone and install dependencies:

```bash
git clone <repository-url>
cd chronosync
npm install
```

- Create a `.env` file in the project root with the following keys:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

- Start the dev server:

```bash
npm run dev
```

Open the Vite URL shown in the terminal (usually http://localhost:5173).

## Required environment variables

- `VITE_SUPABASE_URL` — Supabase project URL (used by `src/lib/supabaseClient.ts`)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase publishable (anon) key

The app will throw an error at startup if either value is missing.

## Scripts

Use the npm scripts defined in `package.json`:

- `npm run dev` — start Vite development server
- `npm run build` — typecheck and build a production bundle (`tsc -b && vite build`)
- `npm run preview` — locally preview the built production bundle
- `npm run lint` — run ESLint

## Tech stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Supabase (auth & storage)
- TanStack Query
- Zod (validation)
- Recharts (charts)
- i18next (localization)

Package versions and dependencies are specified in `package.json`.

## Features

ChronoSync provides the following features (grouped by area) with a short description of each:

- Authentication & Access Control: Email/password sign-in, sign-up flows, sign-out, and role-aware access (`regular`, `company_admin`, `super_admin`). See `src/services/authService.ts` and `src/context/AuthContext.tsx` for details.

- Timesheet Management:
	- Calendar and List views for monthly and daily timesheets (create, edit, delete). See `src/pages/TimesheetPage.tsx` and `src/components/timesheet`.
	- Manual entry creation and editing via modal forms, with client/project selection.
	- Active timer support (start/stop timers stored locally and persisted as timesheet entries) via `src/services/timesheetService.ts`.
	- Duplicate (clone) entries, daily upsert helpers, and bulk submit/revert operations for workflow convenience.

- Timesheet Review & Approval:
	- Company-level review dashboard with filters (status, user, date range, client, project).
	- Approve, reject (with reason), or revert entries. KPI cards show submitted/approved hours and pending reviewers. See `src/pages/TimesheetReviewPage.tsx` and `src/services/reviewService.ts`.

- Dashboard & Reporting:
	- Admin dashboard with KPIs (total hours, active logging rate, capacity utilization), daily trends, user and project breakdowns, and utilization panels. Implemented in `src/pages/DashboardPage.tsx` and `src/services/dashboardService.ts`.

- Company & Project Configuration:
	- Company management (create, update, soft-delete, restore, hard-delete, toggle active) for super admins: `src/pages/CompanyManagementPage.tsx` and `src/services/companyService.ts`.
	- Company settings for admins: manage clients and projects, project estimated hours, invoice attachment language, and company logo upload. See `src/pages/CompanySettingsPage.tsx`, `src/services/clientProjectService.ts`, and `src/services/companyLogoService.ts`.

- Client & Project Features:
	- CRUD for clients and projects, active/inactive toggles, default client handling, and availability/estimation fields used by reports and utilization panels. See `src/services/clientProjectService.ts`.

- User Management:
	- Invite users to a company, assign roles, toggle active/inactive, hard-delete users, and trigger password reset emails. See `src/pages/UserManagementPage.tsx` and `src/services/userManagementService.ts`.

- Audit Logs & Export:
	- System audit log viewer for Super Admins with search, operation/type filter (INSERT/UPDATE/DELETE), table filter, pagination, and CSV export functionality. Implemented in `src/pages/LogsPage.tsx` and `src/services/logsService.ts`.

- Internationalization (i18n):
	- Built-in localization with English and Hungarian resources in `src/locales` and runtime language switching in `src/pages/UserSettingsPage.tsx` using `i18next`.

- Client-side UX and Utilities:
	- Reusable UI primitives (Button, Card, Modal, Select, Input, Table) under `src/components/shared`.
	- Domain-scoped components grouped under `src/components/*` for timesheet, dashboard, review, user-management, company-settings, and audit-logs.

- Validation & Type Safety:
	- Zod schemas and TypeScript types for payload validation and safer API usage (`src/types/*`).

If you'd like, I can expand each of these bullets into longer subpages in `docs/` or add quick screenshots and usage examples for each feature.

## Project layout (important folders)

- `src/pages` — route-level screens
- `src/components` — feature-scoped UI components
- `src/services` — API and data access layers (Supabase wrappers)
- `src/context` — React contexts (auth, etc.)
- `src/lib` — integrations (see `src/lib/supabaseClient.ts` and `src/lib/i18n.ts`)
- `src/locales` — translation files (English/Hungarian)

## Development notes

- The Supabase client is initialized in `src/lib/supabaseClient.ts` and requires the environment variables above.
- Routing and role-based redirects are handled at the application entry points and pages under `src/pages`.
- UI components are grouped by feature domain under `src/components`.

## Contributing

- Follow the existing domain-based folder structure and TypeScript typing patterns.
- Run `npm run lint` before creating a PR.
- Keep user-facing text localizable; add new keys to `src/locales/*`.



