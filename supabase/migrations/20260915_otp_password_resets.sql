-- ============================================================================
-- Migration: OTP-Based Password Reset & Authentication Recovery
-- ============================================================================

create table if not exists public.password_reset_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  otp_code text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  is_used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_otps_email on public.password_reset_otps(email);
create index if not exists idx_password_reset_otps_expires on public.password_reset_otps(expires_at);

alter table public.password_reset_otps enable row level security;

drop policy if exists "Service role full access to password_reset_otps" on public.password_reset_otps;
create policy "Service role full access to password_reset_otps"
  on public.password_reset_otps
  for all
  using (true)
  with check (true);
