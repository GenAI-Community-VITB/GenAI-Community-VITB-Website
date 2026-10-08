# Temporary staff credentials

Supreme Council and Top Executive accounts can issue and reveal temporary staff passwords in **Admin → Users**. Existing protections on executive target accounts still apply: only supreme executives can manage those targets, and the system-administrator account retains its additional restriction.

Core members can add core-member accounts to their assigned teams. The server generates and stores the temporary password without returning it to the core member. Leads and co-leads can reveal, reset, email, enable or disable ordinary accounts only when every team assigned to the target account is a team they lead. Their reset-request lists use the same scope; both approval and rejection recheck authorization. Cross-team accounts and protected executive accounts require executive/council handling. Leads cannot change existing roles or team assignments, or create privileged accounts.

Access follows the saved primary role and team assignments, not the display name. Legacy department lead roles imply their corresponding team, but do not grant global credential access. Explicit council and Top Executive assignments retain wider access. The users page filters the directory before sending data to the browser. Existing disabled accounts are not automatically enabled by this permission update.

- Account creation, enabling login, and admin password resets save an encrypted temporary password.
- **Show** fetches the saved value on demand, including after a browser refresh. Passwords are not included in the users-page payload.
- **Email** sends the current Supabase Auth email and saved temporary password to that same address. The public login link is `https://www.genaiclubvitb.in/admin/login`.
- A member's own password change, including OTP recovery or a direct Auth change, deletes the saved copy through an Auth-table trigger. Personal passwords are never copied into this table.
- Accounts created before this feature have no recoverable temporary password. Issue a new one with **Reset**; emailing credentials will never silently reset the member's password.
- A disabled account must be enabled before credentials can be emailed. Delivery failures remain visible. Email bodies containing passwords are excluded from persisted retry payloads.

## Storage and deployment

Apply `supabase/migrations/20261008_staff_temporary_credentials.sql` after a database backup. It adds an RLS-protected, service-only table, a password-matching save function, and an Auth password-change cleanup trigger. The save function locks the Auth row and verifies the issued password against the current bcrypt hash, preventing a concurrent reset from saving an obsolete copy. It requires the existing `pgcrypto` extension in `public` or `extensions`.

Set the server-only `STAFF_CREDENTIAL_ENCRYPTION_KEY` to 64 hex characters generated from 32 cryptographically random bytes. Ciphertexts use AES-256-GCM, a fresh nonce, and the user's ID as authenticated data. Keep a private backup of the key; do not put it in public environment variables or source control. Do not replace it without a credential re-encryption plan.

The trigger does not change Auth passwords or sessions; it removes only obsolete encrypted temporary copies. The migration does not populate credentials or reset existing accounts.

## Verification and rollback

Application tests cover encryption/tamper detection, executive permissions, current-email selection, missing credentials, escaped email content and exclusion of passwords from retry logs. Isolated database tests cover private grants. `scripts/test-staff-credentials.sql` additionally rehearses real bcrypt matching, invalidation, stale-write rejection and deletion cleanup on the local restore PostgreSQL instance; its test data rolls back.

For an application rollback, revert this feature's code and retain the unused credential table/key. Existing account passwords continue to work. If the new Auth trigger itself causes password-update failures, back up the credential table and remove only `clear_staff_temporary_credential` from `auth.users`, then stop using saved temporary credentials until corrected. Removing that trigger alone disables automatic invalidation. A full database restore is unnecessary for rolling back this feature and risks losing newer records.
