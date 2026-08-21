-- ============================================================================
-- GenAI Community VIT Bhopal - Event Registration, Payment Verification,
-- Role-Based Administration, QR Check-in & Audit System Migration
-- ============================================================================

-- Ensure pgcrypto is enabled
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 0. UPDATED_AT TRIGGER FUNCTION
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
-- 1. USER PROFILES & ROLE SYSTEM
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
-- 2. BRANCHES (VIT Bhopal B.Tech Programmes)
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

-- Seed official B.Tech programmes
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
-- 3. EVENTS TABLE (BASE + ENHANCEMENTS)
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

-- Add unique constraint on slug if not already present
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

-- Seed default "Test Event" (12 September 2026, ₹200, 2000 capacity)
insert into public.events (
  title,
  slug,
  description,
  venue,
  event_date,
  registration_fee,
  max_capacity,
  registration_deadline,
  event_start_time,
  event_end_time,
  is_registration_open,
  status,
  upi_id
) values (
  'Test Event',
  'test-event-2026',
  'Official flagship GenAI Community event at VIT Bhopal University. Explore generative AI workshops, developer keynotes, hands-on hack labs, and networking sessions.',
  'VIT Bhopal University Campus (Auditorium)',
  '2026-09-12 09:00:00+05:30',
  200.00,
  2000,
  null,
  null,
  null,
  true,
  'live',
  'genai.community@okaxis'
) on conflict (slug) do update set
  title = excluded.title,
  registration_fee = excluded.registration_fee,
  max_capacity = excluded.max_capacity,
  status = excluded.status,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 4. REGISTRATIONS TABLE
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

-- Performance & Lookup Indexes
create index if not exists idx_registrations_event_id on public.registrations(event_id);
create index if not exists idx_registrations_status on public.registrations(registration_status);
create index if not exists idx_registrations_qr_token on public.registrations(qr_token) where qr_token is not null;
create index if not exists idx_registrations_vit_reg on public.registrations(vit_registration_number);
create index if not exists idx_registrations_college_email on public.registrations(college_email);

-- ----------------------------------------------------------------------------
-- 5. PAYMENTS TABLE
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
-- 6. CHECK-INS TABLE
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
-- 7. AUDIT LOGS TABLE
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
-- 8. EMAIL LOGS TABLE
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
-- 9. SYNC FAILURES (FOR GOOGLE SHEETS / DRIVE RETRIES)
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
-- 10. ATOMIC STORED PROCEDURES (RPCs)
-- ----------------------------------------------------------------------------

-- Function 1: Atomic registration with concurrency control & capacity locking
create or replace function public.atomic_register_participant(
  p_event_id uuid,
  p_full_name text,
  p_vit_reg text,
  p_branch_id uuid,
  p_branch_name text,
  p_personal_email text,
  p_college_email text,
  p_phone text,
  p_amount numeric,
  p_transaction_id text,
  p_drive_file_id text,
  p_drive_file_name text,
  p_drive_mime_type text,
  p_drive_folder_id text
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
  -- 1. Lock event row for update to prevent capacity race conditions
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

  -- Count existing valid registrations (pending or verified or checked_in)
  select count(*) into v_current_count
  from public.registrations
  where event_id = p_event_id
    and registration_status in ('pending', 'verified', 'checked_in');

  if v_current_count >= v_event.max_capacity then
    return jsonb_build_object('success', false, 'error_code', 'CAPACITY_REACHED', 'message', 'Registration Closed. This event has reached maximum capacity.');
  end if;

  -- Generate sequential human-friendly registration number
  select count(*) + 1 into v_next_val from public.registrations where event_id = p_event_id;
  v_reg_number := 'GENAI-' || lpad(v_next_val::text, 4, '0');

  -- 2. Insert into registrations
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

  -- 3. Insert into payments
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

  -- 4. Audit log entry
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


-- Function 2: Atomic QR Scan & Check-in
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
  -- 1. Find registration by opaque QR token with atomic lock
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

  -- 2. Find associated event
  select * into v_event
  from public.events
  where id = v_reg.event_id;

  -- 3. Check event window if configured
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

    -- Must be verified
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

  -- 4. Check if already checked in
  if v_reg.registration_status = 'checked_in' and not p_is_override then
    select * into v_prior_checkin
    from public.checkins
    where registration_id = v_reg.id and status in ('approved', 'overridden')
    order by scan_timestamp desc
    limit 1;

    -- Record failed duplicate scan attempt
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

  -- 5. Mark checked in
  update public.registrations
  set registration_status = 'checked_in',
      override_reason = case when p_is_override then p_override_reason else override_reason end,
      overridden_by = case when p_is_override then p_scanner_user_id else overridden_by end,
      updated_at = now()
  where id = v_reg.id;

  -- 6. Insert approved checkin record
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

  -- 7. Audit log
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
-- 11. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
alter table public.user_profiles enable row level security;
alter table public.branches enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.payments enable row level security;
alter table public.checkins enable row level security;
alter table public.audit_logs enable row level security;
alter table public.email_logs enable row level security;
alter table public.sync_failures enable row level security;

-- Public read for branches & events
drop policy if exists "Public read branches" on public.branches;
create policy "Public read branches" on public.branches for select using (true);

drop policy if exists "Public read events" on public.events;
create policy "Public read events" on public.events for select using (true);

-- User profiles policies
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

-- Registrations policies:
-- Authenticated staff can view according to role
drop policy if exists "Staff can view registrations" on public.registrations;
create policy "Staff can view registrations" on public.registrations for select to authenticated
using (
  exists (
    select 1 from public.user_profiles
    where id = auth.uid() and is_active = true
  )
);

-- Payments policies:
-- Only Tech & Finance can view payment records
drop policy if exists "Tech and Finance view payments" on public.payments;
create policy "Tech and Finance view payments" on public.payments for select to authenticated
using (
  exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role in ('tech', 'finance') and is_active = true
  )
);

-- Checkins policies:
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

-- Audit logs policies:
-- Only Tech can view all audit logs
drop policy if exists "Tech can view audit logs" on public.audit_logs;
create policy "Tech can view audit logs" on public.audit_logs for select to authenticated
using (
  exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'tech' and is_active = true
  )
);

-- Email logs policies:
drop policy if exists "Tech and Finance view email logs" on public.email_logs;
create policy "Tech and Finance view email logs" on public.email_logs for select to authenticated
using (
  exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role in ('tech', 'finance') and is_active = true
  )
);

-- ----------------------------------------------------------------------------
-- 12. PERMISSION GRANTS (anon, authenticated, service_role)
-- ----------------------------------------------------------------------------
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all functions in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

