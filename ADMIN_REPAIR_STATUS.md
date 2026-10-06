# Admin repairs — implementation and cutover record

> Current cutover status (2026-10-06): the database migration, verified backup/rollback rehearsal, real administrator provisioning and deployed admin workflow tests are complete. See [PRODUCTION_RECOVERY_STATUS.md](PRODUCTION_RECOVERY_STATUS.md). Older preflight statements below are historical; this report is not a claim that all external integrations are verified.

Branch: `codex/admin-audit-repairs`.

A second review found additional security and registration defects. See [SECOND_SECURITY_AUDIT.md](SECOND_SECURITY_AUDIT.md) for the newer fixes, dependency audit, verification results, and additional Drive/Apps Script cutover requirements. The first-pass verification counts below are retained as historical results.

The application changes are local. No production database migration, deployment, password rotation, email broadcast, or live participant mutation has been performed.

## Production cutover request — 2026-10-04

Update 2026-10-05: production Turnstile keys have been configured. Database changes and deployment are still pending a complete backup and tested recovery path. See [PRODUCTION_RECOVERY_STATUS.md](PRODUCTION_RECOVERY_STATUS.md) for saved supplementary exports, their limits, and the scoped function-permission repair. The remaining bullets in this section describe the earlier preflight.

The owner has now authorized production deployment and the necessary database changes, superseding the earlier staging-only plan. Cutover is pending access and configuration, not further deployment approval.

- A fresh read-only production check confirms the required authentication, staff, import, and attendance RPCs are still absent.
- The intended administrator email has neither a Supabase Auth user nor a matching profile. Real administrator provisioning must accompany cutover.
- Vercel's production environment has neither Turnstile key. Both real keys must be configured for login and registration to work.
- The supplied Vercel token reads the project API successfully; CLI project inspection fails with a user-lookup 404. An API deployment may be needed.
- Supabase management/database credentials are not available. The dashboard was opened in Edge and requires the owner to sign in before SQL migration access is possible.
- The current Vercel production deployment remains READY. No production mutation has been made during this preflight.

After access is available: verify a backup and the current schema, apply reconciliation, provision and verify real admin authentication, configure the missing production keys, then deploy and check the live workflows. Plaintext credential retirement remains a separate step after real login is verified.

## Implemented changes

| Original audit findings | Repair |
| --- | --- |
| 01–03, 11–13, 20 | Verified Supabase Auth sessions; deny missing/inactive/disabled profiles; shared exact role policy; guarded server actions; real administrator provisioning; protected executive targets. |
| 04, 06, 08–10 | Reconciliation migration adds missing columns/tables/RPCs, removes unsafe policies and browser mutation grants, and revokes PUBLIC function execution. A generated fresh-install script uses the same reconciliation. |
| 05, 31, 33–34, 38–40 | Transactional payment review, attendance, archive and restore. Payment identity checked; duplicate check-ins rejected; QR and attendance preserved on repeat approval; revocation removes successful scan state; restoration retains payment and scan history. |
| 07, 14–19 | Staff pickers use profile IDs; creation returns the real Auth ID; profile/role changes are transactional; Auth errors are checked; enabling access never invents a technical role. Event assignment permits scoped scanner access. Passwords stay in Auth; only newly generated passwords appear temporarily in the initiating UI session. Access emails direct members to password recovery. |
| 21–22, 43 | Campus-local time inputs convert consistently to UTC; event windows validated; explicit event selection added to finance/settings; unknown event URLs no longer resolve to another event. |
| 23–30 | CSV parser handles quoted fields/newlines/BOM and its own UTR template. Invalid/missing identities are reported rather than fabricated. Payment status is preserved. Each row saves registration and payment atomically; delivery occurs only after persistence. Reimport preserves checked-in state and generates QR on approval. UI batches large imports. |
| 32 | Both QR lookup and check-in enforce the scanner's event assignment; technical/executive permissions are evaluated consistently. |
| 35–37 | CSV and event-spreadsheet exports paginate; finance can export; synchronization retries remain tech-only. CSV formulas are neutralized and Google Sheets writes use RAW values. |
| 41–42 | Durable, HMAC-hashed reset codes, atomic claims/attempt counters, checked Auth updates, persistent login/reset limits and production Turnstile enforcement. Test tokens are development-only. Login notification work runs after the response. |
| 44–45 | Upload errors are surfaced; staff/dashboard database errors are not represented as successful empty results; blog memory-success fallback removed; blog counts come from the database. Dashboard editing permissions use role capabilities rather than display labels. |
| 46 | Unconfigured email providers fail honestly. SMTP fallback is available when the relay is absent or explicitly rejects delivery. Retries retain actual content/attachments and rebuild current QR passes; OTP mail is never replayed. Payment and import delivery failures are reported. |
| 47 | Literal diagnostic assertions are warnings, not fabricated PASS results. Dedicated application and PostgreSQL regression tests now verify critical behaviors. |

