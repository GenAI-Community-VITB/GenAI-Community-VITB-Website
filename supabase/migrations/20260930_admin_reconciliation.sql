-- Apply after taking a database backup and provisioning a real Auth administrator.
-- Additive reconciliation for the existing deployment. Does not replay legacy seed/prune migrations.
begin;
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
  add column if not exists academic_year text not null default '';

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
  add column if not exists is_login_disabled boolean not null default false,
  add column if not exists login_disabled_at timestamptz,
  add column if not exists login_disabled_reason text,
  add column if not exists github_url text,
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


create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text not null,
  category text not null default 'Hackathon' check (
    category in ('Hackathon', 'Research', 'Award', 'Milestone', 'Workshop', 'Recognition')
  ),
  achievement_date date not null default current_date,
  image_url text,
  drive_file_id text,
  link_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.event_winners (
 id uuid primary key default gen_random_uuid(), event_id uuid references public.events(id) on delete set null,
 event_name text not null, position text not null, team_name text not null, members text[] not null default '{}',
 project_title text not null, project_description text not null default '', prize_award text not null default '',
 image_url text, event_date text not null, github_url text, demo_url text, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.user_profiles
 add column if not exists official_email text, add column if not exists avatar_url text, add column if not exists drive_file_id text;
alter table public.events
 add column if not exists allowed_degrees text[], add column if not exists allowed_branches text[],
 add column if not exists guidelines text[], add column if not exists is_spotlight boolean not null default true,
 add column if not exists spotlight_message text, add column if not exists spotlight_priority integer not null default 1,
 add column if not exists google_form_url text;
alter table public.registrations add column if not exists checked_in_at timestamptz,
 add column if not exists checked_in_by uuid references auth.users(id) on delete set null;
alter table public.checkins drop constraint if exists checkins_status_check;
alter table public.checkins add constraint checkins_status_check check (status in ('approved','overridden','revoked','rejected_already_checked_in','rejected_invalid_time','rejected_unverified'));
alter table public.email_logs drop constraint if exists email_logs_status_check;
alter table public.email_logs drop constraint if exists email_logs_email_type_check;
alter table public.email_logs alter column sent_at drop not null;
alter table public.email_logs
 add column if not exists provider text, add column if not exists provider_message_id text,
 add column if not exists attempt_count integer not null default 1, add column if not exists last_attempt_at timestamptz,
 add column if not exists failed_at timestamptz, add column if not exists failure_reason text,
 add column if not exists delivered_at timestamptz, add column if not exists created_at timestamptz not null default now(), add column if not exists updated_at timestamptz not null default now();
create table if not exists public.auth_rate_limits (key text primary key, attempts integer not null, window_start timestamptz not null);
create or replace function public.consume_auth_limit(p_key text, p_limit integer, p_seconds integer) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare hits integer;
begin
 insert into auth_rate_limits values (p_key,1,clock_timestamp()) on conflict(key) do update
 set attempts = case when auth_rate_limits.window_start < clock_timestamp()-make_interval(secs=>p_seconds) then 1 else auth_rate_limits.attempts+1 end,
 window_start = case when auth_rate_limits.window_start < clock_timestamp()-make_interval(secs=>p_seconds) then clock_timestamp() else auth_rate_limits.window_start end
 returning attempts into hits;
 return hits <= p_limit;
end $$;
create table if not exists public.staff_reset_codes (
 email text primary key, code_hash text not null, expires_at timestamptz not null,
 attempts integer not null default 0, claimed_at timestamptz, used_at timestamptz
);
create or replace function public.claim_staff_reset(p_email text, p_hash text) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare r staff_reset_codes;
begin
 select * into r from staff_reset_codes where email=p_email for update;
 if not found or r.used_at is not null or r.claimed_at is not null or r.expires_at<now() or r.attempts>=5 then return false; end if;
 update staff_reset_codes set attempts=attempts+1 where email=p_email;
 if r.code_hash<>p_hash then return false; end if;
 update staff_reset_codes set claimed_at=now() where email=p_email;
 return true;
end $$;
create or replace function public.save_staff_profile(p_profile jsonb,p_roles jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid := (p_profile->>'id')::uuid;
begin
 insert into user_profiles(id,email,full_name,assigned_to_name,role,is_active,is_login_disabled,is_voided,avatar_url,drive_file_id)
 values(uid,p_profile->>'email',p_profile->>'full_name',p_profile->>'assigned_to_name',p_profile->>'role',(p_profile->>'is_active')::boolean,
 coalesce((p_profile->>'is_login_disabled')::boolean,true),false,p_profile->>'avatar_url',p_profile->>'drive_file_id')
 on conflict(id) do update set full_name=excluded.full_name,assigned_to_name=excluded.assigned_to_name,role=excluded.role,is_active=excluded.is_active,
 avatar_url=coalesce(excluded.avatar_url,user_profiles.avatar_url),drive_file_id=coalesce(excluded.drive_file_id,user_profiles.drive_file_id);
 delete from member_roles where user_id=uid;
 insert into member_roles(user_id,team,position) select uid,x->>'team',x->>'position' from jsonb_array_elements(p_roles) x;
end $$;
-- These transactional RPCs are callable only by the server service role. Server actions derive the actor from a verified session.
create or replace function public.review_registration_payment(p_payment uuid,p_registration uuid,p_actor uuid,p_approve boolean,p_token text,p_reason text,p_explanation text) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare r registrations; pay payments; token text;
begin
 select * into r from registrations where id=p_registration for update;
 if not found then raise exception 'Registration not found'; end if;
 select * into pay from payments where id=p_payment and registration_id=r.id and event_id=r.event_id for update;
 if not found then raise exception 'Payment does not belong to this registration'; end if;
 if r.registration_status='checked_in' and not p_approve then raise exception 'Revoke attendance before rejecting this payment'; end if;
 token := case when p_approve then coalesce(r.qr_token,p_token) else null end;
 update payments set payment_status=case when p_approve then 'verified' else 'rejected' end,reviewed_by=p_actor,reviewed_at=now(),
 rejection_reason=case when p_approve then null else p_reason end,rejection_explanation=case when p_approve then null else p_explanation end where id=pay.id;
 update registrations set registration_status=case when r.registration_status='checked_in' then 'checked_in' when p_approve then 'verified' else 'rejected' end,
 qr_token=token,qr_generated_at=case when p_approve then coalesce(qr_generated_at,now()) else null end where id=r.id;
 return token;
end $$;
create or replace function public.record_attendance(p_registration uuid,p_actor uuid,p_name text,p_role text,p_override boolean default false,p_reason text default null,p_present boolean default true) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r registrations; e events; prior checkins;
begin
 select * into r from registrations where id=p_registration for update;
 if not found then raise exception 'Registration not found'; end if;
 select * into e from events where id=r.event_id;
 if p_override and length(trim(coalesce(p_reason,'')))<3 then raise exception 'Override reason required'; end if;
 if not p_override and (r.registration_status not in ('verified','checked_in') or not exists(select 1 from payments where registration_id=r.id and payment_status='verified')) then raise exception 'Registration payment is not verified'; end if;
 if not p_override and (e.event_start_time is null or e.event_end_time is null or now()<e.event_start_time or now()>e.event_end_time) then raise exception 'Outside event check-in window'; end if;
 if not p_present then
  update checkins set status='revoked' where registration_id=r.id and status in ('approved','overridden');
  update registrations set registration_status=case when exists(select 1 from payments where registration_id=r.id and payment_status='verified') then 'verified' else 'pending' end,checked_in_at=null,checked_in_by=null,override_reason=p_reason,overridden_by=p_actor where id=r.id;
  return jsonb_build_object('success',true,'message','Attendance revoked');
 end if;
 select * into prior from checkins where registration_id=r.id and status in ('approved','overridden') order by scan_timestamp desc limit 1;
 if found or r.registration_status='checked_in' then return jsonb_build_object('success',false,'message','Already checked in','isAlreadyCheckedIn',true,'priorCheckinTime',prior.scan_timestamp,'priorScannedBy',prior.scanned_by_name); end if;
 insert into checkins(registration_id,event_id,scanned_by,scanned_by_name,scanned_by_role,status,is_override,override_reason)
 values(r.id,r.event_id,p_actor,p_name,p_role,case when p_override then 'overridden' else 'approved' end,p_override,p_reason);
 update registrations set registration_status='checked_in',checked_in_at=now(),checked_in_by=p_actor where id=r.id;
 return jsonb_build_object('success',true,'message','Attendance confirmed','participant',jsonb_build_object('id',r.id,'full_name',r.full_name,'vit_registration_number',r.vit_registration_number,'branch',r.branch_name,'registration_number',r.registration_number,'status','checked_in','registration_source',r.registration_source,'event_title',e.title));
end $$;
create or replace function public.archive_registration(p_id uuid,p_actor uuid,p_name text,p_role text,p_reason text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare r registrations; archive_id uuid; snapshot jsonb;
begin
 select * into r from registrations where id=p_id for update;
 if not found then raise exception 'Registration not found'; end if;
 snapshot := jsonb_build_object('registration',to_jsonb(r),'payments',coalesce((select jsonb_agg(p) from payments p where registration_id=r.id),'[]'::jsonb),'checkins',coalesce((select jsonb_agg(c) from checkins c where registration_id=r.id),'[]'::jsonb));
 insert into deleted_registrations(original_registration_id,registration_number,event_id,full_name,vit_registration_number,branch_name,personal_email,college_email,phone_number,registration_source,deleted_by,deleted_by_name,deleted_by_role,deletion_reason,deleted_at_ist,raw_data)
 values(r.id,r.registration_number,r.event_id,r.full_name,r.vit_registration_number,r.branch_name,r.personal_email,r.college_email,r.phone_number,r.registration_source,p_actor,p_name,p_role,p_reason,to_char(now() at time zone 'Asia/Kolkata','YYYY-MM-DD HH24:MI:SS'),snapshot) returning id into archive_id;
 delete from registrations where id=r.id;
 return archive_id;
end $$;
create or replace function public.restore_registration(p_id uuid) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare a deleted_registrations; r registrations;
begin
 select * into a from deleted_registrations where id=p_id for update;
 if not found or not (a.raw_data ? 'registration') then raise exception 'Archive is missing a complete restorable snapshot'; end if;
 select * into r from jsonb_populate_record(null::registrations,a.raw_data->'registration');
 insert into registrations select r.*;
 insert into payments select * from jsonb_populate_recordset(null::payments,a.raw_data->'payments');
 insert into checkins select * from jsonb_populate_recordset(null::checkins,a.raw_data->'checkins');
 delete from deleted_registrations where id=a.id;
 return r.id;
end $$;

-- Public registration reconciliation: the legacy per-event count collided globally.
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

  if not v_event.is_registration_open or v_event.status = 'past' then
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

  -- Global unique IDs remain safe across events, deletion, archive and restoration.
  v_reg_number := 'GENAI-' || gen_random_uuid()::text;
  if p_amount is distinct from v_event.registration_fee then
    return jsonb_build_object('success',false,'error_code','FEE_CHANGED','message','The event fee changed. Reload the registration form.');
  end if;

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
    return jsonb_build_object('success', false, 'error_code', 'INTERNAL_ERROR', 'message', 'Registration could not be saved. Please retry.');
end;
$$;

create or replace function public.import_participant(p_event uuid,p_row jsonb,p_token text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r registrations; pay payments; st text := p_row->>'payment_status'; matches integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_event::text,0));
 if st not in ('pending','verified','rejected') then raise exception 'Invalid payment status'; end if;
 select count(*) into matches from registrations where event_id=p_event and (vit_registration_number=p_row->>'vit_registration_number' or college_email=p_row->>'college_email' or personal_email=p_row->>'personal_email');
 if matches>1 then raise exception 'Identity fields match different registrations'; end if;
 select * into r from registrations where event_id=p_event and (vit_registration_number=p_row->>'vit_registration_number' or college_email=p_row->>'college_email' or personal_email=p_row->>'personal_email') for update;
 if found then
  if r.vit_registration_number<>p_row->>'vit_registration_number' then raise exception 'Email belongs to another registration number'; end if;
  if r.registration_status='checked_in' and st<>'verified' then raise exception 'Cannot downgrade a checked-in participant'; end if;
  update registrations set full_name=p_row->>'full_name',branch_name=p_row->>'branch_name',phone_number=p_row->>'phone_number',
   registration_status=case when r.registration_status='checked_in' then 'checked_in' else st end,
   qr_token=case when st='verified' then coalesce(qr_token,p_token) else null end,
   qr_generated_at=case when st='verified' then coalesce(qr_generated_at,now()) else null end
  where id=r.id returning * into r;
 else
  insert into registrations(registration_number,event_id,full_name,vit_registration_number,branch_name,personal_email,college_email,phone_number,registration_status,registration_source,qr_token,qr_generated_at)
  values(coalesce(nullif(p_row->>'registration_number',''),'GAC-'||gen_random_uuid()::text),p_event,p_row->>'full_name',p_row->>'vit_registration_number',p_row->>'branch_name',p_row->>'personal_email',p_row->>'college_email',p_row->>'phone_number',st,'bulk_import',case when st='verified' then p_token else null end,case when st='verified' then now() else null end) returning * into r;
 end if;
 select * into pay from payments where registration_id=r.id order by created_at desc limit 1 for update;
 if found then
  update payments set amount=(p_row->>'amount')::numeric,transaction_id=p_row->>'transaction_id',payment_status=st,reviewed_at=case when st='verified' then now() else null end where id=pay.id;
 else
  insert into payments(registration_id,event_id,amount,transaction_id,payment_status,drive_file_id,drive_file_name,drive_mime_type,drive_folder_id)
  values(r.id,p_event,(p_row->>'amount')::numeric,p_row->>'transaction_id',st,'bulk_import','bulk_import.csv','text/csv','bulk_import');
 end if;
 return to_jsonb(r);
end $$;
create or replace function public.issue_staff_reset(p_email text,p_hash text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into staff_reset_codes(email,code_hash,expires_at) values(p_email,p_hash,now()+interval '10 minutes')
 on conflict(email) do update set code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,claimed_at=null,used_at=null
 where staff_reset_codes.claimed_at is null or staff_reset_codes.used_at is not null or staff_reset_codes.expires_at<now();
 if not found then raise exception 'Password update in progress'; end if;
end $$;
create or replace function public.archive_and_clear_event(p_event_id uuid,p_actor_id uuid,p_actor_role text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r registrations; actor_name text;
begin
 perform 1 from events where id=p_event_id for update;
 if not found then raise exception 'Event not found'; end if;
 select full_name into actor_name from user_profiles where id=p_actor_id;
 insert into event_statistics(event_id,registered_count,approved_count,pending_count,attended_count)
 select p_event_id,count(*),count(*) filter(where registration_status in ('verified','checked_in')),count(*) filter(where registration_status='pending'),count(*) filter(where registration_status='checked_in') from registrations where event_id=p_event_id
 on conflict(event_id) do update set registered_count=excluded.registered_count,approved_count=excluded.approved_count,pending_count=excluded.pending_count,attended_count=excluded.attended_count,updated_at=now();
 for r in select * from registrations where event_id=p_event_id for update loop
  perform archive_registration(r.id,p_actor_id,actor_name,p_actor_role,'Event completed');
 end loop;
 update events set status='past',is_registration_open=false where id=p_event_id;
 return jsonb_build_object('success',true,'message','Event archived with restorable database snapshots');
end $$;
-- Browser roles cannot read or mutate staff and participant records directly.
do $$ declare t text; pol record; begin
 foreach t in array array['user_profiles','member_roles','registrations','payments','checkins','audit_logs','email_logs','sync_failures','system_failures','deleted_registrations','event_statistics','event_volunteers','password_reset_requests','password_reset_otps','staff_reset_codes','auth_rate_limits'] loop
  if to_regclass('public.'||t) is not null then
   execute format('alter table public.%I enable row level security',t);
   for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',pol.policyname,t); end loop;
   execute format('revoke all on public.%I from anon,authenticated',t);
   execute format('grant all on public.%I to service_role',t);
  end if;
 end loop;
 foreach t in array array['teams','members','projects','events','branches','blog_posts','achievements','winners','event_winners'] loop
  if to_regclass('public.'||t) is not null then
   for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',pol.policyname,t); end loop;
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on public.%I from anon,authenticated',t);
   execute format('grant select on public.%I to anon,authenticated',t);
   execute format('grant all on public.%I to service_role',t);
   execute format('create policy public_read on public.%I for select to anon,authenticated using (%s)',t,case when t='members' then 'status = ''active''' when t='blog_posts' then 'is_published = true' else 'true' end);
  end if;
 end loop;
end $$;
-- This database also hosts competition RPCs. Restrict only the website's
-- current and legacy entry points; preserve other applications' function ACLs
-- and schema-wide default privileges. Cover every overload of each name.
do $$ declare f record; begin
 for f in
  select p.oid::regprocedure as signature from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prokind='f' and p.proname = any(array[
   'consume_auth_limit','claim_staff_reset','issue_staff_reset','save_staff_profile',
   'review_registration_payment','record_attendance','archive_registration',
   'restore_registration','atomic_register_student','atomic_register_participant',
   'atomic_scan_and_checkin','import_participant','archive_and_clear_event',
   'recompute_event_statistics','trigger_refresh_event_stats','verify_qr_token_details',
   'confirm_attendance_action','create_clean_staff_account','seed_club_staff'
  ])
 loop
  execute format('revoke execute on function %s from PUBLIC,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
notify pgrst, 'reload schema';
commit;
