-- ============================================================================
-- MASTER AUTH RESET & SEED SCRIPT (2026-27 Community Roster)
-- Official VIT Bhopal Email Domain Edition (@vitbhopal.ac.in)
-- Run this in the Supabase Dashboard -> SQL Editor and click RUN.
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Ensure schema columns exist on public.user_profiles
alter table public.user_profiles drop constraint if exists user_profiles_role_check;
alter table public.user_profiles
  add column if not exists assigned_to_name text,
  add column if not exists password text default 'GenAICommunity@2026-27',
  add column if not exists avatar_url text,
  add column if not exists is_voided boolean not null default false,
  add column if not exists voided_at timestamptz,
  add column if not exists voided_reason text;

-- 2. Ensure public.member_roles table exists
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

-- 3. Upsert helper function to update existing or create new without duplicate rows
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
  v_user_id uuid;
  v_encrypted_pw text := crypt(p_password, gen_salt('bf'));
begin
  -- Check if user exists by email or assigned name in user_profiles
  select id into v_user_id from public.user_profiles 
  where lower(email) = lower(p_email) or lower(assigned_to_name) = lower(p_assigned_to) 
  limit 1;

  if v_user_id is not null then
    -- Update existing auth.users
    update auth.users set
      email = p_email,
      encrypted_password = v_encrypted_pw,
      raw_user_meta_data = jsonb_build_object('full_name', p_full_name, 'assigned_to_name', p_assigned_to, 'role', p_role),
      updated_at = now()
    where id = v_user_id;

    -- Update existing user_profiles
    update public.user_profiles set
      email = p_email,
      full_name = p_full_name,
      assigned_to_name = p_assigned_to,
      role = p_role,
      password = p_password,
      updated_at = now()
    where id = v_user_id;
  else
    v_user_id := gen_random_uuid();

    -- Insert into auth.users
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
      false,
      false,
      now(),
      now()
    );

    -- Insert into auth.identities
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

    -- Insert into public.user_profiles
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
  end if;

  -- Upsert into public.member_roles
  delete from public.member_roles where user_id = v_user_id;
  insert into public.member_roles (user_id, team, position)
  values (v_user_id, p_team, p_position);

  return v_user_id;
end;
$$;

