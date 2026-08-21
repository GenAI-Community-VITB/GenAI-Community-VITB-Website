-- ============================================================================
-- GenAI Community VIT Bhopal - Complete Master Schema
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 0. SET_UPDATED_AT TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
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
-- 1. TEAMS, MEMBERS, PROJECTS
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

drop trigger if exists teams_updated_at on public.teams;
create trigger teams_updated_at before update on public.teams for each row execute function public.set_updated_at();

drop trigger if exists members_updated_at on public.members;
create trigger members_updated_at before update on public.members for each row execute function public.set_updated_at();

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. USER PROFILES & ROLE SYSTEM
-- ----------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null check (role in ('tech', 'finance', 'volunteer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists user_profiles_updated_at on public.user_profiles;
create trigger user_profiles_updated_at before update on public.user_profiles for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. BRANCHES (VIT Bhopal B.Tech Programmes)
-- ----------------------------------------------------------------------------
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists branches_updated_at on public.branches;
create trigger branches_updated_at before update on public.branches for each row execute function public.set_updated_at();

insert into public.branches (name, code, display_order) values
  ('B.Tech. Computer Science & Engineering', 'CSE', 1),
  ('B.Tech. Computer Science & Engineering (Artificial Intelligence & Machine Learning)', 'CSE-AIML', 2),
  ('B.Tech. Computer Science & Engineering (Cyber Security & Digital Forensics)', 'CSE-CYBER', 3),
  ('B.Tech. Computer Science & Engineering (Cloud Computing & Automation)', 'CSE-CLOUD', 4),
  ('B.Tech. Computer Science & Engineering (E-Commerce Technology)', 'CSE-ECOMM', 5),
  ('B.Tech. Computer Science & Engineering (Education Technology)', 'CSE-EDUTECH', 6),
  ('B.Tech. Computer Science & Engineering (Gaming Technology)', 'CSE-GAMING', 7),
  ('B.Tech. Computer Science & Engineering (Health Informatics)', 'CSE-HEALTH', 8),
  ('B.Tech. Computer Science & Engineering (Artificial Intelligence, Technology & Leadership Studies - ATLS)', 'CSE-ATLS', 9),
  ('B.Tech. Electronics & Communication Engineering', 'ECE', 10),
  ('B.Tech. Electronics & Communication Engineering (Artificial Intelligence & Cybernetics)', 'ECE-AIC', 11),
  ('B.Tech. Electrical & Computer Engineering', 'ELE-CE', 12),
  ('B.Tech. Mechanical Engineering', 'MECH', 13),
  ('B.Tech. Mechanical Engineering (Artificial Intelligence & Robotics)', 'MECH-AIR', 14),
  ('B.Tech. Aerospace Engineering', 'AERO', 15),
  ('B.Tech. Bioengineering', 'BIO', 16)
on conflict (code) do update
  set name = excluded.name,
      display_order = excluded.display_order,
      updated_at = now();

-- ----------------------------------------------------------------------------
-- 4. EVENTS TABLE (BASE + ENHANCEMENTS)
-- ----------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  description text not null,
  venue text not null,
  event_date timestamptz not null,
  registration_fee numeric(10,2) not null default 200.00,
  max_capacity integer not null default 2000,
  registration_deadline timestamptz,
  event_start_time timestamptz,
  event_end_time timestamptz,
  is_registration_open boolean not null default true,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'past')),
  image_url text,
  register_url text,
  upi_id text default 'genai.community@okaxis',
  upi_qr_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events
  add column if not exists slug text,
  add column if not exists registration_fee numeric(10,2) not null default 200.00,
  add column if not exists max_capacity integer not null default 2000,
  add column if not exists registration_deadline timestamptz,
  add column if not exists event_start_time timestamptz,
  add column if not exists event_end_time timestamptz,
  add column if not exists is_registration_open boolean not null default true,
  add column if not exists upi_id text default 'genai.community@okaxis',
  add column if not exists upi_qr_image_url text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_slug_key'
  ) then
    alter table public.events add constraint events_slug_key unique (slug);
  end if;
exception
  when others then null;
end $$;

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at before update on public.events for each row execute function public.set_updated_at();

-- Note: Events are created dynamically by administrators via the /admin panel.


