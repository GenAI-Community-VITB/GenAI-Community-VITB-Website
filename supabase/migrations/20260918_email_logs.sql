-- ============================================================================
-- Migration: 20260918_brevo_email_logs.sql
-- Description: Enhances email_logs table for Brevo Transactional Email tracking,
--              delivery webhooks, retry attempts, and permanent failure classification.
-- ============================================================================

-- 1. Create or update email_logs table structure
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references public.registrations(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  recipient_email text not null,
  email_type text not null,
  subject text not null,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role text default 'system',
  status text not null default 'PENDING',
  provider text not null default 'brevo',
  provider_message_id text,
  attempt_count integer not null default 1,
  last_attempt_at timestamptz default now(),
  sent_at timestamptz default now(),
  delivered_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Add columns if table already existed previously
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_logs' and column_name = 'provider') then
    alter table public.email_logs add column provider text not null default 'brevo';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_logs' and column_name = 'provider_message_id') then
    alter table public.email_logs add column provider_message_id text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_logs' and column_name = 'attempt_count') then
    alter table public.email_logs add column attempt_count integer not null default 1;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_logs' and column_name = 'last_attempt_at') then
    alter table public.email_logs add column last_attempt_at timestamptz default now();
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_logs' and column_name = 'delivered_at') then
    alter table public.email_logs add column delivered_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_logs' and column_name = 'failed_at') then
    alter table public.email_logs add column failed_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_logs' and column_name = 'failure_reason') then
    alter table public.email_logs add column failure_reason text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_logs' and column_name = 'created_at') then
    alter table public.email_logs add column created_at timestamptz not null default now();
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_logs' and column_name = 'updated_at') then
    alter table public.email_logs add column updated_at timestamptz not null default now();
  end if;
end $$;

-- 3. Create helpful indexes for fast dashboard lookups and idempotency
create index if not exists idx_email_logs_event_status on public.email_logs(event_id, status);
create index if not exists idx_email_logs_reg_type on public.email_logs(registration_id, email_type);
create index if not exists idx_email_logs_provider_msg on public.email_logs(provider_message_id);
create index if not exists idx_email_logs_recipient on public.email_logs(recipient_email);
create index if not exists idx_email_logs_status on public.email_logs(status);

-- 4. Enable RLS
alter table public.email_logs enable row level security;

-- Tech and Finance view email logs policy
drop policy if exists "Tech and Finance view email logs" on public.email_logs;
create policy "Tech and Finance view email logs" on public.email_logs for select to authenticated
using (
  exists (
    select 1 from public.user_profiles
    where user_profiles.id = auth.uid()
      and user_profiles.is_active = true
      and (
        user_profiles.role in ('tech', 'finance', 'president', 'vice_president', 'technical_lead', 'technical_co_lead', 'aiml_lead', 'aiml_co_lead')
        or exists (
          select 1 from public.member_roles
          where member_roles.user_id = auth.uid()
            and (member_roles.team in ('technical_team', 'finance_team', 'core_executive_panel') or member_roles.position in ('lead', 'head', 'coordinator'))
        )
      )
  )
);

-- Service role full access policy
drop policy if exists "Service role manage email logs" on public.email_logs;
create policy "Service role manage email logs" on public.email_logs for all using (true) with check (true);
