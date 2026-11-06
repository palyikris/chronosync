# Manual mock-company import verification — 2026-11-06

Completed through the actual local app at `http://127.0.0.1:5174/admin/billing`, signed in as the existing **Test Inc** company admin. The app used its configured hosted Supabase database. Import requests were not intercepted, and writes were performed only through the import wizard.

## File and review

Used the synthetic UTF-8 CSV [`tests/fixtures/szamlazz-partners-mock.csv`](../tests/fixtures/szamlazz-partners-mock.csv), containing four partners and official Hungarian column headings.

1. Uploaded the file using the file chooser. The wizard recognized four partners and mapped the billing columns. The provider partner identifier remained ignored as a client code.
2. **MyTest Company (MTC)** matched automatically by name. Its six missing fields were ready to fill; its saved billing name, country, transfer payment method and eight-day payment term were kept despite different source payment values.
3. The deliberately renamed **Testing Kft (TES)** row required manual selection of the existing client. The same six missing fields were ready to fill, while its saved name and settings were preserved.
4. **DunaPart Digital Kft. (teszt) (QD1)** required manual selection because the existing mock dataset has ambiguous tax-number matches. Its complete profile was shown as already filled. The preview kept its address, email, transfer payment method and 15-day payment term despite deliberately different source values.
5. Left the unknown partner unmatched. The review showed **2 ready, 1 requiring attention, 1 unchanged**.

## Import and persisted results

Clicked **Fill details for 2 clients**, observed the saving state, then the completion screen reported **2 updated, 0 unchanged, 0 failed**.

Read-only verification scoped to Test Inc confirmed:

| Check | Result |
| --- | --- |
| MTC imported postal code/city/address | `1054` / `Budapest` / `Mock Import utca 6.` |
| TES imported postal code/city/address | `6720` / `Szeged` / `Minta utca 22.` |
| Both imported tax status, mock tax number and `.invalid` email | Exact expected values |
| All other fields on both updated profiles | Unchanged, verified by hashes excluding only the six imported fields and `updated_at` |
| QD1 entire billing profile | Unchanged, including `updated_at`, verified by full-record hash |
| Existing client records and project pricing | Unchanged, verified by company-scoped hashes |
| Client count | Remained 22 |
| Unknown partner | No client created |
| Email delivery and automatic invoicing | Remained disabled for the checked profiles |

Returning to billing immediately showed both updated clients as **Ready**. The selected MTC editor contained the imported address and retained its eight-day payment term. Reloading the page retained these values.

Uploaded the same file again and advanced to review: MTC and TES were **Already filled**, with **0 ready** and the import button disabled. TES now matched by its imported tax number despite the source alias. The ambiguous and unknown rows continued to require an explicit choice. Closed without additional writes.

No invoice was issued or emailed, and no provider API key or configuration was changed. These are synthetic records in the existing mock company; no real customer export was used.

## Automated checks

The unit regression suite, nine isolated PostgreSQL integration checks, English/Hungarian desktop/mobile browser smoke tests (including failure/retry and 30-row batch progress), production build and targeted ESLint checks passed. The manual run above additionally verifies the authenticated, non-intercepted UI-to-database path.
