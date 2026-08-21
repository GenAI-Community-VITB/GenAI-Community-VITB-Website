-- ============================================================================
-- SUPABASE SECURITY LINTER REMEDIATION SCRIPT
-- Resolves all linter warnings for:
-- 1. function_search_path_mutable (Set immutable search_path)
-- 2. anon_security_definer_function_executable (Restrict RPC execution to service_role)
-- 3. authenticated_security_definer_function_executable (Restrict RPC execution to service_role)
-- 4. rls_policy_always_true (Remove overly permissive RLS policies)
--
-- Instructions: Copy and run this entire script in your Supabase SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. CLEAN DROP OF RPC PROCEDURES TO PREVENT 42P13 PARAMETER DEFAULT CONFLICTS
-- Note: set_updated_at is altered in-place below (not dropped) to preserve triggers.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.atomic_register_student(uuid, text, text, uuid, text, text, text, text, numeric, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.atomic_register_participant(uuid, text, text, uuid, text, text, text, text, numeric, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.atomic_scan_and_checkin(text, uuid, text, text, boolean, text);
DROP FUNCTION IF EXISTS public.create_clean_staff_account(text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.seed_club_staff(text, text, text, text, text, text, text);

-- ----------------------------------------------------------------------------
-- 1. RECREATE FUNCTIONS WITH IMMUTABLE SEARCH PATH (function_search_path_mutable)
-- ----------------------------------------------------------------------------

-- A. set_updated_at trigger function (altered in-place to preserve table triggers)
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;

-- B. atomic_register_student stored procedure
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
set search_path = public, pg_temp
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
  v_reg_number := 'GENAI-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(v_next_val::text, 4, '0');

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

-- C. atomic_register_participant alias
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
set search_path = public, pg_temp
as $$
begin
  return public.atomic_register_student(
    p_event_id, p_full_name, p_vit_reg, p_branch_id, p_branch_name,
    p_personal_email, p_college_email, p_phone, p_amount, p_transaction_id,
    p_drive_file_id, p_drive_file_name, p_drive_mime_type, p_drive_folder_id
  );
end;
$$;

-- D. atomic_scan_and_checkin
create or replace function public.atomic_scan_and_checkin(
  p_qr_token text,
  p_scanner_user_id uuid,
  p_scanner_name text default 'Scanner Volunteer',
  p_scanner_role text default 'volunteer',
  p_is_override boolean default false,
  p_override_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reg record;
  v_payment record;
  v_already_checked boolean;
  v_checkin_id uuid;
begin
  select r.*, e.title as event_title, e.event_date
  into v_reg
  from public.registrations r
  join public.events e on e.id = r.event_id
  where r.qr_pass_token = p_qr_token;

  if not found then
    return jsonb_build_object(
      'status', 'INVALID',
      'message', 'No valid registration pass found for this QR token.'
    );
  end if;

  select exists(
    select 1 from public.checkins where registration_id = v_reg.id
  ) into v_already_checked;

  if v_already_checked then
    return jsonb_build_object(
      'status', 'ALREADY_CHECKED_IN',
      'message', 'Participant has already checked in to this event.',
      'registration', jsonb_build_object(
        'id', v_reg.id,
        'registration_number', v_reg.registration_number,
        'full_name', v_reg.full_name,
        'vit_registration_number', v_reg.vit_registration_number,
        'event_title', v_reg.event_title
      )
    );
  end if;

  select * into v_payment
  from public.payments
  where registration_id = v_reg.id;

  if (v_payment.payment_status is distinct from 'verified') and not p_is_override then
    return jsonb_build_object(
      'status', 'PAYMENT_PENDING',
      'message', 'Payment screenshot is still pending verification.',
      'registration', jsonb_build_object(
        'id', v_reg.id,
        'registration_number', v_reg.registration_number,
        'full_name', v_reg.full_name,
        'vit_registration_number', v_reg.vit_registration_number,
        'payment_status', coalesce(v_payment.payment_status, 'unpaid')
      )
    );
  end if;

  insert into public.checkins (
    registration_id,
    event_id,
    scanned_by,
    scanned_at,
    is_manual_override,
    override_reason
  ) values (
    v_reg.id,
    v_reg.event_id,
    p_scanner_user_id,
    now(),
    p_is_override,
    p_override_reason
  ) returning id into v_checkin_id;

  update public.registrations
  set registration_status = 'checked_in',
      updated_at = now()
  where id = v_reg.id;

  insert into public.audit_logs (
    actor_id,
    actor_role,
    action,
    target_type,
    target_id,
    new_state
  ) values (
    p_scanner_user_id,
    p_scanner_role,
    'checkin_recorded',
    'checkin',
    v_checkin_id::text,
    jsonb_build_object(
      'registration_number', v_reg.registration_number,
      'is_override', p_is_override,
      'override_reason', p_override_reason
    )
  );

  return jsonb_build_object(
    'status', 'SUCCESS',
    'message', 'Check-in verified successfully.',
    'registration', jsonb_build_object(
      'id', v_reg.id,
      'registration_number', v_reg.registration_number,
      'full_name', v_reg.full_name,
      'vit_registration_number', v_reg.vit_registration_number,
      'event_title', v_reg.event_title
    )
  );
end;
$$;

-- E. create_clean_staff_account & seed_club_staff
create or replace function public.create_clean_staff_account(
  p_email text,
  p_full_name text,
  p_assigned_to text,
  p_role text,
  p_team text,
  p_position text,
  p_password text default 'GenAICommunity@2026-27'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = lower(trim(p_email));

  if v_user_id is null then
    v_user_id := gen_random_uuid();
    insert into auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      lower(trim(p_email)),
      crypt(p_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', p_full_name, 'role', p_role),
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
  else
    update auth.users
    set encrypted_password = crypt(p_password, gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where id = v_user_id;
  end if;

  insert into public.user_profiles (
    id, email, full_name, assigned_to, role, team, position, plain_password, is_active
  ) values (
    v_user_id, lower(trim(p_email)), p_full_name, p_assigned_to, p_role, p_team, p_position, p_password, true
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    assigned_to = excluded.assigned_to,
    role = excluded.role,
    team = excluded.team,
    position = excluded.position,
    plain_password = excluded.plain_password,
    is_active = true,
    updated_at = now();

  return v_user_id;
end;
$$;

create or replace function public.seed_club_staff(
  p_email text,
  p_full_name text,
  p_assigned_to text,
  p_role text,
  p_team text,
  p_position text,
  p_password text default 'GenAICommunity@2026-27'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return public.create_clean_staff_account(
    p_email, p_full_name, p_assigned_to, p_role, p_team, p_position, p_password
  );
end;
$$;


-- ----------------------------------------------------------------------------
-- 2. RESTRICT RPC EXECUTION (anon & authenticated security definer executables)
-- Revokes execution from public, anon, and authenticated roles so these sensitive
-- procedures can ONLY be executed via backend Next.js API routes (service_role).
-- ----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.atomic_register_student(uuid, text, text, uuid, text, text, text, text, numeric, text, text, text, text, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.atomic_register_participant(uuid, text, text, uuid, text, text, text, text, numeric, text, text, text, text, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.atomic_scan_and_checkin(text, uuid, text, text, boolean, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_clean_staff_account(text, text, text, text, text, text, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_club_staff(text, text, text, text, text, text, text) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.atomic_register_student(uuid, text, text, uuid, text, text, text, text, numeric, text, text, text, text, text) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.atomic_register_participant(uuid, text, text, uuid, text, text, text, text, numeric, text, text, text, text, text) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.atomic_scan_and_checkin(text, uuid, text, text, boolean, text) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.create_clean_staff_account(text, text, text, text, text, text, text) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.seed_club_staff(text, text, text, text, text, text, text) TO service_role, postgres;


-- ----------------------------------------------------------------------------
-- 3. FIX OVERLY PERMISSIVE RLS POLICIES (rls_policy_always_true)
-- ----------------------------------------------------------------------------

-- A. Table: member_roles
ALTER TABLE IF EXISTS public.member_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow manage member_roles to staff" ON public.member_roles;
DROP POLICY IF EXISTS "Staff manage member_roles" ON public.member_roles;
DROP POLICY IF EXISTS "Public read member_roles" ON public.member_roles;
DROP POLICY IF EXISTS "Allow read member_roles to all" ON public.member_roles;

-- Public can read member roles
CREATE POLICY "Public read member_roles" ON public.member_roles
  FOR SELECT TO anon, authenticated
  USING (true);

-- Authenticated staff can manage member roles
CREATE POLICY "Staff manage member_roles" ON public.member_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- B. Table: password_reset_requests
ALTER TABLE IF EXISTS public.password_reset_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert to password_reset_requests" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Allow staff read/update password_reset_requests" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Public insert valid password_reset_requests" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Staff manage password_reset_requests" ON public.password_reset_requests;

-- Anyone can submit a password reset request with valid, non-empty payload
CREATE POLICY "Public insert valid password_reset_requests" ON public.password_reset_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL AND length(trim(email)) > 3 AND
    student_name IS NOT NULL AND length(trim(student_name)) > 1
  );

-- Only authenticated staff members can view and resolve password reset requests
CREATE POLICY "Staff manage password_reset_requests" ON public.password_reset_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- ----------------------------------------------------------------------------
-- 4. RELOAD SCHEMA CACHE
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
