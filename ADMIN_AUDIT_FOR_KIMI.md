# GenAI website: audit and repair handoff

Date: 29 September 2026. Audited checkout: `764e17caecd57bb93e5ef2f4359d3eb64a53180e`.

**Audit only. No application code, database records, credentials, or deployments were changed.** This report is for the separately running repair agent. Credentials supplied by the owner are intentionally omitted.

## Evidence and limits

- Reviewed admin actions, components, authentication, registration/import/export/check-in logic, email paths, database schema/migrations, and recent Git changes.
- Read the supplied handover material as historical reference, not instructions to execute its repair prompts. The attached gitignore is identical to the repository version.
- The Antigravity screenshot identifies commit `764e17c`. Reviewed that patch and the preceding `6611633`, `91e078b`, and `05e945b` work. The remaining native Antigravity chat was not accessible; no claim is made to have read it.
- Used the supplied environment file in memory for **read-only** Supabase requests: schema metadata, zero-row column/join queries, counts, root-user existence, and a CSV-generation check. Did not copy that file into the repository or print its contents into this report.
- Database observations apply to the project in that environment file. Its equivalence to every deployed website environment is not established.
- Executed isolated tests of real source functions with mocked auth/database/email dependencies. These tests sent no real emails and performed no real writes.
- Did not perform destructive UI tests, log in through a flow that sends security emails, create events, import real people, change passwords, or invoke mutation RPCs.
- This is a broad audit, not a guarantee that every possible defect has been found. Browser-specific download behavior and deployment-specific failures remain explicitly unverified.

Severity: **P0** = authorization bypass or immediate data-loss risk; **P1** = broken important workflow/security control; **P2** = correctness, reliability, or scale issue. Evidence labels: **Live** = observed on connected database; **Tested** = isolated execution; **Code** = directly traced implementation; **Conditional** = depends on deploying a supplied SQL policy or encountering the described condition.

## Start here

1. Close authentication and unguarded server-action bypasses (01–04). Do not rely on hiding buttons.
2. Stop deletion after failed archival (05) before allowing participant removal.
3. Reconcile the actual database schema with application requirements (06–10), reviewing migrations before applying them. Several existing migrations contain permissive policies or invalid columns; blindly running every SQL file is unsafe and may also change account data.
4. Repair root identity and permission handling, staff editing, credential delivery, and volunteer assignment (11–20).
5. Repair event time handling, then imports and attendance (21–34).
6. Verify export through the actual user's browser/session. The data-layer export worked in this audit; preserve that working behavior.

## Live database evidence

Queries selected zero rows unless otherwise stated. Counts observed: 1 event, 160 registrations, 50 user profiles. The correct profile join `id,roles:member_roles(*)` and the export join both succeeded.

| Area | Confirmed missing in connected database | Effect |
| --- | --- | --- |
| `events` | `allowed_degrees`, `allowed_branches`, `is_spotlight`, `spotlight_message`, `spotlight_priority`, `google_form_url` | Eligibility, spotlight, and form-link saves cannot persist these settings. |
| `user_profiles` | `login_disabled_at`, `login_disabled_reason`, `github_url`, `initial_password`, scalar `roles` | Enable/disable, profile changes, and credential-email queries fail. `password`, `is_login_disabled`, `is_voided`, and `assigned_to_name` do exist. |
| `registrations` | `academic_year`, `registration_source`, `checked_in_at`, `checked_in_by` | Several registration/attendance/restore paths do not match the live table. |
| `checkins` | `scanner_role` | Correct live column is `scanned_by_role`. |
| Tables | `event_volunteers`, `event_statistics`, `deleted_registrations`, `password_reset_otps` | Assignment/archival/OTP paths lack storage; statistics have a computed fallback. |
| Email logs | `attempt_count` and the expanded provider/attempt/failure fields absent from advertised schema | Current email inserts/metrics expect the upgraded schema. |
| RPC exposure | `confirm_attendance_action`, `archive_and_clear_event` absent from REST schema | Attendance uses direct fallback; complete-and-archive cannot use its required RPC. |

The synthetic root UUID has **no profile row** and the Auth admin lookup returns **404**. Live event start/end columns are `timestamp with time zone`; check-in IDs are UUIDs and `scanned_by` is required.

## Findings

### 01 — P0: unsigned cookies authenticate arbitrary users

