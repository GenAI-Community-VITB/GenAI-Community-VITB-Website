# Local staging setup and connection checks

Updated: 4 October 2026. No deployment, production migration, participant change, or test email was performed.

## Current state

- Vercel CLI 61.0.0 was already installed.
- The provided Vercel token can read this project's metadata. CLI linking failed at its user lookup with HTTP 404; the project API was used to inspect configuration instead.
- Vercel lists 32 variables, all Sensitive/Secret, with no readable values and none assigned to Development. A fresh export of their values was therefore unavailable. [Vercel documents that saved Secrets are write-only](https://vercel.com/docs/environment-variables/sensitive-environment-variables).
- The previously supplied `Downloads/env.download` was temporarily loaded into an ignored `.env.local` to perform the checks below. This was a backup from 29 September, not a fresh Vercel export.
- After you selected a separate staging project, that configuration was saved in `.vercel/.env.user-backup-2026-10-04.local` and removed from the active environment.
- `.env.local` and `.env.staging.local` now contain a staging template. Database credentials are empty; production email, relay and Google storage credentials are not active. Local CAPTCHA test keys are development-only.
- The local website can run at `http://localhost:3000`, but database-dependent features will remain unavailable until the staging project is configured.
- After the staging-only restart, `/admin/login` returned HTTP 200. `/api/health` returned HTTP 503 as expected with the staging database fields empty. Checks confirmed that no live database, email or Google storage credentials remain in the active environment.

## Completed read-only checks using the supplied backup

| Check | Result |
| --- | --- |
| Supabase API and events read | Passed |
| Google Drive root folder read | Passed |
| Google Sheets metadata read | Passed |
| Gmail SMTP authentication, without sending mail | Failed: EAUTH |
| Local `/api/health` | HTTP 200, database healthy |
| Local `/`, `/events`, `/admin/login` | HTTP 200 |
| Local `/admin` without authentication | HTTP 307 to `/admin/login` |

The existing database does not yet have the reconciliation migration. Read-only schema inspection found five missing tables, multiple missing columns and ten missing repair RPCs, including the login limiter and staff-management functions. No migration was applied to that database. Local checks did not attempt account login or invoke any mutating RPC.

## Create the isolated staging database

1. In the [Supabase dashboard](https://supabase.com/dashboard), create a new, empty project, for example `genai-community-staging`, in your organization. Keep the existing live project separate. Creating a project requires access to your Supabase account; the Vercel project token cannot do this.
2. In the new project's SQL Editor, execute `supabase/fresh-install.sql` from this repository. It combines the base schema, reconciliation and credential retirement in one transaction. **Use it only on the new empty staging project**, not the current live project. This script was verified against isolated PostgreSQL in the prior test pass.
3. Get the new project's URL and API keys from its Connect/API keys settings. In `.env.local`, fill in:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL="https://STAGING_PROJECT_REF.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="STAGING_ANON_OR_PUBLISHABLE_KEY"
   SUPABASE_SERVICE_ROLE_KEY="STAGING_SERVICE_ROLE_OR_SECRET_KEY"
   ```

   Keep the backend key out of any `NEXT_PUBLIC_` variable. This repository currently uses the above environment variable names, even when a newer publishable/secret key is supplied. [Supabase's setup guide explains project creation and finding connection details](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs).
4. Tell me when the staging schema and those three local values are ready. I can then verify the project identity, provision a real staging administrator with a new password, and test event creation, participant import/export, role changes and access revocation using synthetic records. The old hardcoded login is no longer supported.
5. Restart the local dev server after configuration changes if necessary:

   ```powershell
   npm run dev -- --hostname 127.0.0.1 --port 3000
   ```

## Later integration tests

Use dedicated staging Drive folders and Sheets rather than the live event workbooks. Add the Google credentials and staging destinations only when ready. The updated Apps Script relay also needs a matching `GOOGLE_DRIVE_RELAY_TOKEN` / Script Property `DRIVE_RELAY_TOKEN`.

For email-delivery tests, supply working staging SMTP/relay credentials and explicitly chosen test recipients. The SMTP credentials in the supplied backup failed authentication. No email deliveries have been attempted.

Do not deploy the local CAPTCHA test keys or bootstrap credentials. Nothing in this setup publishes the application; production deployment remains deferred until testing is complete and you request it.