-- ----------------------------------------------------------------------------
-- 5. REGISTRATIONS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  registration_number text not null unique,
  event_id uuid not null references public.events(id) on delete cascade,
  full_name text not null,
  vit_registration_number text not null,
  branch_id uuid references public.branches(id) on delete set null,
  branch_name text not null,
  personal_email text not null,
  college_email text not null,
  phone_number text not null,
  registration_status text not null default 'pending' check (
    registration_status in ('pending', 'verified', 'rejected', 'cancelled', 'checked_in')
  ),
  qr_token text unique,
  qr_generated_at timestamptz,
  override_reason text,
  overridden_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint unique_event_vit_reg unique (event_id, vit_registration_number),
  constraint unique_event_college_email unique (event_id, college_email),
  constraint unique_event_personal_email unique (event_id, personal_email)
);

drop trigger if exists registrations_updated_at on public.registrations;
create trigger registrations_updated_at before update on public.registrations for each row execute function public.set_updated_at();

create index if not exists idx_registrations_event_id on public.registrations(event_id);
create index if not exists idx_registrations_status on public.registrations(registration_status);
create index if not exists idx_registrations_qr_token on public.registrations(qr_token) where qr_token is not null;
create index if not exists idx_registrations_vit_reg on public.registrations(vit_registration_number);
create index if not exists idx_registrations_college_email on public.registrations(college_email);

-- ----------------------------------------------------------------------------
-- 6. PAYMENTS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  amount numeric(10,2) not null default 200.00,
  transaction_id text not null,
  payment_status text not null default 'pending' check (
    payment_status in ('pending', 'verified', 'rejected')
  ),
  drive_file_id text not null,
  drive_file_name text not null,
  drive_mime_type text not null,
  drive_folder_id text not null,
  drive_view_url text,
  rejection_reason text,
  rejection_explanation text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint unique_event_transaction unique (event_id, transaction_id)
);

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at before update on public.payments for each row execute function public.set_updated_at();

create index if not exists idx_payments_registration_id on public.payments(registration_id);
create index if not exists idx_payments_status on public.payments(payment_status);
create index if not exists idx_payments_transaction_id on public.payments(transaction_id);

-- ----------------------------------------------------------------------------
-- 7. CHECK-INS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  scanned_by uuid not null references auth.users(id) on delete set null,
  scanned_by_name text,
  scanned_by_role text,
  status text not null check (
    status in ('approved', 'rejected_already_checked_in', 'rejected_invalid_time', 'rejected_unverified', 'overridden')
  ),
  is_override boolean not null default false,
  override_reason text,
  scan_timestamp timestamptz not null default now()
);

create index if not exists idx_checkins_reg_id on public.checkins(registration_id);
create index if not exists idx_checkins_event_id on public.checkins(event_id);
create index if not exists idx_checkins_scan_timestamp on public.checkins(scan_timestamp);

-- ----------------------------------------------------------------------------
-- 8. AUDIT LOGS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  actor_role text not null default 'system',
  action text not null,
  target_type text not null,
  target_id text,
  previous_state jsonb,
  new_state jsonb,
  reason text,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_target on public.audit_logs(target_type, target_id);
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_user_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

-- ----------------------------------------------------------------------------
-- 9. EMAIL LOGS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references public.registrations(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  recipient_email text not null,
  email_type text not null check (
    email_type in ('submission_received', 'payment_approved_qr', 'payment_rejected', 'custom_email', 'finance_reminder', 'test_email')
  ),
  subject text not null,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role text,
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  metadata jsonb default '{}'::jsonb,
  sent_at timestamptz not null default now()
);

create index if not exists idx_email_logs_recipient on public.email_logs(recipient_email);
create index if not exists idx_email_logs_registration_id on public.email_logs(registration_id);
create index if not exists idx_email_logs_status on public.email_logs(status);
create index if not exists idx_email_logs_sent_at on public.email_logs(sent_at desc);

