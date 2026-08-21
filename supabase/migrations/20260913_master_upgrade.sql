-- ============================================================================
-- GENERATIVE AI COMMUNITY 2026-27 PLATFORM UPGRADE (MASTER MIGRATION)
-- Includes:
-- 1. Multi-role Member Assignments (member_roles)
-- 2. Live Event Statistics (event_statistics) with automatic triggers
-- 3. On-Spot & Enhanced Registrations metadata (registration_source, course, etc.)
-- 4. Deleted Registrations Archival Table (deleted_registrations)
-- 5. 2-Step QR Verification & Attendance Stored Procedures
-- 6. Event Completion, Archival & Reset Logic
-- ============================================================================

-- 1. Live Event Statistics Table
create table if not exists public.event_statistics (
  event_id uuid primary key references public.events(id) on delete cascade,
  registered_count integer not null default 0,
  approved_count integer not null default 0,
  pending_count integer not null default 0,
  attended_count integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Enable RLS & Grants
alter table public.event_statistics enable row level security;
create policy "Allow read event_statistics to all" on public.event_statistics for select using (true);
create policy "Allow update event_statistics to staff" on public.event_statistics for all using (true);

-- 2. Enhanced Registration Columns
alter table public.registrations 
  add column if not exists registration_source text not null default 'online',
  add column if not exists college text not null default 'VIT Bhopal University',
  add column if not exists course text not null default 'B.Tech',
  add column if not exists academic_year text not null default '2024-2028';

-- 3. Deleted Registrations Table (Historical Safe Archival)
create table if not exists public.deleted_registrations (
  id uuid primary key default gen_random_uuid(),
  original_registration_id uuid not null,
  registration_number text not null,
  event_id uuid references public.events(id) on delete set null,
  full_name text not null,
  vit_registration_number text not null,
  branch_name text not null,
  personal_email text not null,
  college_email text not null,
  phone_number text not null,
  registration_source text not null default 'online',
  payment_status text not null default 'pending',
  deleted_by uuid,
  deleted_by_name text,
  deleted_by_role text,
  deletion_reason text,
  deleted_at_ist text not null,
  raw_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.deleted_registrations enable row level security;
create policy "Staff can manage deleted_registrations" on public.deleted_registrations for all using (true);

-- 4. Multi-Role Support for Club Members & Role Extension
alter table public.user_profiles drop constraint if exists user_profiles_role_check;
alter table public.user_profiles
  add column if not exists assigned_to_name text,
  add column if not exists initial_password text,
  add column if not exists is_voided boolean not null default false,
  add column if not exists voided_at timestamptz,
  add column if not exists voided_reason text;

create table if not exists public.member_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  team text not null,
  position text not null,
  created_at timestamptz not null default now(),
  unique (user_id, team, position)
);

alter table public.member_roles enable row level security;
create policy "Allow read member_roles to all" on public.member_roles for select using (true);
create policy "Allow manage member_roles to staff" on public.member_roles for all using (true);

-- 5. Statistics Auto-Sync Procedure
create or replace function public.recompute_event_statistics(p_event_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_registered integer;
  v_approved integer;
  v_pending integer;
  v_attended integer;
begin
  select count(*) into v_registered from public.registrations where event_id = p_event_id;
  select count(*) into v_approved from public.registrations where event_id = p_event_id and registration_status in ('verified', 'checked_in');
  select count(*) into v_pending from public.registrations where event_id = p_event_id and registration_status = 'pending';
  select count(*) into v_attended from public.registrations where event_id = p_event_id and registration_status = 'checked_in';

  insert into public.event_statistics (
    event_id,
    registered_count,
    approved_count,
    pending_count,
    attended_count,
    updated_at
  ) values (
    p_event_id,
    v_registered,
    v_approved,
    v_pending,
    v_attended,
    now()
  )
  on conflict (event_id) do update set
    registered_count = excluded.registered_count,
    approved_count = excluded.approved_count,
    pending_count = excluded.pending_count,
    attended_count = excluded.attended_count,
    updated_at = now();
end;
$$;

-- 6. Trigger to refresh stats on registrations change
create or replace function public.trigger_refresh_event_stats()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recompute_event_statistics(old.event_id);
    return old;
  else
    perform public.recompute_event_statistics(new.event_id);
    return new;
  end if;
end;
$$;

drop trigger if exists trg_registrations_stats_sync on public.registrations;
create trigger trg_registrations_stats_sync
after insert or update or delete on public.registrations
for each row execute function public.trigger_refresh_event_stats();

-- 7. Step 1 of QR Scanner: Lookup participant without marking attendance
create or replace function public.verify_qr_token_details(
  p_qr_token text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_reg record;
  v_event record;
  v_prior_checkin record;
begin
  select *
  into v_reg
  from public.registrations
  where qr_token = trim(p_qr_token);

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_QR',
      'message', 'Invalid QR code. No registration matches this token.'
    );
  end if;

  select * into v_event from public.events where id = v_reg.event_id;

  -- Check if already checked in
  if v_reg.registration_status = 'checked_in' then
    select * into v_prior_checkin
    from public.checkins
    where registration_id = v_reg.id and status in ('approved', 'overridden')
    order by scan_timestamp desc
    limit 1;

    return jsonb_build_object(
      'success', true,
      'is_already_checked_in', true,
      'message', 'Participant has already checked in.',
      'prior_checkin_time', v_prior_checkin.scan_timestamp,
      'prior_scanned_by', v_prior_checkin.scanned_by_name,
      'participant', jsonb_build_object(
        'id', v_reg.id,
        'full_name', v_reg.full_name,
        'vit_registration_number', v_reg.vit_registration_number,
        'college_email', v_reg.college_email,
        'branch', v_reg.branch_name,
        'registration_number', v_reg.registration_number,
        'status', v_reg.registration_status,
        'registration_source', v_reg.registration_source
      )
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'is_already_checked_in', false,
    'message', 'Participant found. Ready for attendance confirmation.',
    'participant', jsonb_build_object(
      'id', v_reg.id,
      'full_name', v_reg.full_name,
      'vit_registration_number', v_reg.vit_registration_number,
      'college_email', v_reg.college_email,
      'branch', v_reg.branch_name,
      'registration_number', v_reg.registration_number,
      'status', v_reg.registration_status,
      'registration_source', v_reg.registration_source
    )
  );
end;
$$;

-- 8. Step 2 of QR Scanner: Confirm Attendance Action
create or replace function public.confirm_attendance_action(
  p_registration_id uuid,
  p_scanner_user_id uuid,
  p_scanner_name text,
  p_scanner_role text,
  p_is_override boolean default false,
  p_override_reason text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_reg record;
  v_event record;
  v_prior_checkin record;
begin
  select *
  into v_reg
  from public.registrations
  where id = p_registration_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'message', 'Registration not found.');
  end if;

  select * into v_event from public.events where id = v_reg.event_id;

  -- Guard if already checked in and not overridden
  if v_reg.registration_status = 'checked_in' and not p_is_override then
    select * into v_prior_checkin
    from public.checkins
    where registration_id = v_reg.id and status in ('approved', 'overridden')
    order by scan_timestamp desc
    limit 1;

    return jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_CHECKED_IN',
      'message', 'Participant has ALREADY checked in.',
      'prior_checkin_time', v_prior_checkin.scan_timestamp,
      'prior_scanned_by', v_prior_checkin.scanned_by_name
    );
  end if;

  -- Update registration status
  update public.registrations
  set registration_status = 'checked_in',
      override_reason = case when p_is_override then p_override_reason else override_reason end,
      overridden_by = case when p_is_override then p_scanner_user_id else overridden_by end,
      updated_at = now()
  where id = v_reg.id;

  -- Insert checkin record
  insert into public.checkins (
    registration_id,
    event_id,
    scanned_by,
    scanned_by_name,
    scanned_by_role,
    status,
    is_override,
    override_reason
  ) values (
    v_reg.id,
    v_reg.event_id,
    p_scanner_user_id,
    p_scanner_name,
    p_scanner_role,
    case when p_is_override then 'overridden' else 'approved' end,
    p_is_override,
    p_override_reason
  );

  -- Insert audit log
  insert into public.audit_logs (
    actor_user_id,
    actor_role,
    action,
    target_type,
    target_id,
    new_state,
    reason,
    metadata
  ) values (
    p_scanner_user_id,
    p_scanner_role,
    case when p_is_override then 'checkin_overridden' else 'attendance_confirmed' end,
    'registration',
    v_reg.id::text,
    jsonb_build_object('status', 'checked_in'),
    p_override_reason,
    jsonb_build_object(
      'vit_registration_number', v_reg.vit_registration_number,
      'registration_number', v_reg.registration_number,
      'is_override', p_is_override
    )
  );

  return jsonb_build_object(
    'success', true,
    'message', case when p_is_override then 'ATTENDANCE OVERRIDDEN & APPROVED' else 'ATTENDANCE CONFIRMED' end,
    'checkin_time', now(),
    'participant', jsonb_build_object(
      'id', v_reg.id,
      'full_name', v_reg.full_name,
      'vit_registration_number', v_reg.vit_registration_number,
      'college_email', v_reg.college_email,
      'branch', v_reg.branch_name,
      'registration_number', v_reg.registration_number,
      'status', 'checked_in',
      'registration_source', v_reg.registration_source
    )
  );
end;
$$;

-- 9. Complete Event & Clear Active Registrations Procedure (Top-6 Only)
create or replace function public.archive_and_clear_event(
  p_event_id uuid,
  p_actor_id uuid,
  p_actor_role text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_event record;
  v_deleted_count integer;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then
    return jsonb_build_object('success', false, 'error_code', 'EVENT_NOT_FOUND', 'message', 'Event not found.');
  end if;

  -- 1. Mark event as archived
  update public.events
  set status = 'past',
      is_registration_open = false,
      updated_at = now()
  where id = p_event_id;

  -- 2. Count active registrations to be cleared
  select count(*) into v_deleted_count from public.registrations where event_id = p_event_id;

  -- 3. Clear active registrations for this event (permanently keeping members, roles, audit_logs, events history)
  delete from public.checkins where event_id = p_event_id;
  delete from public.payments where event_id = p_event_id;
  delete from public.registrations where event_id = p_event_id;

  -- 4. Audit Log Entry
  insert into public.audit_logs (
    actor_user_id,
    actor_role,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    p_actor_id,
    p_actor_role,
    'event_archived_and_cleared',
    'event',
    p_event_id::text,
    jsonb_build_object(
      'event_title', v_event.title,
      'cleared_registrations_count', v_deleted_count,
      'archived_at', now()
    )
  );

  return jsonb_build_object(
    'success', true,
    'message', 'Event successfully archived and active registrations reset.',
    'cleared_count', v_deleted_count
  );
end;
$$;

-- 10. Default Schema Permissions & Grants
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all functions in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
