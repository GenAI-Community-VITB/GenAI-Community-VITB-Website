-- ============================================================================
-- Generative AI Community 2026–27 Official Roster & RBAC Seed SQL
-- Run this in the Supabase SQL Editor to populate all user profiles and roles.
-- ============================================================================

-- 1. Ensure required extensions and tables exist
create extension if not exists "pgcrypto";

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
drop policy if exists "Allow read member_roles to all" on public.member_roles;
create policy "Allow read member_roles to all" on public.member_roles for select using (true);
drop policy if exists "Allow manage member_roles to staff" on public.member_roles;
create policy "Allow manage member_roles to staff" on public.member_roles for all using (true);

-- 2. Helper function to upsert a staff member into auth.users, user_profiles, and member_roles
create or replace function public.seed_club_staff(
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
  v_user_id uuid;
  v_encrypted_pw text;
begin
  v_encrypted_pw := crypt(p_password, gen_salt('bf'));

  -- Check if user exists in auth.users
  select id into v_user_id from auth.users where email = p_email;

  if v_user_id is null then
    v_user_id := gen_random_uuid();
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
      created_at,
      updated_at
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
      now(),
      now()
    );
  else
    update auth.users
    set encrypted_password = v_encrypted_pw,
        raw_user_meta_data = jsonb_build_object('full_name', p_full_name, 'assigned_to_name', p_assigned_to, 'role', p_role),
        updated_at = now()
    where id = v_user_id;
  end if;

  -- Ensure auth.identities has matching entry for GoTrue
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
  ) on conflict (provider, provider_id) do update
  set identity_data = excluded.identity_data,
      updated_at = now();

  -- Upsert user_profiles
  insert into public.user_profiles (id, email, full_name, assigned_to_name, password, role, is_active, is_voided, updated_at)
  values (v_user_id, p_email, p_full_name, p_assigned_to, p_password, p_role, true, false, now())
  on conflict (id) do update
  set full_name = excluded.full_name,
      assigned_to_name = excluded.assigned_to_name,
      password = coalesce(excluded.password, user_profiles.password),
      role = excluded.role,
      is_active = true,
      is_voided = false,
      updated_at = now();

  -- Upsert member_roles
  delete from public.member_roles where user_id = v_user_id;
  insert into public.member_roles (user_id, team, position)
  values (v_user_id, p_team, p_position);

  return v_user_id;
end;
$$;