**Tested / Code:** `lib/auth/permissions.ts:431–498` and `:503–532`. `getAuthenticatedStaff()` accepts `club_admin_email` as identity when Supabase Auth has no user. A matching active profile is returned without password/session verification; an unknown email produces a synthesized president. `club_admin_session=1` alone produces root superadmin. HttpOnly is not signature verification. Isolated tests obtained finance, president, and superadmin identities with no authenticated user.

**Repair target / acceptance:** Trust a verified server session only. Missing/invalid/forged cookies must return unauthenticated. Test every action/API with no Supabase user, including email-only and flag-only cookies.

### 02 — P0: absent/inactive profiles fail open into president privileges

**Code:** `lib/auth/permissions.ts:453–498`. The profile query filters `is_active=true`; an inactive profile therefore falls into the same missing-profile branch as an unknown account. Query errors are also ignored. That branch defaults the role to president and returns `isTop6:true`, potentially defeating account disablement and promoting ordinary Auth accounts without profiles.

**Acceptance:** Inactive, missing, errored, disabled, and voided profiles all deny access; metadata must not mint privileged roles.

### 03 — P0: public server actions perform service-role writes without authorization

**Code:** `app/admin/actions.ts:436`, `:499`, `:619`, `:786`, `:817`, and `deleteTeam`; `app/admin/blog-actions.ts:25`, `:52`, `:84`, `:210`, `:235`; `app/admin/events-actions.ts:1482`. Member/event/team CRUD and blog read/write/AI actions lack a server-side staff check. The staff-list action also lacks authentication. These are exported from `"use server"` modules and use the service-role client; page protection and UI visibility do not protect their endpoints.

**Acceptance:** Every exported privileged action independently authenticates and authorizes before upload, AI use, query, or write. Project/achievement/winner actions that check only the existence of a user also need the intended role checks.

### 04 — P0: supplied SQL grants sensitive privileges to anonymous callers

**Conditional / Code:** `supabase/migrations/20260913_master_upgrade.sql:24–25,58,79–80`; `20260914_achievements.sql:25`; `20260915_otp_password_resets.sql:20–25`; `20260918_email_logs.sql:94`; `supabase/schema.sql:1000–1004`. Policies named “staff” or “service role” use unconditional `USING(true)` without restricting roles. OTP policy also has `WITH CHECK(true)`. Broad function grants expose security-definer mutation functions, whose actor/role inputs are caller supplied.

**Impact:** Applying these policies as written can permit anonymous role/OTP/log/archive modification and direct RPC bypass of application checks. The live anonymous read-only check found member-role rows accessible, but anonymous writes were deliberately not attempted. Some affected tables are currently missing, so do not call all of this a reproduced live exploit.

**Acceptance:** Restrict policies and function execution to intended identities; validate authorization inside privileged RPCs. Test anonymously and with low-privilege users in staging before deployment.

### 05 — P0: deletion continues after archive failure, losing recoverable data

**Live / Code:** `lib/data/registrations.ts:1296–1360`. Archive insert failure is only logged, then check-ins, payments, and registration are deleted. Delete errors are also ignored, and success is returned. The connected `deleted_registrations` table is missing, so the archive step currently fails.

**Acceptance:** Archive plus deletion must be transactional or fail safely before deletion. Inject archive failure and prove all active records remain. Do not test by deleting real participants.

### 06 — P1: staff enable/disable and profile writes reference missing live columns

**Live / Code:** `app/admin/events-actions.ts:486–500,569–585,627–640`; new-user payload `:375–393`. Enable and disable write `login_disabled_at`/`login_disabled_reason`, which do not exist. GitHub writes/new-profile creation use missing `github_url`. These produce database errors, not just UI problems.

**Acceptance:** Establish the intended schema, migrate deliberately, then test enable, disable, GitHub edit, new staff, and reload. Do not merely swallow missing-column errors.

### 07 — P1: credential emails fail on a nonexistent scalar roles column

**Live / Code:** `app/admin/events-actions.ts:1552,1677`. Both single-send and broadcast select `roles` from `user_profiles`. Roles are a relation and require `roles:member_roles(*)`; the correct join succeeds, scalar selection returns PostgreSQL `42703`.

**Acceptance:** Both queries return real profiles and role assignments. Verify mail preparation with a fake transport before sending any actual credentials.

