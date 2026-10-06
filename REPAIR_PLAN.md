# GenAI Website — Audit Repair Plan & Progress Tracker

> Current cutover status (2026-10-06): the database migration, verified backup/rollback rehearsal, real administrator provisioning and deployed admin workflow tests are complete. See [PRODUCTION_RECOVERY_STATUS.md](PRODUCTION_RECOVERY_STATUS.md). Older preflight statements below are historical; this report is not a claim that all external integrations are verified.

Source: `ADMIN_AUDIT_FOR_KIMI.md` (47 findings). Order follows the audit's "Start here" sequence.
Status: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked

## Guiding constraints
- Never trust unsigned cookies; only verified Supabase Auth sessions (01, 02).
- Fail closed everywhere (auth, volunteers, check-in, OTP, Turnstile in prod).
- No fabricated identities: no invented VIT reg numbers, emails, phones (27, 29, 30).
- No silent success after failed writes; check every SDK `{ error }` (17, 24, 25, 33, 41, 44).
- Fix migrations AND code so fresh DB from versioned SQL supports every query (10).
- Preserve existing 160 registrations / 50 profiles; no destructive data migrations.

## Phase A — Authentication & session core (P0)
- [ ] 01/02 Rewrite `getAuthenticatedStaff()`: verified Supabase session only; remove `club_admin_session`/`club_admin_email` trust, synthesized-president branch, flag-cookie root; deny on missing/inactive/voided/disabled profile or query error.
- [ ] 11 Remove synthetic root UUID; root = real Auth user + superadmin profile.
- [ ] 19 Remove hardcoded root password literal + plaintext password-compare fallback from login; Auth sessions only (strategy per owner decision below).
- [ ] 42 Turnstile: fail closed in production when unconfigured/invalid; test tokens only outside production; login enforces persistent (DB-backed) auth rate limit.
- [ ] 13 Tighten `isTop6Admin`: no team-substring promotions (`tech`/`aiml`/`lead`/`panel` team members or plain co_lead); explicit executive positions only.
- [ ] 12 `isSupremeExecutive`: recognize `superadmin`/`system_council`; drop personal-email substring grants.

## Phase B — Server action authorization (P0)
- [ ] 03 Guard every exported privileged action (app/admin/actions.ts member/team/event/project CRUD + avatar, blog-actions.ts read/AI/upsert/delete/ingest, events-actions.ts getAllStaffMembersAction, achievements/winners role checks). New helper `requireStaffActionRole(minRole)` that throws plain Errors (no redirect) for actions.

## Phase C — Data-loss safety (P0)
- [ ] 05 `deleteRegistrationWithArchive`: abort before deletes when archive insert fails; check every delete; compensate on partial failure.
- [ ] 38 `restoreDeletedRegistration`: restore qr_token/qr_generated_at + checkins + payments with correct columns (payment_status/reviewed_by/reviewed_at, event_id, drive_file_*); verify each insert; delete archive row only after full success.

## Phase D — Schema reconciliation (06–10) [SQL; owner applies after review]
- [ ] New `supabase/migrations/20260929_audit_repair.sql` (idempotent): missing events/user_profiles/registrations/checkins columns; event_volunteers/event_statistics/deleted_registrations/password_reset_otps/password_reset_requests/member_roles/blog_posts/achievements/event_winners tables; role-scoped RLS replacing `USING(true)`; revoke EXECUTE on security-definer mutation RPCs from anon/authenticated; fixed `confirm_attendance_action` + guarded `archive_and_clear_event`; `notify pgrst`.
- [ ] Repair existing files (10): 20260913 (initial_password→password, policies), 20260914_achievements, 20260914_password_reset_requests, 20260915_event_volunteers, 20260915_otp, 20260918_email_logs, 20260921 (create checked_in_* columns; scanner_role→scanned_by_role), schema.sql (same + event_winners).