-- 3. Execute Seeding for all 2026-27 Roster Positions with Allotted Names
do $$
begin
  -- ── PANEL (8) ──
  perform public.seed_club_staff('president@genai.community', 'Club President', 'Harshvardhan Om', 'president', 'panel', 'president');
  perform public.seed_club_staff('vice.president@genai.community', 'Vice President', 'Akshita Singh', 'vice_president', 'panel', 'vice_president');
  perform public.seed_club_staff('gen.sec.provisional@genai.community', 'General Secretary (Provisional)', 'Anuj Srivastava', 'volunteer', 'panel', 'general_secretary_provisional');
  perform public.seed_club_staff('general.secretary@genai.community', 'General Secretary', 'Aditya Mishra', 'volunteer', 'panel', 'general_secretary');
  perform public.seed_club_staff('joint.secretary@genai.community', 'Joint Secretary', 'Anvi Vajpayee', 'volunteer', 'panel', 'joint_secretary');
  perform public.seed_club_staff('assistant.secretary@genai.community', 'Assistant Secretary', 'Archita Shukla', 'volunteer', 'panel', 'assistant_secretary');
  perform public.seed_club_staff('student.coord.001@genai.community', 'Student Coordinator 01', 'Ishani Verma', 'volunteer', 'panel', 'student_coordinator');
  perform public.seed_club_staff('student.coord.002@genai.community', 'Student Coordinator 02', 'Prince Agrawal', 'volunteer', 'panel', 'student_coordinator');

  -- ── HR TEAM (4) ──
  perform public.seed_club_staff('hr.lead@genai.community', 'HR Lead', 'Amritanshu Gupta', 'volunteer', 'hr_team', 'lead');
  perform public.seed_club_staff('hr.co.lead@genai.community', 'HR Co-Lead', 'Srishti Manav', 'volunteer', 'hr_team', 'co_lead');
  perform public.seed_club_staff('hr.coremember.001@genai.community', 'HR Core Member 01', 'Nilansh Chauhan', 'volunteer', 'hr_team', 'core_member');
  perform public.seed_club_staff('hr.coremember.002@genai.community', 'HR Core Member 02', 'Aashka Swaroop', 'volunteer', 'hr_team', 'core_member');

  -- ── EVENT MANAGEMENT (4) ──
  perform public.seed_club_staff('event.lead@genai.community', 'Event Management Lead', 'Priyansh Upadhyay', 'volunteer', 'event_management_team', 'lead');
  perform public.seed_club_staff('event.co.lead@genai.community', 'Event Management Co-Lead', 'Anya Singh', 'volunteer', 'event_management_team', 'co_lead');
  perform public.seed_club_staff('event.coremember.001@genai.community', 'Event Core Member 01', 'Shikha Singh', 'volunteer', 'event_management_team', 'core_member');
  perform public.seed_club_staff('event.coremember.002@genai.community', 'Event Core Member 02', 'Shaurya Tyagi', 'volunteer', 'event_management_team', 'core_member');

  -- ── DESIGN TEAM (3) ──
  perform public.seed_club_staff('design.lead@genai.community', 'Design Lead', 'Agrim Mathur', 'volunteer', 'design_team', 'lead');
  perform public.seed_club_staff('design.co.lead@genai.community', 'Design Co-Lead', 'Kushagra Nigam', 'volunteer', 'design_team', 'co_lead');
  perform public.seed_club_staff('design.coremember.001@genai.community', 'Design Core Member 01', 'Ameeshi', 'volunteer', 'design_team', 'core_member');

  -- ── AI/ML & INNOVATION TEAM (6) ──
  perform public.seed_club_staff('aiml.lead@genai.community', 'AI/ML Lead', 'Lakshya Kant', 'aiml_lead', 'aiml_innovation_team', 'lead');
  perform public.seed_club_staff('aiml.co.lead@genai.community', 'AI/ML Co-Lead', 'Aaditya Agarwal', 'aiml_co_lead', 'aiml_innovation_team', 'co_lead');
  perform public.seed_club_staff('aiml.coremember.001@genai.community', 'AI/ML Core Member 01', 'Rachit Singh', 'volunteer', 'aiml_innovation_team', 'core_member');
  perform public.seed_club_staff('aiml.coremember.002@genai.community', 'AI/ML Core Member 02', 'Suhani Boxi', 'volunteer', 'aiml_innovation_team', 'core_member');
  perform public.seed_club_staff('aiml.coremember.003@genai.community', 'AI/ML Core Member 03', 'Sargam Ghagre', 'volunteer', 'aiml_innovation_team', 'core_member');
  perform public.seed_club_staff('aiml.coremember.004@genai.community', 'AI/ML Core Member 04', 'Aditya Verma', 'volunteer', 'aiml_innovation_team', 'core_member');

  -- ── SOCIAL MEDIA TEAM (6) ──
  perform public.seed_club_staff('social.lead@genai.community', 'Social Media Lead', 'Jharna Gupta', 'volunteer', 'social_media_team', 'lead');
  perform public.seed_club_staff('social.co.lead@genai.community', 'Social Media Co-Lead', 'Sakcham Shaw', 'volunteer', 'social_media_team', 'co_lead');
  perform public.seed_club_staff('social.coremember.001@genai.community', 'Social Media Core Member 01', 'Arpan Akar', 'volunteer', 'social_media_team', 'core_member');
  perform public.seed_club_staff('social.coremember.002@genai.community', 'Social Media Core Member 02', 'Ayesha Raza', 'volunteer', 'social_media_team', 'core_member');
  perform public.seed_club_staff('social.coremember.003@genai.community', 'Social Media Core Member 03', 'Sanidhya Raj', 'volunteer', 'social_media_team', 'core_member');
  perform public.seed_club_staff('social.coremember.004@genai.community', 'Social Media Core Member 04', 'Priyanshu Sinha', 'volunteer', 'social_media_team', 'core_member');

  -- ── PR & OUTREACH TEAM (7) ──
  perform public.seed_club_staff('pr.lead@genai.community', 'PR & Outreach Lead', 'Shashwat Mishra', 'volunteer', 'pr_outreach_team', 'lead');
  perform public.seed_club_staff('pr.co.lead@genai.community', 'PR & Outreach Co-Lead', 'Drishti Pandey', 'volunteer', 'pr_outreach_team', 'co_lead');
  perform public.seed_club_staff('pr.coremember.001@genai.community', 'PR & Outreach Core Member 01', 'Debasmita Ghosh', 'volunteer', 'pr_outreach_team', 'core_member');
  perform public.seed_club_staff('pr.coremember.002@genai.community', 'PR & Outreach Core Member 02', 'Palak Priya', 'volunteer', 'pr_outreach_team', 'core_member');
  perform public.seed_club_staff('pr.coremember.003@genai.community', 'PR & Outreach Core Member 03', 'Saanvi Mittal', 'volunteer', 'pr_outreach_team', 'core_member');
  perform public.seed_club_staff('pr.coremember.004@genai.community', 'PR & Outreach Core Member 04', 'Anjali Pandey', 'volunteer', 'pr_outreach_team', 'core_member');
  perform public.seed_club_staff('pr.coremember.005@genai.community', 'PR & Outreach Core Member 05', 'Pushkar Banjara', 'volunteer', 'pr_outreach_team', 'core_member');

  -- ── TECHNICAL TEAM (7) ──
  perform public.seed_club_staff('tech.lead@genai.community', 'Technical Lead', 'Abhinav Kumar', 'technical_lead', 'technical_team', 'lead');
  perform public.seed_club_staff('tech.co.lead@genai.community', 'Technical Co-Lead', 'Swetalina Sarangi', 'technical_co_lead', 'technical_team', 'co_lead');
  perform public.seed_club_staff('tech.coremember.001@genai.community', 'Technical Core Member 01', 'Anushka Bhatnagar', 'volunteer', 'technical_team', 'core_member');
  perform public.seed_club_staff('tech.coremember.002@genai.community', 'Technical Core Member 02', 'Rishab jain', 'volunteer', 'technical_team', 'core_member');
  perform public.seed_club_staff('tech.coremember.003@genai.community', 'Technical Core Member 03', 'Aaditi Shrivastava', 'volunteer', 'technical_team', 'core_member');
  perform public.seed_club_staff('tech.coremember.004@genai.community', 'Technical Core Member 04', 'Nitin Sharma', 'volunteer', 'technical_team', 'core_member');
  perform public.seed_club_staff('tech.coremember.005@genai.community', 'Technical Core Member 05', 'Nivedita Jain', 'volunteer', 'technical_team', 'core_member');

  -- ── CONTENT TEAM (4) ──
  perform public.seed_club_staff('content.lead@genai.community', 'Content Lead', 'Muskan Jha', 'volunteer', 'content_team', 'lead');
  perform public.seed_club_staff('content.co.lead@genai.community', 'Content Co-Lead', 'Muskan Bhatia', 'volunteer', 'content_team', 'co_lead');
  perform public.seed_club_staff('content.coremember.001@genai.community', 'Content Core Member 01', 'Kaustubh', 'volunteer', 'content_team', 'core_member');
  perform public.seed_club_staff('content.coremember.002@genai.community', 'Content Core Member 02', 'Arsh Arun', 'volunteer', 'content_team', 'core_member');

  -- ── FINANCE TEAM (2) ──
  perform public.seed_club_staff('finance.lead@genai.community', 'Finance Lead', 'Finance Lead', 'finance', 'finance_team', 'lead');
  perform public.seed_club_staff('finance.coremember.001@genai.community', 'Finance Core Member 01', 'Finance Core Member', 'finance', 'finance_team', 'core_member');

  raise notice 'Successfully seeded all Generative AI Community 2026-27 team accounts with allotted member names!';
end;
$$;