### 08 — P1: live event saves silently discard eligibility and spotlight settings

**Live / Code:** `app/admin/actions.ts:706–750`. The retry loop removes missing columns and can return success. With the live schema, this discards `allowed_degrees`, spotlight fields, and `google_form_url`. The public registration validator then defaults missing degree restrictions to both degrees.

**Acceptance:** Selecting M.Tech-only must survive save/reload and reject B.Tech registration. Spotlight/form links must persist, or the UI must explicitly report unavailable features. Six attempts also cannot accommodate an arbitrary number of missing columns.

### 09 — P1: archive, volunteer, OTP, and email infrastructure is out of sync

**Live / Code:** `lib/data/registrations.ts:1505–1522`; `app/admin/events-actions.ts:1168–1176,1204–1215`; `lib/data/password-resets.ts:48–185`; `lib/email/service.ts:159–194,225–264`. The missing tables/RPCs listed above block archive and assignment. OTP falls back to process memory, so request and verification can land on different server instances. Email-log inserts expect missing columns and silently ignore returned errors; statistics also select missing `attempt_count` and can appear empty.

**Acceptance:** Verify tables, columns, RPCs, constraints, policies, and schema cache together. Prove OTP works across instances, email failures are logged, and archive/assignment no longer depend on missing infrastructure.

### 10 — P1: repository migrations cannot recreate the schema the code expects

**Code / Live:** `supabase/schema.sql:785–795` creates `initial_password`, whereas actions use `password`; no supplied migration creates the latter. The live DB has `password` but not `initial_password`, demonstrating out-of-band schema changes. `20260921_duplicate_checkin_protection.sql:59,96–97,110` references `checked_in_at`, `checked_in_by`, and `scanner_role`, but the supplied SQL does not create the first two and the real check-in column is `scanned_by_role`.

**Acceptance:** A fresh database built from versioned migrations must support every current query. Repair migration content/order, not only the live database. Preserve existing account/participant data.

### 11 — P1: synthetic root identity cannot satisfy real Auth foreign keys

**Live / Code:** `lib/auth/permissions.ts:503–532`; `lib/data/registrations.ts:615,703,1184–1188`; `app/admin/events-actions.ts:1208`; `supabase/schema.sql:256,278,298`. Root uses a made-up UUID absent from `auth.users`. Payment review, check-in attribution, volunteer assignment, and audit inserts reference real Auth users. UUID syntax checking is insufficient: a syntactically valid nonexistent UUID still violates the foreign key.

**Acceptance:** Use a real authenticated administrative identity and preserve valid actor attribution. Verify finance approval, scanner confirmation, and audit records under that identity.

### 12 — P1: root is not recognized as a supreme executive

**Tested / Code:** `lib/auth/permissions.ts:69–119`; `app/admin/events-actions.ts:252–269`; `app/admin/users/page.tsx:22`. `isSupremeExecutive('superadmin', rootRoles, rootEmail)` returns false. Thus root can open user management but cannot edit users classified as executive.

**Acceptance:** Define root's intended rights consistently; test the provided root workflow without relying on personal-email substring exceptions.

### 13 — P1: ordinary technical/AIML members become protected top executives

**Tested / Code:** `lib/auth/permissions.ts:33–51`. Team substrings `tech`, `aiml`, `lead`, `panel`, or any `co-lead` position qualify for Top-6. A `volunteer` with `{team:'technical',position:'core_member'}` returns true. This grants broad powers and makes normal members undeactivatable via executive protection guards.

**Acceptance:** Match explicit executive roles/assignments; ordinary technical, AIML, and panel members retain only intended permissions.

### 14 — P1: volunteer provisioning conflicts with the login whitelist

**Tested / Code:** `app/admin/events-actions.ts:1188–1254`; `lib/auth/permissions.ts:158–296`; `app/admin/actions.ts:302–306,370–374`. Assigning a gate volunteer enables an account and generates credentials, but a volunteer/event-management member still fails `isTeamLoginAllowed`. Assignment also fails to clear legacy `is_voided`, which login rejects.

**Acceptance:** Assigned eligible volunteers can actually log in and scan only their assigned events; revoked/voided users cannot.

### 15 — P1: volunteer picker supplies member IDs where profile IDs are required