## Phase E — Admin/staff workflows (06–08, 14–18, 20, 36, 43)
- [ ] 06/07 Credential email queries: scalar `roles` → `roles:member_roles(*)`; schema-backed columns now exist.
- [ ] 08 Remove column-stripping retry loop in `upsertEvent`; persist eligibility/spotlight/google_form_url or error loudly.
- [ ] 14 Volunteer assignment clears `is_voided`; login whitelist admits event-assigned volunteers (event_volunteers lookup fallback).
- [ ] 15 Volunteer picker lists ONLY real user_profiles; assignment validates target profile first.
- [ ] 16 upsertStaffUserAction returns persisted user id; UI uses real id (no `new-<ts>`).
- [ ] 17 Check member_roles delete/insert + auth sync results; never attach profile to mismatched Auth id.
- [ ] 18 Enabling roleless account no longer invents technical/core_member; requires explicit role assignment.
- [ ] 20 Target-aware protection on reset/enable/disable/role edit: executive targets require supreme actor.
- [ ] 36 One export permission rule (`finance` minimum) on server action AND /api/admin/export route.
- [ ] 43 events/finance pages pick live/next-upcoming/latest; `getEventBySlugOrId` rejects unknown ids.

## Phase F — Events, import, attendance, export (21–37, 39–40, 44)
- [ ] 21/22 Time inputs `type="time"` combined with event date; browser-local→ISO convention in both editors; server validates & rejects time-only strings.
- [ ] 23 CSV parser: proper quoted/multiline parsing in pure `lib/utils/csv.ts`; `transaction_id__utr_` alias; exact UTR preserved.
- [ ] 24/25 Check every payment insert/update; email targets only for persisted rows; drive_file_* in repair inserts.
- [ ] 26 Status mapping verified/pending/rejected; unknown → row error, never auto-approve.
- [ ] 27 No fabricated VIT ids; re-import never downgrades checked_in/verified nor clobbers payments.
- [ ] 28 Pending→verified re-import generates qr_token + email.
- [ ] 29 Phone: strip `91` only at 12 digits; validate; missing → row error.
- [ ] 30 No invented emails; missing required contact → row error; reuse provided address for the other slot.
- [ ] 31 confirmAttendance fallback: verified-payment requirement; compensate reg update when checkin insert fails.
- [ ] 32 Scan API enforces `isAssignedEventVolunteer(user.id, eventId)` for verify+confirm; helper fails CLOSED.
- [ ] 33 Override: `scanned_by_role`, uuid default, checked insert errors.
- [ ] 34 Absence override revokes prior approved/overridden checkins; export/counts agree.
- [ ] 35 Pagination loops for export/import-dedup/dashboard counts.
- [ ] 37 CSV formula-injection neutralization.
- [ ] 39 reviewPayment enforces payment↔registration linkage; zero-row update = error.
- [ ] 40 Idempotent approval: reuse qr_token, never downgrade checked_in, explicit resend.
- [ ] 44 Image upload failure throws with visible error; old image preserved on edit.

## Phase G — Email, OTP, dashboards, misc (41, 45–47, 09)
- [ ] 09 OTP table-backed (cross-instance); fail closed if missing.
- [ ] 41 Reset code checks Auth errors; OTP consumed only after success; no plaintext password writes.
- [ ] 45 Real blog count; dashboard surfaces query errors; blog memory fallback reports NOT persisted.
- [ ] 46 Email callers inspect results; GAS mock mode restricted to non-production.
- [ ] 47 verify-100-checkpoints.js honest labels instead of fabricated PASS.

## Owner decisions
1. Root login cutover (01/11/19) — ASKED: (A) env-bootstrap JIT provisioning vs (B) strict removal.
2. Personal-email supreme fallbacks removed (roles cover the trio per roster).
3. `user_profiles.password` column kept in DB but deprecated/unused; destructive cleanup = commented opt-in SQL.

## Validation
- [ ] `npx tsc --noEmit` · [ ] `npm run lint` · [ ] `npm run build` · [ ] `node --test` pure-helper tests

## Changelog