Some write paths span Supabase Auth and the application database, which cannot share a transaction. They report partial failures explicitly; creation attempts compensate by removing an unprovisioned Auth account. A failed password update never reports a completed reset.

## Verification

- `npm run test:admin`: 8 application tests and 11 isolated PostgreSQL integration checks passed.
- Tests cover cookie bypass rejection, disabled-profile rejection, role boundaries, the real login challenge field, template UTR round-trip, CSV quoting/formula safety, campus times, 1,203-row export, transactional rollback, QR stability, archive restore including a restore conflict, duplicate attendance, OTP attempts/replay, and database privileges.
- Fresh install and repeated reconciliation were executed against a local PGlite PostgreSQL instance. Tests use synthetic records; they do not connect to production.
- Focused ESLint on the new authentication/recovery/CSV/time modules passed.
- TypeScript and the final production build passed.
- `node scripts/test-admin-http.mjs`: 9 local production HTTP checks passed. The login page renders; four protected pages and four APIs reject forged legacy login cookies. No authenticated writes or email deliveries were attempted.
- `git diff --check` passed.

This does not certify live delivery, live Supabase Auth login, production migration compatibility with undocumented schema changes, or browser-level completion of every admin workflow. Those require the configured staging/production environment. The local build has no Supabase environment file and logs missing configuration during public-data prerender fallbacks.

## Live cutover — not executed

1. Take and verify a database backup. Retain the old deployment for recovery, but do not restore its unsafe authentication paths as a long-term solution.
2. Configure real `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` and `CLOUDFLARE_TURNSTILE_SECRET_KEY` for the site hostname. The supplied environment did not include these. Configure the relay token or Gmail app-password transport. Do not copy example placeholders into production.
3. In a maintenance window, apply `supabase/migrations/20260930_admin_reconciliation.sql` using Supabase SQL Editor or a privileged migration connection. Do not replay the legacy seed/prune migrations.
4. Run `npm run bootstrap:admin` in a trusted process with the Supabase URL/service-role key and `ADMIN_BOOTSTRAP_EMAIL` / a **new** `ADMIN_BOOTSTRAP_PASSWORD` of at least 16 characters. The script provisions a real Auth UUID and superadmin profile without printing or storing its password. Remove the bootstrap variables afterwards. If an existing profile has the same email under another ID, stop and reconcile that identity explicitly; do not delete it blindly.
5. Deploy this branch with the reviewed environment. Confirm administrator login, sign-out, access revocation, event creation/editing, import with pending/rejected/verified rows, export, assignment-scoped scanning, and password recovery. Use designated test accounts/records and explicit test-email recipients.
6. After real Auth login is verified, apply `supabase/migrations/20260930_retire_plaintext_credentials.sql`. It removes the old profile password columns and legacy reset notes containing passwords. Rotate previously shared/reused credentials and retire legacy credential-distribution scripts.
7. Check existing staff Auth/profile mappings before enabling accounts. Existing manually disabled accounts are preserved by policy enforcement; access instructions and recovery require an enabled account.

For a **new empty Supabase project**, run `npm run schema:fresh` and execute `supabase/fresh-install.sql`. Do not execute `supabase/schema.sql` alone: it is the legacy base consumed by the generator. Fresh install already excludes plaintext credential columns.

## Remaining operational limits

- Delivery after a network timeout is ambiguous. Automatic transport fallback is deliberately limited to unconfigured/explicitly rejected relay requests to avoid duplicate mail; the admin retry controls remain available.
- Old archives without a complete snapshot fail restoration visibly. The new code cannot reconstruct data that was lost before these repairs.
- Supabase Auth passwords cannot be read back. The admin UI shows a password only when newly generated in that browser session; access instructions use password recovery.
- Legacy standalone diagnostic checks are informational warnings where no functional probe exists; they are not a deployment approval signal.

## Final build

`npm run build` completed successfully, including compilation, TypeScript checking, page generation, and route output. The resulting production server passed all 9 local HTTP smoke checks and was stopped after testing. Build output is saved locally in `scratch/build-final-confirmed.txt`.