**Code:** `app/admin/events-actions.ts:1518–1527` synthesizes choices using `members.id`. `assignEventVolunteerAction():1204–1223` uses the chosen ID as `event_volunteers.user_id` and looks it up in `user_profiles`. Public members are not necessarily provisioned Auth/profile users.

**Acceptance:** Resolve or provision a valid linked account before assignment. Do not manufacture login emails or pass a public-member UUID as an Auth user UUID.

### 16 — P1: newly created staff use a fake client ID until reload

**Code:** `components/admin/user-management.tsx:491–504`; `app/admin/events-actions.ts:455`. The server returns success/email but no actual new ID. The UI inserts `new-<timestamp>` into the staff list, then edit/reset/enable/send actions receive this invalid UUID.

**Acceptance:** Return the persisted profile and use its ID, or refresh from the server. Create then immediately edit/reset/send credentials must work without a manual reload.

### 17 — P1: staff edits can succeed while Auth/roles remain stale

**Code:** `app/admin/events-actions.ts:317–334,552–563`. Role replacement deletes existing assignments before inserting new ones without checking either result. Auth password synchronization results are ignored. Enablement's create-user path ignores the returned Auth ID and most errors; successful creation can leave the profile attached to a different ID.

**Acceptance:** Check all SDK result errors, preserve existing roles on failure, and keep Auth/profile IDs and passwords consistent. Failures must not be reported as successful provisioning.

### 18 — P1: enabling a roleless member invents a technical-team role

**Code:** `app/admin/events-actions.ts:587–594`, combined with finding 13. Enabling any account without assignments inserts `technical/core_member`; current permission matching then grants Top-6 power.

**Acceptance:** Enabling login must not change team membership or elevate privileges. Require explicit legitimate role assignment.

### 19 — P1: plaintext password storage and source fallback credentials remain

**Code / Live schema:** `app/admin/actions.ts:36–37,173–190,377–383`; `app/admin/events-actions.ts:304–305,383,1055–1061`; `app/admin/users/page.tsx:17–20,61–62`. A literal root password remains in source, including a second fallback inside the helper. Staff passwords are stored in a readable profile column, queried with `*`, and serialized to the client management component. The live password column also advertises a shared default.

**Acceptance:** Remove reusable plaintext credentials/defaults and the password-comparison fallback; use proper Auth sessions and reset/invitation flows. Rotate the exposed root credential as part of the eventual repair. Do not repeat secrets in logs, patches, reports, or prompts.

### 20 — P1: lower-level tech staff can reset protected executives' passwords

**Code:** `app/admin/events-actions.ts:1040–1053`. The reset action accepts any target UUID after `requireStaffRole('tech')`; it does not apply the supreme-executive protection used by profile editing. An ordinary tech account can therefore bypass the intended protection by resetting an executive's password.

**Acceptance:** Enforce target-aware permission checks on password reset, login enablement, role editing, and every related action; test a nonexecutive tech actor targeting the president.

### 21 — P1: event creation accepts time-only strings for timestamp columns

**Live schema / Code:** `components/admin/events-manager.tsx:751–770` suggests `09:30 AM`/`05:30 PM`; `:242–243` submits those strings unchanged; `app/admin/actions.ts:660–661` passes them to timestamptz columns. These values do not contain the required calendar date and fail database conversion.

**Acceptance:** A new event with the form's suggested daily times saves correctly with an explicit date/timezone. Validate before upload/write and show actionable field errors.

### 22 — P2: event dates/deadlines have inconsistent timezone conversion

**Code:** `components/admin/events-manager.tsx:237,241` sends raw `datetime-local` strings without an offset; its edit helper converts saved timestamps back to local time. The separate `event-settings-form.tsx:75–76` uses ISO conversion. With a UTC database/session, a time entered in India shifts by 5½ hours on interpretation/display.

**Acceptance:** Use one timezone convention across both editors; round-trip a known IST date/time unchanged, including deadline enforcement.

### 23 — P1: importer loses UTRs from its own sample CSV

**Tested / Code:** `components/admin/participant-importer-modal.tsx:57–58,136–146,217`. Sample header `Transaction ID (UTR)` normalizes to `transaction_id__utr_`, but aliases omit that key. The server then invents a transaction ID. The isolated parser test confirmed the supplied UTR becomes undefined.

**Acceptance:** Download template, fill it, import, and verify the exact UTR appears in the database/export. Also handle quoted headers, escaped quotes, and multiline CSV cells correctly; the current line-based parser does not.

