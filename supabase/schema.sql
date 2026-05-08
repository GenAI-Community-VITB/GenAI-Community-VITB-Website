create extension if not exists "pgcrypto";

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  role text not null,
  position text not null,
  linkedin_url text,
  image_url text,
  status text not null default 'active' check (status in ('pending', 'active')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  short_description text not null,
  image_url text,
  github_url text,
  live_url text,
  blog_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  venue text not null,
  event_date timestamptz not null,
  status text not null check (status in ('upcoming', 'live')),
  image_url text,
  register_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists teams_updated_at on public.teams;
create trigger teams_updated_at before update on public.teams for each row execute function public.set_updated_at();
drop trigger if exists members_updated_at on public.members;
create trigger members_updated_at before update on public.members for each row execute function public.set_updated_at();
drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at before update on public.events for each row execute function public.set_updated_at();

alter table public.teams enable row level security;
alter table public.members enable row level security;
alter table public.projects enable row level security;
alter table public.events enable row level security;

drop policy if exists "Public read teams" on public.teams;
create policy "Public read teams" on public.teams for select using (true);
drop policy if exists "Public read members" on public.members;
create policy "Public read members" on public.members for select using (true);
drop policy if exists "Public read projects" on public.projects;
create policy "Public read projects" on public.projects for select using (true);
drop policy if exists "Public read events" on public.events;
create policy "Public read events" on public.events for select using (true);

drop policy if exists "Admins full teams" on public.teams;
create policy "Admins full teams" on public.teams for all to authenticated
using ((select auth.jwt() ->> 'email') = 'admin@club.com')
with check ((select auth.jwt() ->> 'email') = 'admin@club.com');

drop policy if exists "Admins full members" on public.members;
create policy "Admins full members" on public.members for all to authenticated
using ((select auth.jwt() ->> 'email') = 'admin@club.com')
with check ((select auth.jwt() ->> 'email') = 'admin@club.com');

drop policy if exists "Admins full projects" on public.projects;
create policy "Admins full projects" on public.projects for all to authenticated
using ((select auth.jwt() ->> 'email') = 'admin@club.com')
with check ((select auth.jwt() ->> 'email') = 'admin@club.com');

drop policy if exists "Admins full events" on public.events;
create policy "Admins full events" on public.events for all to authenticated
using ((select auth.jwt() ->> 'email') = 'admin@club.com')
with check ((select auth.jwt() ->> 'email') = 'admin@club.com');

-- ─────────────────────────────────────────────────────────────
-- Seed: 11 official club teams (idempotent — safe to re-run)
-- ─────────────────────────────────────────────────────────────
insert into public.teams (name, slug, description) values
  ('Core Executive Panel',      'core-executive-panel',      'The governing body that leads and drives the overall vision of the club.'),
  ('Supervision Committee',     'supervision-committee',     'Ensures accountability, compliance and smooth functioning across all teams.'),
  ('Technical Team',            'technical-team',            'Builds and maintains the club''s technical projects, tools and infrastructure.'),
  ('Event Management Team',     'event-management-team',     'Plans, organises and executes all club events and workshops.'),
  ('Finance Team',              'finance-team',              'Manages budgets, sponsorships and all financial operations of the club.'),
  ('Content Team',              'content-team',              'Creates compelling written and multimedia content across all platforms.'),
  ('Design Team',               'design-team',               'Crafts the visual identity, graphics and UI/UX for club initiatives.'),
  ('PR and Outreach Team',      'pr-outreach-team',          'Builds relationships, manages partnerships and promotes the club externally.'),
  ('Social Media Team',         'social-media-team',         'Runs the club''s social presence and engages the online community.'),
  ('AI, ML and Innovation Team','ai-ml-innovation-team',     'Researches cutting-edge AI/ML developments and drives innovation projects.'),
  ('Research and Development Team','research-development-team','Conducts in-depth research and develops new ideas to advance club goals.')
on conflict (slug) do update
  set name        = excluded.name,
      description = excluded.description,
      updated_at  = now();

insert into storage.buckets (id, name, public)
values ('club-assets', 'club-assets', true)
on conflict (id) do nothing;

drop policy if exists "Public read club assets" on storage.objects;
create policy "Public read club assets"
on storage.objects for select
using (bucket_id = 'club-assets');

drop policy if exists "Admins write club assets" on storage.objects;
create policy "Admins write club assets"
on storage.objects for all to authenticated
using (
  bucket_id = 'club-assets'
  and (select auth.jwt() ->> 'email') = 'admin@club.com'
)
with check (
  bucket_id = 'club-assets'
  and (select auth.jwt() ->> 'email') = 'admin@club.com'
);

-- Allow anonymous form submissions (must be pending)
drop policy if exists "Allow anon to insert pending members" on public.members;
create policy "Allow anon to insert pending members" on public.members
for insert to anon
with check (status = 'pending');

-- Allow anonymous image uploads to club-assets
drop policy if exists "Allow anon to insert club assets" on storage.objects;
create policy "Allow anon to insert club assets" on storage.objects
for insert to anon
with check (bucket_id = 'club-assets');
