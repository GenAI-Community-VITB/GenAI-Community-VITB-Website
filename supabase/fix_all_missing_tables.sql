-- ============================================================================
-- GENAI COMMUNITY WEBSITE - MASTER RECOVERY & SCHEMA INITIALIZATION SCRIPT
-- Run this once in your Supabase SQL Editor to restore all missing tables:
-- teams, members, projects, achievements, event_winners, and events guidelines.
-- ============================================================================

-- 1. Enable Required Extensions
create extension if not exists "pgcrypto";

-- 2. Trigger Function for Updated Timestamps
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. TEAMS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists teams_updated_at on public.teams;
create trigger teams_updated_at before update on public.teams for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. MEMBERS TABLE
-- ----------------------------------------------------------------------------
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

drop trigger if exists members_updated_at on public.members;
create trigger members_updated_at before update on public.members for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. PROJECTS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  short_description text,
  image_url text,
  github_url text,
  live_url text,
  blog_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. ACHIEVEMENTS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text not null,
  category text not null default 'Hackathon',
  achievement_date date not null default current_date,
  image_url text,
  drive_file_id text,
  link_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists achievements_updated_at on public.achievements;
create trigger achievements_updated_at before update on public.achievements for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. EVENT WINNERS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.event_winners (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  position text not null default '1st',
  team_name text not null,
  members text[] not null default '{}',
  project_title text not null,
  project_description text,
  prize_award text,
  event_date date not null default current_date,
  image_url text,
  github_url text,
  demo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists event_winners_updated_at on public.event_winners;
create trigger event_winners_updated_at before update on public.event_winners for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. ENSURE EVENTS TABLE HAS ALL COLUMNS
-- ----------------------------------------------------------------------------
alter table public.events add column if not exists guidelines text[];
alter table public.events add column if not exists upi_id text default 'genai.community@okaxis';
alter table public.events add column if not exists upi_qr_image_url text;
alter table public.events add column if not exists max_capacity integer default 2000;
alter table public.events add column if not exists registration_fee numeric default 200;
alter table public.events add column if not exists registration_deadline timestamptz;
alter table public.events add column if not exists event_start_time text;
alter table public.events add column if not exists event_end_time text;
alter table public.events add column if not exists is_registration_open boolean default true;

-- ----------------------------------------------------------------------------
-- 9. ENABLE ROW LEVEL SECURITY (RLS) & PUBLIC READ POLICIES
-- ----------------------------------------------------------------------------
alter table public.teams enable row level security;
alter table public.members enable row level security;
alter table public.projects enable row level security;
alter table public.achievements enable row level security;
alter table public.event_winners enable row level security;

-- Public Read Policies
drop policy if exists "Public read teams" on public.teams;
create policy "Public read teams" on public.teams for select using (true);

drop policy if exists "Public read members" on public.members;
create policy "Public read members" on public.members for select using (true);

drop policy if exists "Public read projects" on public.projects;
create policy "Public read projects" on public.projects for select using (true);

drop policy if exists "Public read achievements" on public.achievements;
create policy "Public read achievements" on public.achievements for select using (true);

drop policy if exists "Public read event_winners" on public.event_winners;
create policy "Public read event_winners" on public.event_winners for select using (true);

-- Service Role Write Policies
drop policy if exists "Service role manage teams" on public.teams;
create policy "Service role manage teams" on public.teams for all using (true) with check (true);

drop policy if exists "Service role manage members" on public.members;
create policy "Service role manage members" on public.members for all using (true) with check (true);

drop policy if exists "Service role manage projects" on public.projects;
create policy "Service role manage projects" on public.projects for all using (true) with check (true);

drop policy if exists "Service role manage achievements" on public.achievements;
create policy "Service role manage achievements" on public.achievements for all using (true) with check (true);

drop policy if exists "Service role manage event_winners" on public.event_winners;
create policy "Service role manage event_winners" on public.event_winners for all using (true) with check (true);

-- ----------------------------------------------------------------------------
-- 10. RELOAD SUPABASE POSTGREST SCHEMA CACHE
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';