### 24 — P1: payment failures are counted as successful imports

**Tested / Code:** `lib/data/registrations.ts:1942–1951,1963–1966,1991–2001`. Supabase resolves ordinary SQL errors in `{error}`; wrapping `await insert()` in `try/catch` does not check that result. A mocked failed payment insert returned `{success:true, importedCount:1}`. The missing-payment repair insert also omits required `drive_file_*` values (`:1997`; schema `:249–252`).

**Acceptance:** Registration/payment state is atomic or explicitly reconciled, every result is checked, and the success count includes only complete accepted rows.

### 25 — P1: QR emails are queued before successful registration persistence

**Tested / Code:** `lib/data/registrations.ts:1921–1929,1957–1961,2004–2047`. Email targets are collected before insertion and not removed when inserts fail. With all registration writes failing, isolated execution returned zero imports but invoked the fake email sender once.

**Acceptance:** Only committed eligible registrations receive QR passes; failed rows produce row-level errors and no email attempt.

### 26 — P1: rejected/unknown CSV statuses are silently approved

**Tested / Code:** `lib/data/registrations.ts:1840`. Only exact lowercase `pending` is pending; `rejected`, `cancelled`, `Pending`, and unknown strings become verified. Isolated execution confirmed `rejected` is saved as `verified`.

**Acceptance:** Normalize and explicitly validate supported statuses; never convert a rejection/unknown value into payment approval.

### 27 — P1: re-import can overwrite another attendee or undo attendance

**Code:** `lib/data/registrations.ts:1803,1844–1867`. Missing VIT IDs are fabricated from row index (`24BCE10000`, etc.), recurring on each upload. A later unrelated CSV can match an earlier generated ID and update that attendee. Existing rows are also unconditionally reset to pending/verified, losing `checked_in` state and overwriting payment transaction fields.

**Acceptance:** Reject missing/ambiguous identity instead of inventing student IDs. Require deliberate reconciliation for conflicting matches; preserve attendance and verified payment history on ordinary re-import.

### 28 — P1: re-importing pending users does not create their QR passes

**Code:** `lib/data/registrations.ts:1849–1869`. Existing registrations promoted to verified only receive status/contact updates; the update path does not generate `qr_token`/`qr_generated_at` or enqueue their emails. A previously pending registration with no QR remains without one despite the modal claiming QR generation.

**Acceptance:** Test pending-to-approved re-import with email enabled and verify a valid persisted pass and delivery outcome.

### 29 — P2: importer corrupts valid Indian phone numbers

**Tested / Code:** `lib/data/registrations.ts:1834`. Unconditional removal of leading `91` strips digits from valid ten-digit numbers starting with 91. Example isolated input `9198765432` becomes eight digits `98765432`. Missing/invalid numbers are then replaced with a hardcoded unrelated number.

**Acceptance:** Remove country code only for the appropriate length/format, validate the ten-digit number, and report missing data rather than fabricating contact details.

### 30 — P2: missing personal-email handling invents delivery addresses

**Code:** `lib/data/registrations.ts:1789,1816–1817`. When `personalEmail` is absent, generic non-Gmail `email` values are discarded in favor of an invented registration-number campus address. The UI/server also synthesize college addresses from names. Successful email dispatch can therefore target an address never supplied by the participant.

**Acceptance:** Preserve validated provided addresses; ask for missing required fields. Never invent a deliverable email address from a student ID/name.

### 31 — P1: direct attendance fallback skips payment checks and is nontransactional

**Live / Code:** `lib/data/registrations.ts:1088–1217`. The RPC is absent live, so this fallback is material. It checks duplicate status but does not require verified payment before setting `checked_in`. The API allows confirmation directly by registration ID (`app/api/checkin/scan/route.ts:54–86`), without binding it to a prior QR verification. It updates registration before inserting check-in, so insert failure leaves a participant marked present with no check-in record.

**Acceptance:** Validate payment/event/assignment at confirmation time and commit attendance atomically. Simulated check-in insert failure must not change registration status.

### 32 — P1: scanner does not enforce event-volunteer assignments

**Code:** `app/api/checkin/scan/route.ts:12–86`. It checks general staff role but never calls `isAssignedEventVolunteer` for verify or confirm. The helper itself also fails open on exceptions (`lib/auth/permissions.ts`, final catch).