-- ----------------------------------------------------------------------------
-- 10. SYNC FAILURES
-- ----------------------------------------------------------------------------
create table if not exists public.sync_failures (
  id uuid primary key default gen_random_uuid(),
  service text not null,
  operation text not null,
  payload jsonb not null,
  error_message text not null,
  retry_count integer not null default 0,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists sync_failures_updated_at on public.sync_failures;
create trigger sync_failures_updated_at before update on public.sync_failures for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 11. ATOMIC STORED PROCEDURES (RPCs)
-- ----------------------------------------------------------------------------

create or replace function public.atomic_register_student(
  p_event_id uuid,
  p_full_name text,
  p_vit_reg text,
  p_branch_id uuid default null,
  p_branch_name text default '',
  p_personal_email text default '',
  p_college_email text default '',
  p_phone text default '',
  p_amount numeric default 200.00,
  p_transaction_id text default '',
  p_drive_file_id text default '',
  p_drive_file_name text default '',
  p_drive_mime_type text default '',
  p_drive_folder_id text default ''
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_event record;
  v_current_count integer;
  v_reg_number text;
  v_next_val integer;
  v_reg_id uuid;
  v_payment_id uuid;
begin
  select * into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'EVENT_NOT_FOUND', 'message', 'Event does not exist.');
  end if;

  if not v_event.is_registration_open then
    return jsonb_build_object('success', false, 'error_code', 'REGISTRATION_CLOSED', 'message', 'Registration is currently closed for this event.');
  end if;

  if v_event.registration_deadline is not null and now() > v_event.registration_deadline then
    return jsonb_build_object('success', false, 'error_code', 'DEADLINE_PASSED', 'message', 'The registration deadline for this event has passed.');
  end if;

  select count(*) into v_current_count
  from public.registrations
  where event_id = p_event_id
    and registration_status in ('pending', 'verified', 'checked_in');

  if v_current_count >= v_event.max_capacity then
    return jsonb_build_object('success', false, 'error_code', 'CAPACITY_REACHED', 'message', 'Registration Closed. This event has reached maximum capacity.');
  end if;

  select count(*) + 1 into v_next_val from public.registrations where event_id = p_event_id;
  v_reg_number := 'GENAI-' || lpad(v_next_val::text, 4, '0');

  insert into public.registrations (
    registration_number,
    event_id,
    full_name,
    vit_registration_number,
    branch_id,
    branch_name,
    personal_email,
    college_email,
    phone_number,
    registration_status
  ) values (
    v_reg_number,
    p_event_id,
    p_full_name,
    upper(trim(p_vit_reg)),
    p_branch_id,
    p_branch_name,
    lower(trim(p_personal_email)),
    lower(trim(p_college_email)),
    trim(p_phone),
    'pending'
  ) returning id into v_reg_id;

  insert into public.payments (
    registration_id,
    event_id,
    amount,
    transaction_id,
    payment_status,
    drive_file_id,
    drive_file_name,
    drive_mime_type,
    drive_folder_id
  ) values (
    v_reg_id,
    p_event_id,
    p_amount,
    trim(p_transaction_id),
    'pending',
    p_drive_file_id,
    p_drive_file_name,
    p_drive_mime_type,
    p_drive_folder_id
  ) returning id into v_payment_id;

  insert into public.audit_logs (
    actor_role,
    action,
    target_type,
    target_id,
    new_state,
    metadata
  ) values (
    'student',
    'registration_submitted',
    'registration',
    v_reg_id::text,
    jsonb_build_object('registration_number', v_reg_number, 'status', 'pending', 'amount', p_amount),
    jsonb_build_object('event_id', p_event_id, 'vit_registration_number', upper(trim(p_vit_reg)))
  );

  return jsonb_build_object(
    'success', true,
    'registration_id', v_reg_id,
    'registration_number', v_reg_number,
    'payment_id', v_payment_id
  );
exception
  when unique_violation then
    if sqlerrm like '%unique_event_vit_reg%' then
      return jsonb_build_object('success', false, 'error_code', 'DUPLICATE_VIT_REG', 'message', 'This VIT registration number has already registered for this event.');
    elsif sqlerrm like '%unique_event_college_email%' then
      return jsonb_build_object('success', false, 'error_code', 'DUPLICATE_COLLEGE_EMAIL', 'message', 'This college email has already been registered for this event.');
    elsif sqlerrm like '%unique_event_personal_email%' then
      return jsonb_build_object('success', false, 'error_code', 'DUPLICATE_PERSONAL_EMAIL', 'message', 'This personal email has already been registered for this event.');
    elsif sqlerrm like '%unique_event_transaction%' then
      return jsonb_build_object('success', false, 'error_code', 'DUPLICATE_TRANSACTION', 'message', 'This transaction ID has already been submitted.');
    else
      return jsonb_build_object('success', false, 'error_code', 'DUPLICATE_ENTRY', 'message', 'A duplicate registration detail was detected.');
    end if;
  when others then
    return jsonb_build_object('success', false, 'error_code', 'INTERNAL_ERROR', 'message', sqlerrm);
end;
$$;

create or replace function public.atomic_register_participant(
  p_event_id uuid,
  p_full_name text,
  p_vit_reg text,
  p_branch_id uuid default null,
  p_branch_name text default '',
  p_personal_email text default '',
  p_college_email text default '',
  p_phone text default '',
  p_amount numeric default 200.00,
  p_transaction_id text default '',
  p_drive_file_id text default '',
  p_drive_file_name text default '',
  p_drive_mime_type text default '',
  p_drive_folder_id text default ''
)
returns jsonb
language plpgsql
security definer
as $$
begin
  return public.atomic_register_student(
    p_event_id, p_full_name, p_vit_reg, p_branch_id, p_branch_name,
    p_personal_email, p_college_email, p_phone, p_amount, p_transaction_id,
    p_drive_file_id, p_drive_file_name, p_drive_mime_type, p_drive_folder_id
  );
end;
$$;

grant execute on function public.atomic_register_student to anon, authenticated, service_role;
grant execute on function public.atomic_register_participant to anon, authenticated, service_role;

create or replace function public.atomic_scan_and_checkin(
  p_qr_token text,
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
  where qr_token = trim(p_qr_token)
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_QR',
      'message', 'Invalid QR code. No registration matches this token.'
    );
  end if;

  select * into v_event
  from public.events
  where id = v_reg.event_id;

  if not p_is_override then
    if v_event.event_start_time is not null and now() < v_event.event_start_time then
      return jsonb_build_object(
        'success', false,
        'error_code', 'EVENT_NOT_STARTED',
        'message', 'QR check-in is not open yet. Event has not started.',
        'participant', jsonb_build_object(
          'full_name', v_reg.full_name,
          'vit_registration_number', v_reg.vit_registration_number,
          'branch', v_reg.branch_name,
          'registration_number', v_reg.registration_number
        )
      );
    end if;

    if v_event.event_end_time is not null and now() > v_event.event_end_time then
      return jsonb_build_object(
        'success', false,
        'error_code', 'EVENT_ENDED',
        'message', 'QR check-in has closed. Event timing has passed.',
        'participant', jsonb_build_object(
          'full_name', v_reg.full_name,
          'vit_registration_number', v_reg.vit_registration_number,
          'branch', v_reg.branch_name,
          'registration_number', v_reg.registration_number
        )
      );
    end if;

    if v_reg.registration_status != 'verified' and v_reg.registration_status != 'checked_in' then
      return jsonb_build_object(
        'success', false,
        'error_code', 'NOT_VERIFIED',
        'message', 'Participant registration is not verified (status: ' || v_reg.registration_status || ').',
        'participant', jsonb_build_object(
          'full_name', v_reg.full_name,
          'vit_registration_number', v_reg.vit_registration_number,
          'branch', v_reg.branch_name,
          'registration_number', v_reg.registration_number,
          'status', v_reg.registration_status
        )
      );
    end if;
  end if;

  if v_reg.registration_status = 'checked_in' and not p_is_override then
    select * into v_prior_checkin
    from public.checkins
    where registration_id = v_reg.id and status in ('approved', 'overridden')
    order by scan_timestamp desc
    limit 1;

    insert into public.checkins (
      registration_id,
      event_id,
      scanned_by,
      scanned_by_name,
      scanned_by_role,
      status,
      is_override
    ) values (
      v_reg.id,
      v_reg.event_id,
      p_scanner_user_id,
      p_scanner_name,
      p_scanner_role,
      'rejected_already_checked_in',
      false
    );

    insert into public.audit_logs (
      actor_user_id,
      actor_role,
      action,
      target_type,
      target_id,
      metadata
    ) values (
      p_scanner_user_id,
      p_scanner_role,
      'already_checked_in',
      'registration',
      v_reg.id::text,
      jsonb_build_object('vit_registration_number', v_reg.vit_registration_number, 'prior_checkin', v_prior_checkin.scan_timestamp)
    );

    return jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_CHECKED_IN',
      'message', 'Participant has ALREADY checked in.',
      'prior_checkin_time', v_prior_checkin.scan_timestamp,
      'prior_scanned_by', v_prior_checkin.scanned_by_name,
      'participant', jsonb_build_object(
        'full_name', v_reg.full_name,
        'vit_registration_number', v_reg.vit_registration_number,
        'branch', v_reg.branch_name,
        'registration_number', v_reg.registration_number,
        'status', 'checked_in'
      )
    );
  end if;

  update public.registrations
  set registration_status = 'checked_in',
      override_reason = case when p_is_override then p_override_reason else override_reason end,
      overridden_by = case when p_is_override then p_scanner_user_id else overridden_by end,
      updated_at = now()
  where id = v_reg.id;

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
    case when p_is_override then 'checkin_overridden' else 'entry_allowed' end,
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
    'message', case when p_is_override then 'CHECK-IN OVERRIDDEN & APPROVED' else 'ENTRY APPROVED' end,
    'checkin_time', now(),
    'is_override', p_is_override,
    'participant', jsonb_build_object(
      'full_name', v_reg.full_name,
      'vit_registration_number', v_reg.vit_registration_number,
      'branch', v_reg.branch_name,
      'registration_number', v_reg.registration_number,
      'status', 'checked_in'
    )
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 11.5 MASTER UPGRADE TABLES (STATISTICS, MULTI-ROLE & DELETED ARCHIVE)
-- ----------------------------------------------------------------------------

