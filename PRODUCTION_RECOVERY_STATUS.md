# Production recovery status — 2026-10-06

Production deployment, GitHub push and necessary database repairs are authorized. The reconciliation migration is applied; the repaired production-target build passed authenticated workflow checks. Publishing through the configured GitHub production branch, main, is the remaining application cutover step at this commit.

## Verified recovery material

All private recovery files are under the Git-ignored .vercel/recovery directory, restricted by Windows ACL to the current account and SYSTEM. Never upload or commit them.

- Native PostgreSQL backup: postgres-2026-10-05T22-31-46-829Z/database.dump, with decoded SQL, roles without role passwords, archive inventory and SHA-256 manifest. It includes 73 table-data entries and 24,789 rows, including 52 original Auth users and their authentication hashes.
- Restore rehearsal: 72 non-Vault tables restored to an isolated local PostgreSQL server; row counts and sorted row-content hashes matched exactly. Supabase Vault was empty and its unavailable local extension was excluded only from the rehearsal, not from the original archive.
- Migration and rollback both ran successfully on the restored copy under the same database-owner role as production. Rollback recovered all original table contents and all 22 original public function definitions and permissions.
- Tested rollback file: postgres-2026-10-05T22-31-46-829Z/rollback-public-to-backup.sql. Its checksum and migration checksum are recorded in manifest.json.
- A second native snapshot, pre-cutover.dump, was captured immediately before the production migration. All 28 public tables matched the tested recovery snapshot before applying the migration.
- Supplementary snapshot 2026-10-05T17-37-31-398Z contains a verified Git bundle, working-source snapshot, environment backup supplied by the owner, database/API inventories, and Vercel configuration metadata.

The database backup includes schema, functions, grants, RLS and Auth table records. Database-role passwords, external Google Drive files/Sheets, and complete provider settings are not part of pg_dump. Supabase Storage had zero buckets at inventory time. No claim is made that every external service can be restored from this database archive.

## Applied changes and verification

The reconciliation committed on 2026-10-06 at 06:21 UTC. All 16 competition functions and their permissions were preserved. The new real administrator was provisioned and verified through Supabase Auth and enabled-profile checks; its credentials are stored privately in administrator-credentials.json. No password is stored in its profile.

Production-target deployment dpl_61SKgCtKREArqYbBH6MAc9j9mCef was built without assigning live domains. Tests against that deployment and the production database passed:

- Database health, four authenticated admin pages, and rejection of forged legacy login cookies/unauthenticated protected endpoints.
- Event creation and editing, including campus timezone conversion.
- Bulk import of pending, verified and rejected participants; participant CSV export with all records and transaction references.
- Real staff Auth provisioning, finance access, immediate access denial with an existing disabled session, and re-enabling with replacement credentials.

Temporary test event, registrations/payments and staff account were removed. No email delivery was requested during these tests. Receipts are retained privately. Plaintext legacy credential retirement is pending until the repaired application serves the live domains.

## Recovery procedure

The previous application deployment is dpl_EzgYqpzrwcWxBucca8ic3AL5chzi. Retain it for emergency rollback; its old authentication defects make it unsuitable as a permanent fallback. A Vercel rollback does not undo database changes.

Before any database rollback, pause application writes, take a fresh incident backup and preserve records created since the chosen snapshot. The tested SQL restores public data to backup time and would otherwise discard later public records. Execute it with psql and ON_ERROR_STOP using the same session-pooler connection and database-owner role. Do not restore production blindly or replay legacy seed/prune migrations.

The public-schema rollback does not remove the newly provisioned Auth administrator. Its Auth ID and creation receipt are in administrator-provisioned.json; reconcile that account explicitly with the chosen restored profile state. Full Auth restoration is a separate operation from public-schema rollback.

Turnstile was added only to Vercel production; its original state was absent. The created environment IDs and private configuration are in the supplementary snapshot. An automation protection-bypass token was generated solely to test the protected deployment; its private receipt is in the native-backup folder.

## Remaining external-service work

The updated Drive relay and email relay need their respective Apps Script deployments and private Script Properties configured. The previously configured email-relay token also appeared in old tracked setup material; this commit removes that fallback and replaces examples. Rotate the deployed relay token together with its Vercel value when updating that external relay. Direct Gmail SMTP verification returned EAUTH. Email delivery has not been certified.

The Drive relay token is not configured. Durable database image fallback is implemented, but the live Drive upload path, historic public sharing, and Google Spreadsheet creation require separate verification. Existing public Drive permissions were not modified. Real Turnstile keys are configured; browser challenge completion/allowed hostnames still need verification on the live domain.