**Acceptance:** An assigned volunteer can scan only authorized events; unassigned/revoked volunteers are denied even when posting directly to the API.

### 33 — P1: manual attendance override still contains the errors fixed elsewhere

**Live / Code:** `lib/data/registrations.ts:2119–2146`. It writes nonexistent live `checked_in_at`/`checked_in_by`. After those are migrated, check-in insert still supplies `checkin-ovr-<timestamp>` to a UUID column and uses nonexistent `scanner_role`. Its insert error is ignored. The normal fallback fixes did not cover this separate override path.

**Acceptance:** Override persists a valid check-in and actor, reports any failure, and does not claim success after an invalid insert. Test override separately from normal scan.

### 34 — P2: marking someone absent leaves a successful check-in behind

**Code:** `lib/data/registrations.ts:2114–2147,2313–2317`. An override to a non-checked-in status updates registration but does not reconcile previous approved/overridden check-ins. Export marks present if either registration or a check-in says present. Thus an absence correction can still export “Present.”

**Acceptance:** Preserve audit history while recording an authoritative current attendance state; absence corrections must agree across scanner, counts, and export.

### 35 — P2: exports and import deduplication do not paginate

**Code:** `lib/data/registrations.ts:1729–1732,2238–2242,2247–2251`; dashboard counts `app/admin/page.tsx:40–54`. These assume an unbounded select retrieves every row. At the configured REST row cap, exports omit later participants, counts underreport, and import deduplication misses existing rows. The current dataset has 160 registrations, so truncation was not reproduced live.

**Acceptance:** Test an event larger than the configured API cap. Retrieve all rows with stable pagination or use appropriate database aggregation/export.

### 36 — P2: export access does not match the advertised finance permission

**Code:** `lib/auth/permissions.ts` grants finance `export_data`; `app/admin/events-actions.ts:1473–1476` requires tech. A finance user allowed by the granular permission helper cannot call the CSV export action. The handbook's claimed GET CSV route is also stale: `app/api/admin/export/route.ts` implements POST Google Sheets/retry actions, while the UI uses a server action.

**Acceptance:** Use one permission rule across UI/action/API. Verify finance and root download paths in the actual browser. Do not replace the working CSV generator based only on the reported symptom.

### 37 — P2: exported cells can execute spreadsheet formulas

**Code:** `lib/data/registrations.ts:2346–2364`. Quoting/doubling quotes is CSV escaping, but does not neutralize spreadsheet formula prefixes in names and other user-controlled fields.

**Acceptance:** Export test values beginning with formula characters safely as literal data in the intended spreadsheet applications, preserving normal UTR/registration strings.

### 38 — P1: archive restore drops payment/QR/check-in information

**Code:** `lib/data/registrations.ts:1383–1440`. Restoration omits the QR token and check-in history. It attempts payment restoration, but uses nonexistent `verification_status`, `verified_by`, and `verified_at` columns instead of the current payment/review fields, and omits required `event_id`. Returned insert errors are ignored before deleting the archive entry. A restored verified person can lose their valid pass and finance evidence. Currently restoration is additionally blocked by the missing archive table/registration-source field.

**Acceptance:** Define and test a full archive/restore round-trip with payment and attendance history intact, using staging fixtures.

### 39 — P1: payment review accepts unrelated payment and registration IDs

**Code:** `lib/data/registrations.ts:591–595,611–631,697–715`. It loads a registration independently, then updates the supplied payment ID without requiring that payment to belong to the registration/event. Zero updated payment rows are not distinguished from success; the registration can still be verified and emailed a pass. The two updates are not atomic.

**Acceptance:** Verify their relationship and transition validity in one authoritative operation. Wrong/nonexistent payment IDs must not approve registrations or generate passes.

### 40 — P1: re-approval can invalidate a pass while email deduplication suppresses its replacement

**Code:** `lib/data/registrations.ts:607–629,658–676`; `lib/email/service.ts:85–110`. Each approval generates a new token, even when already verified/checked in. Email deduplication skips a previously sent `payment_approved_qr` email for the same registration. Retrying approval can invalidate the delivered pass without sending the new one, and can reset attendance to verified.

**Acceptance:** Make approval idempotent, preserve active QR/attendance on retry, and handle explicit pass replacement with deliberate delivery semantics.

### 41 — P1: password-reset code reports success despite SDK failures