create table if not exists public.event_statistics (
  event_id uuid primary key references public.events(id) on delete cascade,
  registered_count integer not null default 0,
  approved_count integer not null default 0,
  pending_count integer not null default 0,
  attended_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.registrations 
  add column if not exists registration_source text not null default 'online',
  add column if not exists college text not null default 'VIT Bhopal University',
  add column if not exists course text not null default 'B.Tech',
  add column if not exists academic_year text not null default '2024-2028';

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

-- ----------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
alter table public.teams enable row level security;
alter table public.members enable row level security;
alter table public.projects enable row level security;
alter table public.events enable row level security;
alter table public.user_profiles enable row level security;
alter table public.branches enable row level security;
alter table public.registrations enable row level security;
alter table public.payments enable row level security;
alter table public.checkins enable row level security;
alter table public.audit_logs enable row level security;
alter table public.email_logs enable row level security;
alter table public.sync_failures enable row level security;
alter table public.event_statistics enable row level security;
alter table public.deleted_registrations enable row level security;
alter table public.member_roles enable row level security;

-- Policies
drop policy if exists "Public read teams" on public.teams;
create policy "Public read teams" on public.teams for select using (true);

drop policy if exists "Public read members" on public.members;
create policy "Public read members" on public.members for select using (true);

drop policy if exists "Public read projects" on public.projects;
create policy "Public read projects" on public.projects for select using (true);

drop policy if exists "Public read events" on public.events;
create policy "Public read events" on public.events for select using (true);

drop policy if exists "Public read branches" on public.branches;
create policy "Public read branches" on public.branches for select using (true);

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile" on public.user_profiles for select to authenticated
using (auth.uid() = id);

drop policy if exists "Tech full manage user_profiles" on public.user_profiles;
create policy "Tech full manage user_profiles" on public.user_profiles for all to authenticated
using (
  exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'tech' and is_active = true
  )
)
with check (
  exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'tech' and is_active = true
  )
);

