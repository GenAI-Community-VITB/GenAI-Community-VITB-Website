# Second security and functional review

> Current cutover status (2026-10-06): the database migration, verified backup/rollback rehearsal, real administrator provisioning and deployed admin workflow tests are complete. See [PRODUCTION_RECOVERY_STATUS.md](PRODUCTION_RECOVERY_STATUS.md). Older preflight statements below are historical; this report is not a claim that all external integrations are verified.

Local branch: `codex/admin-audit-repairs`. Reviewed 30 September–3 October 2026.

This is an additional source review and local regression pass. The production website, Supabase database, Google Drive permissions, and deployed Apps Script have not been changed. This report does not claim that every possible bug has been found.

## Confirmed issues repaired locally

| # | Finding and consequence | Repair |
| --- | --- | --- |
| 1 | Both blog synchronization routes allowed writes when CRON_SECRET was absent. Secrets in URLs also leaked into request logs. | Fail closed; authenticate with headers; update the Apps Script scheduler to use stored configuration and an Authorization header. |
| 2 | The public Drive proxy could retrieve any known file ID with server credentials, including payment proofs. | Require a reference from published/public content; explicitly deny payment files; restrict the finance preview route to payment records. |
| 3 | Uploads, including payment screenshots and backup files, were automatically granted public access. The upload relay accepted unauthenticated calls. | New uploads remain private; reject public/domain-shared parent folders; require a relay token; share relay uploads only with the configured service account. |
| 4 | Uploaded HTML/SVG or falsely labeled images could be served from the website origin. | Validate raster file signatures before storage; allow only JPEG/PNG/WebP on image routes; add no-sniff and restrictive content headers. |
| 5 | A failed fallback database write still returned upload success and cached the file in memory. Deduplication could cross private/public asset categories. | Require durable persistence before success/cache; separate deduplication by visibility, folder and content; bound fallback caches. |
| 6 | The LinkedIn importer could fetch arbitrary server-side URLs and follow redirects. | Accept only HTTPS LinkedIn post paths on the exact allowed hosts; reject credentials, custom ports and redirects. |
| 7 | Structured data embedded raw JSON in script elements. A malicious event title could close the script tag. | Escape less-than characters before embedding JSON-LD. |
| 8 | Email templates interpolated participant names, event text and messages as HTML. | Escape values inside HTML while retaining plain-text email subjects. |
| 9 | Registration parsed an unbounded multipart request before checking the screenshot size. | Bound declared and streamed body size to 12 MB; separately enforce the image limit. |
| 10 | On-spot registration never supplied CAPTCHA, was saved as online, and claimed a QR had been generated while payment was pending. | Require verified staff, event permission and same-origin requests for the on-spot path; retain actor/source metadata; display the actual pending/delivery result. Public registrations still require CAPTCHA. |
| 11 | Normalization removed the leading 91 from valid ten-digit phone numbers. | Remove the country prefix only from twelve-digit numbers, on both client and server. |
| 12 | Request limits were process-local and reset across serverless instances. | Production requests use the atomic database limiter; storage failure blocks the request. On-spot limits use the verified staff ID. |
| 13 | Online pass IDs used per-event row counts despite global uniqueness, causing collisions across events and after deletions. | Generate globally unique pass IDs inside the transaction; existing IDs stay unchanged. |
| 14 | The registration RPC could accept a stale fee or a past event still marked open. | Validate current fee and past-event state inside the locked transaction. |
| 15 | Inactive/voided profiles were still included in the public hierarchy. | Filter those profiles and their public avatar references. |
| 16 | Changing callback identities recreated CAPTCHA widgets; the already-loaded-script path skipped cleanup. Production also displayed a test widget when unconfigured. | Keep callbacks in a ref, clean up every widget/listener, and show a configuration error instead of a production test widget. |
| 17 | Operational diagnostics were exposed to scanner-level accounts. The relay's spreadsheet writer still accepted formula values. | Restrict diagnostics to technical roles and neutralize formula-leading relay cells. Remove remaining hardcoded relay/cron secrets from these paths. |
| 18 | Installed runtime dependencies had known security advisories, including critical Next.js advisories. | Upgrade Next.js and its ESLint package to 16.3.8, Nodemailer to 10.0.13, and compatible transitive dependencies. The final production audit reports zero known advisories. |

## Verification

- 20 application/security tests: passed, including real route handlers with synthetic authorization and storage mocks.
- 13 isolated PostgreSQL integration checks: passed, including fresh installation, migration reruns, cross-event registration IDs, deletion/re-registration, fee changes and past events.
- TypeScript: passed.
- Focused lint on all five new security helpers: passed.
- Production build on Next.js 16.3.8: passed, including compilation, TypeScript and all 21 static pages. The checkout has no live Supabase environment file; public-data prerender fallbacks logged the expected missing-configuration warnings.
- 17 local production HTTP checks: passed. Protected pages/APIs, payment previews, diagnostics, blog/cron writes and on-spot authentication reject unauthenticated or forged-cookie requests. The test server was stopped afterwards.
- Total: 50 passing checks (20 application/security, 13 database, 17 HTTP). `git diff --check` also passed.
- `npm audit --omit=dev`: zero known vulnerabilities reported on 3 October 2026. This is an advisory check, not proof that the application is vulnerability-free.
- Full dependency audit: five high-severity entries remain in the development-only ESLint dependency chain (`braces` and its dependents). The audit reports no compatible patched chain and proposes downgrading eslint-config-next to 14.2.35. That incompatible downgrade was not applied. Runtime dependencies are unaffected by these remaining entries.

Tests use local synthetic records; they send no emails and perform no live authenticated writes.

## Required live activation and limits

Follow `ADMIN_REPAIR_STATUS.md` for the coordinated database/Auth/Turnstile cutover. The reconciliation migration now also replaces the public registration RPC; regenerate fresh-install.sql with `npm run schema:fresh` after any migration edit.

Redeploy the updated `scripts/apps-script.js` with Script Properties `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DRIVE_RELAY_TOKEN`, and, if its blog scheduler is used, `BLOG_SYNC_URL` and `CRON_SECRET`. Match `GOOGLE_DRIVE_RELAY_TOKEN` on the website to `DRIVE_RELAY_TOKEN`. Keep these values out of the source and public environment variables. The authenticated form trigger uses the stored service key because anonymous member writes are intentionally disabled. The Google Apps Script deployment and Drive permission behavior still require verification in the configured environment.

**Previously uploaded payment proofs and backups may still have public Drive permissions.** Local code changes do not revoke those existing permissions, nor erase copies already cached by the old endpoint. Inventory the affected files, remove public/inherited sharing from those files and their folders, and purge old public asset caches during cutover. Do not remove legitimate service-account access.

New public images stored privately must be readable by the website service account. The public route intentionally declines unreferenced assets and disables caching so withdrawn content is not served by the application. Existing external links and previously downloaded copies cannot be recalled by this change.

The registration response timeout does not cancel a database transaction already in progress. The UI retains the warning to check for a completed registration before retrying. Database constraints remain the authoritative protection against duplicate submissions.

Framework release references: https://github.com/vercel/next.js/releases/tag/v16.3.8 and https://github.com/nodemailer/nodemailer/releases/tag/v10.0.13. Detailed local command output is saved under the ignored `scratch/` directory.