**Code:** `lib/data/password-resets.ts:301–317`; related paths `app/admin/events-actions.ts:847–853,1055–1061`. Awaited Auth/profile updates do not inspect returned `{error}`. Normal SDK errors do not necessarily throw; OTP may be marked used and the UI told the password changed when Auth or fallback password storage was not updated. Conversely, an old stored password can remain valid through fallback login after Auth changes.

**Acceptance:** Simulate each update failure; no false success or consumed OTP on unsuccessful reset. Remove duplicate plaintext password authority instead of maintaining divergent credentials.

### 42 — P1: production bot checks accept test bypasses, login has no rate-limit call

**Tested / Code:** `lib/security/turnstile.ts:26–39` accepts `test-token`/`cf-test-pass` without any environment guard and allows missing tokens when no secret is set. The supplied env has no Turnstile keys. `app/admin/actions.ts:265–419` never calls the defined auth rate limiter; the exported hardcoded-session helper also skips Turnstile.

**Acceptance:** Production fails closed for unconfigured/invalid challenge tokens; test tokens work only in an explicit test environment; actual login endpoints enforce a persistent abuse limit.

### 43 — P2: event selection opens the oldest event and invalid links resolve to other events

**Code:** `app/admin/events/page.tsx:18–24` and `app/admin/finance/page.tsx:22` select ascending event date with limit one despite “active/latest” intent. `lib/data/events.ts:159–184` ultimately resolves an unknown slug/ID to an unrelated available event. Registration uses that canonical event ID, so bad links can direct students to the wrong event rather than fail.

**Acceptance:** Select an explicit/current event, and reject nonexistent IDs/slugs. Test with multiple past/current/future events and invalid URLs.

### 44 — P2: image upload failure is hidden behind successful saves

**Code:** `app/admin/actions.ts:81–96`; staff avatar path `app/admin/events-actions.ts:276–292`. Upload failures are logged then converted to undefined/skipped. The surrounding save can report success without the requested image.

**Acceptance:** Show upload failure, preserve the old image on edit, and only claim complete success when the intended asset is persisted.

### 45 — P2: dashboard and blog fallbacks mask real errors and show fabricated state

**Code:** `app/admin/page.tsx:29–34` converts query failures to empty arrays; `app/admin/users/page.tsx:17–20,62` ignores its query error. `components/admin/admin-dashboard-client.tsx:360` always shows six blogs (live anonymous published-blog count was 14). `app/admin/blog-actions.ts:11–21,133–153` classifies any error mentioning `blog_posts` as a missing table and reports success using per-process memory, which does not provide durable/publicly shared content.

**Acceptance:** Distinguish empty data from failed loading, use real counts, and never report durable publication for memory-only fallback writes.

### 46 — P2: email callers ignore delivery failures; advertised fallback/retry is absent

**Code:** `lib/email/mailer.ts:37–63` returns `{success:false}` on delivery failure rather than throwing. Payment approval/import/volunteer paths await it inside try/catch without inspecting the result. `lib/email/service.ts` dispatches through `googleAppsScriptClient`; the reviewed active path has no Nodemailer fallback or durable retry queue despite handover claims. Configuring retry variables alone does not implement retries. In addition, `lib/email/google-apps-script.ts:81–90` returns mock success when the relay is unconfigured, without restricting this behavior to development; production can therefore report sent mail that was never sent.

**Acceptance:** Distinguish data saved from email delivered, surface failed recipients, and implement/test the intended recovery mechanism. Never send real diagnostic emails without explicit authorization.

### 47 — P2: the 100-checkpoint script is not functional verification

**Code:** `scripts/verify-100-checkpoints.js:50–58` and many later checks push literal `PASS` results for behavior/performance without running it. The script can announce passing runtime, caching, authorization, or rendering characteristics while the failures above remain.

**Acceptance:** Replace claims with executable assertions for critical flows; do not use its current pass count or historical handbook “zero errors” as release evidence.

## Recent Antigravity fixes: keep or revisit?