-- 4. Seed all members with official @vitbhopal.ac.in emails
do $$
begin
  -- ── PANEL (8) ──
  perform public.create_clean_staff_account('harshvardhan.24bce10511@vitbhopal.ac.in', 'Club President', 'Harshvardhan Om', 'president', 'panel', 'president');
  perform public.create_clean_staff_account('akshita.25bce10779@vitbhopal.ac.in', 'Vice President', 'Akshita Singh', 'vice_president', 'panel', 'vice_president');
  perform public.create_clean_staff_account('anuj.gen.sec@vitbhopal.ac.in', 'General Secretary (Provisional)', 'Anuj Srivastava', 'volunteer', 'panel', 'general_secretary_provisional');
  perform public.create_clean_staff_account('aditya.gen.sec@vitbhopal.ac.in', 'General Secretary', 'Aditya Mishra', 'volunteer', 'panel', 'general_secretary');
  perform public.create_clean_staff_account('anvi.joint.sec@vitbhopal.ac.in', 'Joint Secretary', 'Anvi Vajpayee', 'volunteer', 'panel', 'joint_secretary');
  perform public.create_clean_staff_account('archita.asst.sec@vitbhopal.ac.in', 'Assistant Secretary', 'Archita Shukla', 'volunteer', 'panel', 'assistant_secretary');
  perform public.create_clean_staff_account('ishani.25boe10013@vitbhopal.ac.in', 'Student Coordinator 01', 'Ishani Verma', 'volunteer', 'panel', 'student_coordinator_01');
  perform public.create_clean_staff_account('prince.25bai11117@vitbhopal.ac.in', 'Student Coordinator 02', 'Prince Agrawal', 'volunteer', 'panel', 'student_coordinator_02');

  -- ── HR (4) ──
  perform public.create_clean_staff_account('amritanshu.hr@vitbhopal.ac.in', 'HR Team Lead', 'Amritanshu Gupta', 'volunteer', 'hr_team', 'team_lead');
  perform public.create_clean_staff_account('srishti.hr@vitbhopal.ac.in', 'HR Team Co-Lead', 'Srishti Manav', 'volunteer', 'hr_team', 'co_lead');
  perform public.create_clean_staff_account('nilansh.hr@vitbhopal.ac.in', 'HR Core Member 01', 'Nilansh Chauhan', 'volunteer', 'hr_team', 'core_member');
  perform public.create_clean_staff_account('aashka.hr@vitbhopal.ac.in', 'HR Core Member 02', 'Aashka Swaroop', 'volunteer', 'hr_team', 'core_member');

  -- ── EVENT MANAGEMENT (4) ──
  perform public.create_clean_staff_account('priynash.24bcy10117@vitbhopal.ac.in', 'Event Management Lead', 'Priyansh Upadhyay', 'volunteer', 'event_management', 'team_lead');
  perform public.create_clean_staff_account('anya.25bai11254@vitbhopal.ac.in', 'Event Management Co-Lead', 'Anya Singh', 'volunteer', 'event_management', 'co_lead');
  perform public.create_clean_staff_account('shikha.24bai10244@vitbhopal.ac.in', 'Event Core Member 01', 'Shikha Singh', 'volunteer', 'event_management', 'core_member');
  perform public.create_clean_staff_account('shaurya.24bce10339@vitbhopal.ac.in', 'Event Core Member 02', 'Shaurya Tyagi', 'volunteer', 'event_management', 'core_member');

  -- ── DESIGN TEAM (3) ──
  perform public.create_clean_staff_account('agrim.24bcg10060@vitbhopal.ac.in', 'Design Team Lead', 'Agrim Mathur', 'volunteer', 'design_team', 'team_lead');
  perform public.create_clean_staff_account('kushagra.25bai11055@vitbhopal.ac.in', 'Design Team Co-Lead', 'Kushagra Nigam', 'volunteer', 'design_team', 'co_lead');
  perform public.create_clean_staff_account('ameeshi.design@vitbhopal.ac.in', 'Design Core Member 01', 'Ameeshi', 'volunteer', 'design_team', 'core_member');

  -- ── AI/ML & INNOVATION TEAM (6) ──
  perform public.create_clean_staff_account('lakshya.24bce10549@vitbhopal.ac.in', 'AI/ML & Innovation Lead', 'Lakshya Kant', 'aiml_lead', 'aiml_innovation', 'team_lead');
  perform public.create_clean_staff_account('aaditya.25bai10079@vitbhopal.ac.in', 'AI/ML & Innovation Co-Lead', 'Aaditya Agarwal', 'aiml_co_lead', 'aiml_innovation', 'co_lead');
  perform public.create_clean_staff_account('rachit.25bsa10113@vitbhopal.ac.in', 'AI/ML Core Member 01', 'Rachit Singh', 'volunteer', 'aiml_innovation', 'core_member');
  perform public.create_clean_staff_account('suhani.25bai10011@vitbhopal.ac.in', 'AI/ML Core Member 02', 'Suhani Boxi', 'volunteer', 'aiml_innovation', 'core_member');
  perform public.create_clean_staff_account('sargam.24mip10155@vitbhopal.ac.in', 'AI/ML Core Member 03', 'Sargam Ghagre', 'volunteer', 'aiml_innovation', 'core_member');
  perform public.create_clean_staff_account('aditya.24bce10697@vitbhopal.ac.in', 'AI/ML Core Member 04', 'Aditya Verma', 'volunteer', 'aiml_innovation', 'core_member');

  -- ── SOCIAL MEDIA TEAM (6) ──
  perform public.create_clean_staff_account('jharna.25bai10557@vitbhopal.ac.in', 'Social Media Lead', 'Jharna Gupta', 'volunteer', 'social_media', 'team_lead');
  perform public.create_clean_staff_account('sakcham.25mei10005@vitbhopal.ac.in', 'Social Media Co-Lead', 'Sakcham Shaw', 'volunteer', 'social_media', 'co_lead');
  perform public.create_clean_staff_account('arpan.25bai10112@vitbhopal.ac.in', 'Social Media Core 01', 'Arpan Akar', 'volunteer', 'social_media', 'core_member');
  perform public.create_clean_staff_account('ayesha.25bai10998@vitbhopal.ac.in', 'Social Media Core 02', 'Ayesha Raza', 'volunteer', 'social_media', 'core_member');
  perform public.create_clean_staff_account('sanidhya.24bai10494@vitbhopal.ac.in', 'Social Media Core 03', 'Sanidhya Raj', 'volunteer', 'social_media', 'core_member');
  perform public.create_clean_staff_account('priyanshu.25bce10710@vitbhopal.ac.in', 'Social Media Core 04', 'Priyanshu Sinha', 'volunteer', 'social_media', 'core_member');

  -- ── PR & OUTREACH TEAM (7) ──
  perform public.create_clean_staff_account('shashwat.25bai10233@vitbhopal.ac.in', 'PR & Outreach Lead', 'Shashwat Mishra', 'volunteer', 'pr_outreach', 'team_lead');
  perform public.create_clean_staff_account('drishti.25boe10138@vitbhopal.ac.in', 'PR & Outreach Co-Lead', 'Drishti Pandey', 'volunteer', 'pr_outreach', 'co_lead');
  perform public.create_clean_staff_account('debasmita.25boe10075@vitbhopal.ac.in', 'PR Core Member 01', 'Debasmita Ghosh', 'volunteer', 'pr_outreach', 'core_member');
  perform public.create_clean_staff_account('palak.25bhi10116@vitbhopal.ac.in', 'PR Core Member 02', 'Palak Priya', 'volunteer', 'pr_outreach', 'core_member');
  perform public.create_clean_staff_account('saanvi.25bce10473@vitbhopal.ac.in', 'PR Core Member 03', 'Saanvi Mittal', 'volunteer', 'pr_outreach', 'core_member');
  perform public.create_clean_staff_account('anjali.25bai10296@vitbhopal.ac.in', 'PR Core Member 04', 'Anjali Pandey', 'volunteer', 'pr_outreach', 'core_member');
  perform public.create_clean_staff_account('pushkar.25bet10028@vitbhopal.ac.in', 'PR Core Member 05', 'Pushkar Banjara', 'volunteer', 'pr_outreach', 'core_member');

  -- ── TECHNICAL TEAM (7) ──
  perform public.create_clean_staff_account('abhinav.24bsa10110@vitbhopal.ac.in', 'Technical Team Lead', 'Abhinav Kumar', 'technical_lead', 'technical_team', 'team_lead');
  perform public.create_clean_staff_account('swetalina.24bce10419@vitbhopal.ac.in', 'Technical Team Co-Lead', 'Swetalina Sarangi', 'technical_co_lead', 'technical_team', 'co_lead');
  perform public.create_clean_staff_account('anushka.25bce10312@vitbhopal.ac.in', 'Technical Core 01', 'Anushka Bhatnagar', 'volunteer', 'technical_team', 'core_member');
  perform public.create_clean_staff_account('rishab.25bce10989@vitbhopal.ac.in', 'Technical Core 02', 'Rishab jain', 'volunteer', 'technical_team', 'core_member');
  perform public.create_clean_staff_account('aaditi.25bcy10019@vitbhopal.ac.in', 'Technical Core 03', 'Aaditi Shrivastava', 'volunteer', 'technical_team', 'core_member');
  perform public.create_clean_staff_account('nitin.25bai11122@vitbhopal.ac.in', 'Technical Core 04', 'Nitin Sharma', 'volunteer', 'technical_team', 'core_member');
  perform public.create_clean_staff_account('nivedita.25mim10038@vitbhopal.ac.in', 'Technical Core 05', 'Nivedita Jain', 'volunteer', 'technical_team', 'core_member');

  -- ── CONTENT TEAM (4) ──
  perform public.create_clean_staff_account('muskan.25bce11431@vitbhopal.ac.in', 'Content Team Lead', 'Muskan Jha', 'volunteer', 'content_team', 'team_lead');
  perform public.create_clean_staff_account('muskan.25bai10064@vitbhopal.ac.in', 'Content Team Co-Lead', 'Muskan Bhatia', 'volunteer', 'content_team', 'co_lead');
  perform public.create_clean_staff_account('kaustubh.25bce10722@vitbhopal.ac.in', 'Content Core Member 01', 'Kaustubh', 'volunteer', 'content_team', 'core_member');
  perform public.create_clean_staff_account('arsh.25bai10482@vitbhopal.ac.in', 'Content Core Member 02', 'Arsh Arun', 'volunteer', 'content_team', 'core_member');

  -- ── FINANCE TEAM (2) ──
  perform public.create_clean_staff_account('finance.lead@vitbhopal.ac.in', 'Finance Team Lead', 'Finance Lead', 'finance', 'finance_team', 'team_lead');
  perform public.create_clean_staff_account('finance.core@vitbhopal.ac.in', 'Finance Core Member', 'Finance Core Member', 'finance', 'finance_team', 'core_member');
end;
$$;

-- 5. Reload PostgREST schema cache
notify pgrst, 'reload schema';
