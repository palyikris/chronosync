# ChronoSync product demo integration

The marketing website has moved to the independent `landing/` project. Its layout, responsive harness, assets, and visual journey checklist live in `landing/tests/marketing-ui/README.md`.

The application still owns `/demo`. It imports the actual timesheet, review, billing, and layout components with a fictional in-memory transport. The normal authenticated application remains separate.

Run `npm run dev` in the repository root for port 5174 and `npm run dev:site` for the website at port 5173. In production, set `VITE_MARKETING_SITE_URL` on the application and `VITE_CHRONOSYNC_APP_URL` on the website. Messages are checked against both the configured origin and the expected window.

Run `node --test tests/marketing-ui/*.test.mjs` for draft/submission/approval/invoice gating, editing, filtering, PDF totals, reset, blocked external operations, cross-domain origin policy, and compatibility of the independently shipped message contracts. Run `npm --prefix landing test` for the downloadable CSV sample.
