-- ============================================================================
-- Migration: Event-Wise Volunteer Assignments & Gate Delegation
-- ============================================================================

create table if not exists public.event_volunteers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  assigned_by uuid references public.user_profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists idx_event_volunteers_event on public.event_volunteers(event_id);
create index if not exists idx_event_volunteers_user on public.event_volunteers(user_id);

alter table public.event_volunteers enable row level security;

drop policy if exists "Allow read event_volunteers to authenticated" on public.event_volunteers;
create policy "Allow read event_volunteers to authenticated"
  on public.event_volunteers for select
  using (true);

drop policy if exists "Allow manage event_volunteers to service role" on public.event_volunteers;
create policy "Allow manage event_volunteers to service role"
  on public.event_volunteers for all
  using (true)
  with check (true);
