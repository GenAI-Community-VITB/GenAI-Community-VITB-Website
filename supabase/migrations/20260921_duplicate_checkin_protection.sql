-- ============================================================================
-- Migration: Duplicate Checkin Protection & Concurrency Safety
-- ============================================================================

-- 1. Create partial unique index on checkins to enforce single approved checkin per registration at database level
create unique index if not exists idx_checkins_single_approved_registration
  on public.checkins (registration_id)
  where status in ('approved', 'overridden');

-- 2. Enhanced stored procedure with atomic duplicate scan detection & prior metadata return
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
  v_now timestamptz := now();
begin
  -- Lock registration row to serialize concurrent scans
  select *
  into v_reg
  from public.registrations
  where id = p_registration_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NOT_FOUND',
      'message', 'Registration record not found.'
    );
  end if;

  select * into v_event from public.events where id = v_reg.event_id;

  -- Atomic duplicate check: if already checked in and not an explicit override
  if v_reg.registration_status = 'checked_in' and not p_is_override then
    select * into v_prior_checkin
    from public.checkins
    where registration_id = v_reg.id and status in ('approved', 'overridden')
    order by scan_timestamp desc
    limit 1;

    return jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_CHECKED_IN',
      'is_already_checked_in', true,
      'message', 'ALREADY SCANNED: Participant has already checked in.',
      'prior_checkin_time', coalesce(v_prior_checkin.scan_timestamp, v_reg.checked_in_at, v_now),
      'prior_scanned_by', coalesce(v_prior_checkin.scanned_by_name, 'Event Volunteer'),
      'participant', jsonb_build_object(
        'id', v_reg.id,
        'full_name', v_reg.full_name,
        'vit_registration_number', v_reg.vit_registration_number,
        'branch', coalesce(v_reg.branch_name, 'N/A'),
        'registration_number', v_reg.registration_number,
        'status', v_reg.registration_status,
        'registration_source', coalesce(v_reg.registration_source, 'online'),
        'college_email', v_reg.college_email,
        'personal_email', v_reg.personal_email,
        'event_title', coalesce(v_event.title, 'GenAI Community Event')
      )
    );
  end if;

  -- Check if payment pending or rejected
  if v_reg.registration_status = 'pending' and not p_is_override then
    return jsonb_build_object(
      'success', false,
      'error_code', 'PAYMENT_PENDING',
      'message', 'Payment Pending: Registration is awaiting finance review before entrance.'
    );
  end if;

  if v_reg.registration_status = 'rejected' and not p_is_override then
    return jsonb_build_object(
      'success', false,
      'error_code', 'PAYMENT_REJECTED',
      'message', 'Payment Rejected: Registration was rejected during finance review.'
    );
  end if;

  -- Update registration status
  update public.registrations
  set registration_status = 'checked_in',
      checked_in_at = coalesce(checked_in_at, v_now),
      checked_in_by = p_scanner_user_id,
      override_reason = case when p_is_override then p_override_reason else override_reason end,
      overridden_by = case when p_is_override then p_scanner_user_id else overridden_by end,
      updated_at = v_now
  where id = v_reg.id;

  -- Insert checkin entry
  begin
    insert into public.checkins (
      registration_id,
      event_id,
      scanned_by,
      scanned_by_name,
      scanner_role,
      status,
      is_override,
      override_reason,
      scan_timestamp
    ) values (
      v_reg.id,
      v_reg.event_id,
      p_scanner_user_id,
      p_scanner_name,
      p_scanner_role,
      case when p_is_override then 'overridden' else 'approved' end,
      p_is_override,
      p_override_reason,
      v_now
    );
  exception when unique_violation then
    if not p_is_override then
      select * into v_prior_checkin
      from public.checkins
      where registration_id = v_reg.id and status in ('approved', 'overridden')
      order by scan_timestamp desc
      limit 1;

      return jsonb_build_object(
        'success', false,
        'error_code', 'ALREADY_CHECKED_IN',
        'is_already_checked_in', true,
        'message', 'ALREADY SCANNED: Participant was checked in by another scanner simultaneously.',
        'prior_checkin_time', coalesce(v_prior_checkin.scan_timestamp, v_now),
        'prior_scanned_by', coalesce(v_prior_checkin.scanned_by_name, 'Event Volunteer')
      );
    end if;
  end;

  return jsonb_build_object(
    'success', true,
    'message', case when p_is_override then 'Executive Override Admitted.' else 'Attendance Confirmed & Recorded.' end,
    'participant', jsonb_build_object(
      'id', v_reg.id,
      'full_name', v_reg.full_name,
      'vit_registration_number', v_reg.vit_registration_number,
      'branch', coalesce(v_reg.branch_name, 'N/A'),
      'registration_number', v_reg.registration_number,
      'status', 'checked_in',
      'registration_source', coalesce(v_reg.registration_source, 'online'),
      'college_email', v_reg.college_email,
      'personal_email', v_reg.personal_email,
      'event_title', coalesce(v_event.title, 'GenAI Community Event')
    )
  );
end;
$$;
