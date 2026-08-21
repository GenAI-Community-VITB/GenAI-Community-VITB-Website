-- ============================================================================
-- MASTER AUTH RESET & SEED SCRIPT (2026-27 Community Roster)
-- This script fixes all login errors, creates clean auth identities, 
-- and names the column "password" with student names assigned.
-- Run this in the Supabase Dashboard -> SQL Editor and click RUN.
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Wipe previous corrupted auth rows & profiles cleanly
delete from public.member_roles;
delete from public.user_profiles;
delete from auth.identities;
delete from auth.sessions;
delete from auth.mfa_factors;
delete from auth.refresh_tokens;
delete from auth.users;

-- 2. Ensure schema columns exist on public.user_profiles
alter table public.user_profiles drop constraint if exists user_profiles_role_check;
alter table public.user_profiles
  add column if not exists assigned_to_name text,
  add column if not exists password text default 'GenAICommunity@2026-27',
  add column if not exists is_voided boolean not null default false,
  add column if not exists voided_at timestamptz,
  add column if not exists voided_reason text;
alter table public.user_profiles drop column if exists initial_password;

-- 3. Ensure public.member_roles table exists
create table if not exists public.member_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  team text not null,
  position text not null,
  created_at timestamptz not null default now(),
  unique (user_id, team, position)
);

alter table public.member_roles enable row level security;
drop policy if exists "Allow read member_roles to all" on public.member_roles;
create policy "Allow read member_roles to all" on public.member_roles for select using (true);
drop policy if exists "Allow manage member_roles to staff" on public.member_roles;
create policy "Allow manage member_roles to staff" on public.member_roles for all using (true);

-- 4. Helper Function: Inserts auth.users + auth.identities + public.user_profiles + public.member_roles
create or replace function public.create_clean_staff_account(
  p_email text,
  p_full_name text,
  p_assigned_to text,
  p_role text,
  p_team text,
  p_position text,
  p_password text default 'GenAICommunity@2026-27'
) returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id uuid := gen_random_uuid();
  v_encrypted_pw text := crypt(p_password, gen_salt('bf'));
begin
  -- 4a. Insert into auth.users with all required GoTrue fields
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    is_sso_user,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name, 'assigned_to_name', p_assigned_to, 'role', p_role),
    false,
    false,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- 4b. Insert matching auth.identities record (Crucial for Supabase Login)
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  -- 4c. Insert into public.user_profiles
  insert into public.user_profiles (
    id,
    email,
    full_name,
    assigned_to_name,
    password,
    role,
    is_active,
    is_voided,
    created_at,
    updated_at
  ) values (
    v_user_id,
    p_email,
    p_full_name,
    p_assigned_to,
    p_password,
    p_role,
    true,
    false,
    now(),
    now()
  );

  -- 4d. Insert into public.member_roles
  insert into public.member_roles (user_id, team, position)
  values (v_user_id, p_team, p_position);

  return v_user_id;
end;
$$;

