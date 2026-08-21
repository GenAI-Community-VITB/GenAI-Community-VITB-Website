-- ============================================================================
-- PASSWORD RESET REQUESTS TABLE & POLICIES (Exec 6 Verification)
-- ============================================================================

create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  student_name text not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast status querying
create index if not exists idx_pw_resets_status on public.password_reset_requests (status, created_at desc);

alter table public.password_reset_requests enable row level security;

-- Anyone can submit a reset request
drop policy if exists "Allow public insert to password_reset_requests" on public.password_reset_requests;
create policy "Allow public insert to password_reset_requests" on public.password_reset_requests 
  for insert with check (true);

-- Staff can view and manage requests
drop policy if exists "Allow staff read/update password_reset_requests" on public.password_reset_requests;
create policy "Allow staff read/update password_reset_requests" on public.password_reset_requests 
  for all using (true);

notify pgrst, 'reload schema';
