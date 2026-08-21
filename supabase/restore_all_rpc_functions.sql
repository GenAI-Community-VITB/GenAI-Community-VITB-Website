-- ============================================================================
-- SQL SCRIPT: Restore and Register all RPC Functions in Supabase Schema Cache
-- With explicit search_path and restricted service_role permissions
-- ============================================================================

-- 1. ATOMIC REGISTRATION STORED PROCEDURE (Called by public registration form via Next.js backend)
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

-- Alias for participant naming compatibility
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

-- Revoke from public / anon and grant only to service_role / postgres
REVOKE ALL ON FUNCTION public.atomic_register_student(uuid, text, text, uuid, text, text, text, text, numeric, text, text, text, text, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.atomic_register_participant(uuid, text, text, uuid, text, text, text, text, numeric, text, text, text, text, text) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.atomic_register_student(uuid, text, text, uuid, text, text, text, text, numeric, text, text, text, text, text) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.atomic_register_participant(uuid, text, text, uuid, text, text, text, text, numeric, text, text, text, text, text) TO service_role, postgres;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