drop policy if exists "Staff can view registrations" on public.registrations;
create policy "Staff can view registrations" on public.registrations for select to authenticated
using (
  exists (
    select 1 from public.user_profiles
    where id = auth.uid() and is_active = true
  )
);

drop policy if exists "Tech and Finance view payments" on public.payments;
create policy "Tech and Finance view payments" on public.payments for select to authenticated
using (
  exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role in ('tech', 'finance') and is_active = true
  )
);

drop policy if exists "Staff view and insert checkins" on public.checkins;
create policy "Staff view and insert checkins" on public.checkins for all to authenticated
using (
  exists (
    select 1 from public.user_profiles
    where id = auth.uid() and is_active = true
  )
)
with check (
  exists (
    select 1 from public.user_profiles
    where id = auth.uid() and is_active = true
  )
);

drop policy if exists "Tech can view audit logs" on public.audit_logs;
create policy "Tech can view audit logs" on public.audit_logs for select to authenticated
using (
  exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'tech' and is_active = true
  )
);

drop policy if exists "Tech and Finance view email logs" on public.email_logs;
create policy "Tech and Finance view email logs" on public.email_logs for select to authenticated
using (
  exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role in ('tech', 'finance') and is_active = true
  )
);

-- ----------------------------------------------------------------------------
-- 13. SYSTEM FAILURES TABLE & SOFT DELETE COLUMNS (MIGRATION ADDITIONS)
-- ----------------------------------------------------------------------------
create table if not exists public.system_failures (
  id uuid primary key default gen_random_uuid(),
  service text not null default 'system',
  operation text not null default 'general_error',
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  error_message text not null,
  stack_trace text,
  user_affected text,
  event_affected text,
  payload jsonb default '{}'::jsonb,
  retry_count integer not null default 0,
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Soft delete & Audit additions on core operational tables
alter table if exists public.registrations
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists updated_at timestamptz default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

alter table if exists public.payments
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists updated_at timestamptz default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

alter table if exists public.events
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

alter table if exists public.checkins
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists updated_at timestamptz default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

-- ----------------------------------------------------------------------------
-- 14. PERMISSION GRANTS
-- ----------------------------------------------------------------------------
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all functions in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
