# Club Website System (Production Blueprint + Starter Code)

Tech stack: Next.js App Router + TypeScript + Tailwind + Supabase (Postgres, Auth, Storage).

## 1) System Architecture

```text
[Next.js Frontend (App Router)]
  - Landing, Team, Projects, Events, Admin UI
  - Server Components for read pages
  - Client Components only for interactions
              |
              | Server Actions / route handlers
              v
[Next.js Server Layer]
  - Input validation (Zod)
  - Auth checks (Supabase session + middleware)
  - Cache invalidation (revalidatePath)
              |
              v
[Supabase]
  - PostgreSQL (teams, members, projects, events)
  - Auth (admin login)
  - Storage (club-assets bucket for images)
  - RLS policies (public read + admin write)
```

## 2) Flow-Based Wireframe

```text
[Landing] -> [The Vibe] -> [Teams] -> [Team Members]
         -> [Projects Page]
         -> [Events Page]
         -> [Admin Login] -> [Admin Dashboard]
```

Admin:
- Manage Members: add/update/delete
- Manage Projects: add/update/delete
- Manage Events: add/update/delete + status toggle (`upcoming` / `live`)

## 3) Folder Structure

```text
app/
  page.tsx
  projects/page.tsx
  events/page.tsx
  team/[slug]/page.tsx
  admin/
    actions.ts
    layout.tsx
    page.tsx
    login/page.tsx
components/site/
  navbar.tsx
  hero.tsx
  team-section.tsx
  project-grid.tsx
  event-grid.tsx
lib/
  data/public.ts
  supabase/client.ts
  supabase/server.ts
  validation.ts
  types.ts
supabase/
  schema.sql
proxy.ts
```

## 4) Database Schema

Tables:
- `teams` (PK: `id`)
- `members` (PK: `id`, FK: `team_id -> teams.id`)
- `projects` (PK: `id`)
- `events` (PK: `id`)

All tables include:
- `created_at`
- `updated_at`
- image URL fields where needed

Schema + RLS policies are in `supabase/schema.sql`.

## 5) API / Server Action Design

Server actions in `app/admin/actions.ts`:
- `loginAdmin`, `logoutAdmin`
- `upsertMember`, `deleteMember`
- `upsertProject`, `deleteProject`
- `upsertEvent`, `deleteEvent`

Read flow:
- Public pages fetch from Supabase via server components (`lib/data/public.ts`).
- Pages use ISR (`revalidate = 60`) for performance.

Write flow:
- Admin submits form -> Server Action -> validate with Zod -> Supabase write -> `revalidatePath`.
- Frontend reflects changes quickly due to revalidation.

## 6) Security

- Admin routes protected by:
  - `middleware.ts`
  - `app/admin/layout.tsx` server-side session check
- Input validation done with Zod before DB writes.
- RLS enabled for every table.
- Public users: select only.
- Authenticated admin email: full CRUD (policy currently uses `admin@club.com`; change to your admin identity strategy).

## 7) Performance + SEO

- ISR on public pages (`revalidate = 60`)
- Server components for data-heavy rendering
- Next metadata in `app/layout.tsx`
- Cache + path revalidation after mutations
- Use Next `Image` with Supabase URLs for optimized loading (can be expanded per page)

## 8) Setup Steps

1. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Run SQL from `supabase/schema.sql` in Supabase SQL editor.
3. Create admin user in Supabase Auth.
4. Update admin RLS email policy if needed.
5. Start app:
   ```bash
   npm run dev
   ```

## 9) Scalability Suggestions

- Move write operations to explicit route handlers for external integrations.
- Add audit logs (`admin_activity` table).
- Add paginated queries for members/projects/events.
- Add search + filters + tag tables.
- Add queue/cron (Vercel Cron + Edge Functions) for event reminders.
- Multi-tenant SaaS path:
  - add `organizations` table
  - add `org_id` in all content tables
  - enforce tenant-aware RLS
  - custom domain + billing integration.