-- 5. Seed all 51 members
do $$
begin
  -- ── PANEL (8) ──
  perform public.create_clean_staff_account('president@genai.community', 'Club President', 'Harshvardhan Om', 'president', 'panel', 'president');
  perform public.create_clean_staff_account('vice.president@genai.community', 'Vice President', 'Akshita Singh', 'vice_president', 'panel', 'vice_president');
  perform public.create_clean_staff_account('gen.sec.provisional@genai.community', 'General Secretary (Provisional)', 'Anuj Srivastava', 'volunteer', 'panel', 'general_secretary_provisional');
  perform public.create_clean_staff_account('general.secretary@genai.community', 'General Secretary', 'Aditya Mishra', 'volunteer', 'panel', 'general_secretary');
  perform public.create_clean_staff_account('joint.secretary@genai.community', 'Joint Secretary', 'Anvi Vajpayee', 'volunteer', 'panel', 'joint_secretary');
  perform public.create_clean_staff_account('assistant.secretary@genai.community', 'Assistant Secretary', 'Archita Shukla', 'volunteer', 'panel', 'assistant_secretary');
  perform public.create_clean_staff_account('student.coord.001@genai.community', 'Student Coordinator 01', 'Ishani Verma', 'volunteer', 'panel', 'student_coordinator_01');
  perform public.create_clean_staff_account('student.coord.002@genai.community', 'Student Coordinator 02', 'Prince Agrawal', 'volunteer', 'panel', 'student_coordinator_02');

  -- ── HR (4) ──
  perform public.create_clean_staff_account('hr.lead@genai.community', 'HR Team Lead', 'Amritanshu Gupta', 'volunteer', 'hr_team', 'team_lead');
  perform public.create_clean_staff_account('hr.co.lead@genai.community', 'HR Team Co-Lead', 'Srishti Manav', 'volunteer', 'hr_team', 'co_lead');
  perform public.create_clean_staff_account('hr.coremember.001@genai.community', 'HR Core Member 01', 'Nilansh Chauhan', 'volunteer', 'hr_team', 'core_member');
  perform public.create_clean_staff_account('hr.coremember.002@genai.community', 'HR Core Member 02', 'Aashka Swaroop', 'volunteer', 'hr_team', 'core_member');

  -- ── EVENT MANAGEMENT (4) ──
  perform public.create_clean_staff_account('event.lead@genai.community', 'Event Management Lead', 'Priyansh Upadhyay', 'volunteer', 'event_management', 'team_lead');
  perform public.create_clean_staff_account('event.co.lead@genai.community', 'Event Management Co-Lead', 'Anya Singh', 'volunteer', 'event_management', 'co_lead');
  perform public.create_clean_staff_account('event.coremember.001@genai.community', 'Event Core Member 01', 'Shikha Singh', 'volunteer', 'event_management', 'core_member');
  perform public.create_clean_staff_account('event.coremember.002@genai.community', 'Event Core Member 02', 'Shaurya Tyagi', 'volunteer', 'event_management', 'core_member');

  -- ── DESIGN TEAM (3) ──
  perform public.create_clean_staff_account('design.lead@genai.community', 'Design Team Lead', 'Agrim Mathur', 'volunteer', 'design_team', 'team_lead');
  perform public.create_clean_staff_account('design.co.lead@genai.community', 'Design Team Co-Lead', 'Kushagra Nigam', 'volunteer', 'design_team', 'co_lead');
  perform public.create_clean_staff_account('design.coremember.001@genai.community', 'Design Core Member 01', 'Ameeshi', 'volunteer', 'design_team', 'core_member');

  -- ── AI/ML & INNOVATION TEAM (6) ──
  perform public.create_clean_staff_account('aiml.lead@genai.community', 'AI/ML & Innovation Lead', 'Lakshya Kant', 'aiml_lead', 'aiml_innovation', 'team_lead');
  perform public.create_clean_staff_account('aiml.co.lead@genai.community', 'AI/ML & Innovation Co-Lead', 'Aaditya Agarwal', 'aiml_co_lead', 'aiml_innovation', 'co_lead');
  perform public.create_clean_staff_account('aiml.coremember.001@genai.community', 'AI/ML Core Member 01', 'Rachit Singh', 'volunteer', 'aiml_innovation', 'core_member');
  perform public.create_clean_staff_account('aiml.coremember.002@genai.community', 'AI/ML Core Member 02', 'Suhani Boxi', 'volunteer', 'aiml_innovation', 'core_member');
  perform public.create_clean_staff_account('aiml.coremember.003@genai.community', 'AI/ML Core Member 03', 'Sargam Ghagre', 'volunteer', 'aiml_innovation', 'core_member');
  perform public.create_clean_staff_account('aiml.coremember.004@genai.community', 'AI/ML Core Member 04', 'Aditya Verma', 'volunteer', 'aiml_innovation', 'core_member');

  -- ── SOCIAL MEDIA TEAM (6) ──
  perform public.create_clean_staff_account('social.lead@genai.community', 'Social Media Lead', 'Jharna Gupta', 'volunteer', 'social_media', 'team_lead');
  perform public.create_clean_staff_account('social.co.lead@genai.community', 'Social Media Co-Lead', 'Sakcham Shaw', 'volunteer', 'social_media', 'co_lead');
  perform public.create_clean_staff_account('social.coremember.001@genai.community', 'Social Media Core 01', 'Arpan Akar', 'volunteer', 'social_media', 'core_member');
  perform public.create_clean_staff_account('social.coremember.002@genai.community', 'Social Media Core 02', 'Ayesha Raza', 'volunteer', 'social_media', 'core_member');
  perform public.create_clean_staff_account('social.coremember.003@genai.community', 'Social Media Core 03', 'Sanidhya Raj', 'volunteer', 'social_media', 'core_member');
  perform public.create_clean_staff_account('social.coremember.004@genai.community', 'Social Media Core 04', 'Priyanshu Sinha', 'volunteer', 'social_media', 'core_member');

  -- ── PR & OUTREACH TEAM (7) ──
  perform public.create_clean_staff_account('pr.lead@genai.community', 'PR & Outreach Lead', 'Shashwat Mishra', 'volunteer', 'pr_outreach', 'team_lead');
  perform public.create_clean_staff_account('pr.co.lead@genai.community', 'PR & Outreach Co-Lead', 'Drishti Pandey', 'volunteer', 'pr_outreach', 'co_lead');
  perform public.create_clean_staff_account('pr.coremember.001@genai.community', 'PR Core Member 01', 'Debasmita Ghosh', 'volunteer', 'pr_outreach', 'core_member');
  perform public.create_clean_staff_account('pr.coremember.002@genai.community', 'PR Core Member 02', 'Palak Priya', 'volunteer', 'pr_outreach', 'core_member');
  perform public.create_clean_staff_account('pr.coremember.003@genai.community', 'PR Core Member 03', 'Saanvi Mittal', 'volunteer', 'pr_outreach', 'core_member');
  perform public.create_clean_staff_account('pr.coremember.004@genai.community', 'PR Core Member 04', 'Anjali Pandey', 'volunteer', 'pr_outreach', 'core_member');
  perform public.create_clean_staff_account('pr.coremember.005@genai.community', 'PR Core Member 05', 'Pushkar Banjara', 'volunteer', 'pr_outreach', 'core_member');

  -- ── TECHNICAL TEAM (7) ──
  perform public.create_clean_staff_account('tech.lead@genai.community', 'Technical Team Lead', 'Abhinav Kumar', 'technical_lead', 'technical_team', 'team_lead');
  perform public.create_clean_staff_account('tech.co.lead@genai.community', 'Technical Team Co-Lead', 'Swetalina Sarangi', 'technical_co_lead', 'technical_team', 'co_lead');
  perform public.create_clean_staff_account('tech.coremember.001@genai.community', 'Technical Core 01', 'Anushka Bhatnagar', 'volunteer', 'technical_team', 'core_member');
  perform public.create_clean_staff_account('tech.coremember.002@genai.community', 'Technical Core 02', 'Rishab jain', 'volunteer', 'technical_team', 'core_member');
  perform public.create_clean_staff_account('tech.coremember.003@genai.community', 'Technical Core 03', 'Aaditi Shrivastava', 'volunteer', 'technical_team', 'core_member');
  perform public.create_clean_staff_account('tech.coremember.004@genai.community', 'Technical Core 04', 'Nitin Sharma', 'volunteer', 'technical_team', 'core_member');
  perform public.create_clean_staff_account('tech.coremember.005@genai.community', 'Technical Core 05', 'Nivedita Jain', 'volunteer', 'technical_team', 'core_member');

  -- ── CONTENT TEAM (4) ──
  perform public.create_clean_staff_account('content.lead@genai.community', 'Content Team Lead', 'Muskan Jha', 'volunteer', 'content_team', 'team_lead');
  perform public.create_clean_staff_account('content.co.lead@genai.community', 'Content Team Co-Lead', 'Muskan Bhatia', 'volunteer', 'content_team', 'co_lead');
  perform public.create_clean_staff_account('content.coremember.001@genai.community', 'Content Core Member 01', 'Kaustubh', 'volunteer', 'content_team', 'core_member');
  perform public.create_clean_staff_account('content.coremember.002@genai.community', 'Content Core Member 02', 'Arsh Arun', 'volunteer', 'content_team', 'core_member');

  -- ── FINANCE TEAM (2) ──
  perform public.create_clean_staff_account('finance.lead@genai.community', 'Finance Team Lead', 'Finance Lead', 'finance', 'finance_team', 'team_lead');
  perform public.create_clean_staff_account('finance.coremember.001@genai.community', 'Finance Core Member', 'Finance Core Member', 'finance', 'finance_team', 'core_member');
end;
$$;

-- 6. Reload PostgREST schema cache
notify pgrst, 'reload schema';
