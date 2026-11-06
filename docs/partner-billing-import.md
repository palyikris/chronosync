# Számlázz.hu partner billing import

Company billing admins can open **Client invoicing → Import from Számlázz.hu** (`/admin/billing`). No Agent key is required.

The wizard reads CSV, XLS and XLSX files in a browser worker, recognizes the official Hungarian partner-template headings, and lets the user adjust column mappings before reviewing matches. It accepts up to 10 MB / 5,000 rows, supports UTF-8, Windows-1250 and ISO-8859-2 CSV text, and paginates the review. The original file is not uploaded.

## Matching and preservation

Matching is limited to the current company's existing clients:

1. Exact tax or EU VAT number, ignoring formatting. Group tax IDs are not used as matching keys because several members may share one.
2. A mapped ChronoSync client code, ignoring case and surrounding whitespace.
3. Exact client or saved billing name after normalizing accents, capitalization, punctuation and whitespace. Company suffixes remain part of the name.

Contradictory signals or multiple candidates require an explicit client selection. Számlázz.hu's partner identifier is never automatically treated as a ChronoSync code. Multiple source rows assigned to one client are blocked until the user skips or reassigns the duplicates. Unmatched rows are skipped; the import never creates clients.

Only empty billing fields can be filled. Existing billing names, addresses, emails, payment terms (including zero), country and tax values are preserved. Identity conflicts block the whole row, so a conflicting country's address cannot be mixed into a saved profile. The review distinguishes incoming fills from saved values that will be kept. Invalid source fields can be excluded through column mapping.

Client names/codes, projects, prices, operational settings, invoice language, email delivery, automatic invoicing, document format and schedule are not changed. A missing billing profile can be created for an existing client, with email delivery and automation disabled by default. A country or tax conflict must be resolved in the billing editor or source data before importing that row.

## Database integration

Apply `supabase/migrations/20261106223909_import_client_billing_details.sql` **before deploying the frontend**. Existing migrations from both repositories, including the module-aware billing-admin helper, must already be present. No backend application deployment or new environment variable is needed.

Applied to the connected shared Supabase project on 2026-11-06 with migration version `20261106223909`. Verified function presence, `SECURITY INVOKER`, authenticated execution, and denied anonymous execution through both database privileges and the hosted REST endpoint (HTTP 401 / SQLSTATE 42501). Client and billing-profile counts remained 101 and 100. The local migration filename matches hosted migration history. No import was run against customer records.

The authenticated `import_client_billing_details(company_id, rows)` RPC uses `SECURITY INVOKER`, existing RLS, and `private.current_billing_admin_company_id()`. It accepts only a bounded list of billing fields for existing clients in that company. It rechecks current values under a row lock before filling gaps, including the race where a regular save creates a previously missing profile. Replays do not replace values or bump `updated_at` for unchanged profiles.

Requests contain batches of 25 rows. Each row has its own savepoint, so invalid data does not discard valid rows in the same batch. The UI reports measured batch progress and actual updated/unchanged/failed outcomes. A request-level failure stops later requests; remaining items can be reviewed and retried safely. Closing is disabled during saving, and tab closure prompts the browser's standard unsaved-work check.

After saving, the import reloads profiles and invalidates the billing page's query cache, clearing outdated invoice reviews. Opening the wizard is disabled while the billing form has unsaved edits. Client/profile fetches are paginated so matching and the refreshed page are not silently limited by the Data API row cap. The guided marketing demo does not expose this import action.

## Validation

- `node --test --test-isolation=none tests/*.test.mjs`: unit regressions, including matching, ambiguity, duplicates, tenant filtering and preservation.
- `npm run build` and ESLint on changed source files.
- `PARTNER_IMPORT_TEST_PG_DSN='host=/tmp/chronosync-partner-import port=55446 dbname=partner_import' node --test tests/partnerBillingImportDatabase.test.mjs`: nine real PostgreSQL checks, including concurrent saves, idempotence, module/role access, malformed input, per-row rollback and preservation. This suite destroys its fixture schema and explicitly refuses other database names/socket locations. It requires a dedicated local database.
- `node tests/partner-import-ui/smoke.mjs`: English/Hungarian at 1280 px and 390 px, real worker parsing of XLS/XLSX/CSV, empty templates, column mapping, manual matches, preservation preview, disabled dismissal during saving, failure/retry, automatic parent-page refresh, repeat imports, and 30-row batch progress. Set `PLAYWRIGHT_MODULE_PATH`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, and `PARTNER_IMPORT_UI_BASE_URL` as needed. All external HTTP requests are intercepted; only fictional records are used.
- Supabase security advisor against the isolated fixture: no issues after applying tenant RLS.

The public Számlázz.hu partner template was inspected to verify header recognition. An authenticated import was also completed through the local frontend against the existing **Test Inc** mock company, using `tests/fixtures/szamlazz-partners-mock.csv` and the hosted database. Two existing mock clients gained missing details; stored values, all client records and pricing were preserved. The unmatched partner created no client, repeat import offered zero changes, and the billing page refreshed and retained the values after reload. See the [manual test report](partner-billing-import-live-2026-11-06.md).

A real customer's export and the deployed frontend have not been exercised. No production customer records, provider accounts, invoice issuance or email delivery were changed.