| Commit | Assessment |
| --- | --- |
| `764e17c` | Replacing `.catch()` on PostgREST builders fixes that API/type misuse. Keep the intent, but inspect `{error}` explicitly. Findings 24 and 25 remain. |
| `6611633` | Chunked inserts and returning failure when no registration succeeds are improvements. Payment completeness, row status mapping, failed-row email dispatch, identity fabrication, and existing-row QR generation remain defective. |
| `91e078b` / `05e945b` | Normal fallback now uses UUID defaults and `scanned_by_role`, and export uses real joins. However, root FK failures, nontransactional fallback, bad override path, and broken/absent RPC schema remain. Do not assume fixes in the normal path covered override. |

## Verification results

- Isolated permission tests: unsigned flag yields superadmin; email-only cookie yields president when profile missing; email-only cookie impersonates matching finance profile; ordinary technical member qualifies as Top-6; root fails supreme check; volunteer fails whitelist.
- Isolated CSV parser test: sample header loses the supplied UTR.
- Isolated importer tests: payment failure still counts one success; rejected row becomes verified; all registration inserts failing still triggers one fake email call.
- Phone normalization test: a valid ten-digit number beginning `91` loses two digits.
- Turnstile test: literal test token accepted without verification.
- **Read-only real data-layer CSV export succeeded: 161 lines (header + 160 participants), 14 columns.** No CSV with personal data was saved or printed. This verifies server-side generation, not the deployed browser download or its session.
- Anonymous zero-row count checks returned no readable user-profile/registration/payment/email-log rows, while member roles were readable. This does not establish anonymous mutation rights; those findings are based on SQL policy review.
- **Typecheck / lint / production build: unverified.** The checkout initially had no installed dependencies. `npm ci --ignore-scripts --no-audit --no-fund` downloaded packages extremely slowly and stalled before completion. TypeScript and ESLint processes were attempted once their main packages were available but produced no completed results; they were stopped with the stalled installer. A bounded-fetch retry also stalled during dependency preparation and was stopped. No type/lint/build pass is claimed, and no incomplete-install errors are misreported as source defects. Re-run these checks in the repair agent's fully installed environment. The isolated source-function tests above did complete successfully as reproductions of the reported defects.
- The prescribed `node_modules/next/dist/docs/` guide directory was absent, including after the Next 16.2.1 package metadata became available. No application implementation was written. Any repair agent should resolve the appropriate version-specific documentation before modifying Next.js code.
- Repository review confirmed the application/source and package manifest/lockfile were not edited. Only this Markdown report is a new review deliverable; ignored dependency/cache/diagnostic artifacts may remain from validation attempts.

## Items intentionally not presented as confirmed failures

- The user's exact root-browser CSV download failure was not reproduced. Check action response, browser console/network, signed session, deployed commit, permissions, and browser download handling.
- Missing CSP and in-memory rate limits are real hardening concerns, but absence alone does not prove stored XSS or explain event creation. The unguarded actions and challenge bypasses are stronger directly evidenced security defects.
- `as any` casts are maintenance risk; the report prioritizes the concrete field/permission/result-handling failures they conceal.
- The handover's Render free-tier/self-ping claims were not independently verified. Do not implement that proposed fix on the authority of the old document alone.
- Google Drive/Sheets sharing, Gmail quotas, Cloudflare deployment keys, and external delivery were not actively tested. No mail or cloud-file mutations were authorized/performed by this audit.

## Repair-agent acceptance checklist

Use disposable staging fixtures. Preserve the current 160 registrations and staff accounts. Keep personal data/credentials out of logs and code. For each repair, cite its finding number and prove the before/after behavior rather than just achieving a clean build.

- Anonymous/forged/inactive accounts cannot reach privileged reads/writes; regular staff cannot promote themselves/reset protected executives.
- Real admin identity can create/edit an event, approve a payment, scan a QR, and produce a valid audit trail.
- All required schema/migrations match; no dangerous permissive policies or invalid-column RPCs are introduced.
- Staff create → immediate edit → enable → credential preparation → login works, with consistent Auth/profile IDs and permitted role.
- Sample CSV preserves all supplied fields; rejected/pending rows stay appropriate; errors are row-specific; failed writes send no QR; repeat import does not corrupt attendance or people.
- Participant archive failure preserves active data; successful archive/restore retains payment and QR history.
- Duplicate/concurrent scans, invalid-time scans, unpaid confirmations, overrides, and absence corrections are consistent and transactional.
- Export works through root and intended finance roles, includes all rows beyond API limits, and agrees with current attendance.
- Typecheck, lint, production build, and targeted integration tests are reported honestly; historical/static PASS labels are not test results.
