# ChronoSync marketing page and product demo

Run `npm run dev` in `landing/` for the website at port 5173 and in the repository root for the application at port 5174. The website's `/tests/marketing-ui/` provides 390, 768, and 1200 pixel frames with real responsive layouts and native scrolling. The application's `/demo` opens the product sandbox on its own. Production domains are configured independently; see `landing/README.md`.

The interactive demo imports the production `AppLayout`, `TimesheetPage`, `TimesheetReviewPage`, and `ClientBillingPage`, including their forms, validation, selects, calendars, review tables, and invoice dialog. Do not replace these with marketing mockups. The only page props added are initial date/period values; normal application defaults are unchanged.

The dedicated `/demo` document uses a separate in-memory QueryClient and fictional session. Its Supabase client uses the reserved `demo.chronosync.invalid` URL, no persisted auth session, and a local transport. Invoice services use the same transport. Unhandled operations and all external origins fail closed. Invoice issuance is disabled by the real preview-mode UI and rejected by the transport. No production credentials, databases, provider APIs, or email services are used. The parent walkthrough accepts messages only from its iframe at the configured app origin; the app checks the configured marketing origin and parent source.

Verify the complete product journey:

1. In the demo, use **Add Entry**. Choose **Acme Studio / Brand exploration**, October 22, 2026, 2 hours, and a description. **Save Entry** creates a draft and brings the total from 22 to 24 hours.
2. In **Calendar View**, choose **Month** under **Submission period**, then **Submit 4**. The new draft and three existing drafts become submitted.
3. Open **Timesheet Review**, select all four entries, and **Approve Selected Entries**. The same 24 hours are now approved. Rejection, editing, resubmission, and filters also use the real components.
4. Open **Client Invoicing**. The billing profile and €75 hourly project price are preconfigured fictional examples. Check October 1–31 and open **Review and issue**. The actual dialog shows four entries, €1,800 net, illustrative 27% VAT, and €2,286 gross. Live issuance stays disabled.
5. **Download preview** returns a locally generated sample PDF using the current approved hours, including edits. The PDF is explicitly marked as fictional and is not a provider-issued tax invoice.
6. **Start again** remounts the sandbox and resets its data. The standalone demo offers the same three pages. Other sidebar pages show an honest scope notice.

Check the marketing journey:

- Scroll forward/backward: two clock ticks → the minute hand extends and sweeps clockwise → the sweep reveals the notebook, while the invoice shrinks into a note on its page. The decorative notebook during the sweep and the real section share the same components, so the handoff should have no position jump. Check desktop, tablet, short screens, mobile, pause, and EN/HU resizing. Features remain readable; the cover, binding, and pages then fold into the laptop. Ensure all laptop edges fit.
- Open the demo at desktop and mobile sizes, including native mobile navigation and app dialogs. Outer guidance updates after real save/submit/approval/review actions. Full demo opens separately.
- Follow header links, including a direct load of `/#demo`. Switch EN/HU. Pause animation. Reduced-motion users get static content and scene fallbacks. The floating duplicate navigation has been removed.
- Review the sample PDF/CSV downloads. They consistently show Acme Studio, four entries, 24 hours, and €1,800 net. They are illustrative output samples.
- Review draft plans and FAQs. Request access opens an explicitly local form preview while the contact destination is unset. Details are not sent or saved. `VITE_MARKETING_CONTACT_EMAIL` can later enable a reviewed email draft.
- Scroll the Sync engine forward and backward: four entry tiles pass through the approval ring into the folder; the three captions and progress line advance with the same scroll.
- Select each document in the workbench. Its paper rises to the front, and the description updates. Check the approval stamp and the role trail while scrolling.
- Watch the three pricing sculptures assemble as their cards enter. Choosing a plan carries the selection into the access form on the same page.
- Open and close every reference question with mouse and keyboard. Only the selected answer and matching 3D folder tab should be open. Subsequent scroll positions should remain correct after the accordion settles.
- Scroll into the access section and reverse: clock components converge into the ChronoSync mark. Pause and reduced motion show completed static objects; content, form fields, and downloads remain usable. Watch console context counts when scrolling the entire page repeatedly; distant new scenes should unmount.
- Existing authentication and protected routes remain available. `/app` performs the original role-based home redirect.

Run `npm test` in `landing/` for sample export consistency. In the app root, run `node --test tests/marketing-ui/*.test.mjs` for the actual transport, filtering, edits, workflow gating, dynamic PDF totals, reset, blocked external requests, origin restrictions, and protocol compatibility. Build both projects independently.

Three.js is lazy loaded; laptop rendering starts near its section and scenes pause rendering outside the viewport. The product iframe loads lazily. The laptop uses `public/marketing/app-timesheets.png`, captured from the actual app components with the same fictional project. Pricing and contact remain placeholders by request. Editable EN/HU marketing copy lives in `src/components/marketing/`.
