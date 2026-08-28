-- ============================================================================
-- Migration: 20260923_disable_login_migration.sql
-- Description:
-- 1. Enhance user_profiles with login disablement columns (replacing voiding).
-- 2. Add event spotlight news ticker columns to events table.
-- 3. Ensure GitHub URL is supported across user_profiles & members.
-- 4. Enable accounts for President, VP, Tech, AIML, Finance, and HR teams.
-- 5. Set login access disabled for other club members (preserving passwords & records).
-- ============================================================================

-- 1. Enhance user_profiles table with login disablement & github columns
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_login_disabled boolean not null default false,
ADD COLUMN IF NOT EXISTS login_disabled_at timestamptz,
ADD COLUMN IF NOT EXISTS login_disabled_reason text,
ADD COLUMN IF NOT EXISTS github_url text;

-- 2. Enhance events table with spotlight news ticker columns
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_spotlight boolean not null default true,
ADD COLUMN IF NOT EXISTS spotlight_message text,
ADD COLUMN IF NOT EXISTS spotlight_priority integer not null default 1;

-- 3. Ensure public.members table has github_url and official_email
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS official_email text,
ADD COLUMN IF NOT EXISTS github_url text;

-- 4. Sync legacy is_voided to is_login_disabled if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'is_voided'
  ) THEN
    UPDATE public.user_profiles
    SET is_login_disabled = COALESCE(is_voided, false),
        login_disabled_at = voided_at,
        login_disabled_reason = voided_reason;
  END IF;
END $$;

-- 5. Ensure active login access for President, Vice President, Tech Team, AIML Team, Finance Team, and HR Team
UPDATE public.user_profiles
SET is_active = true,
    is_login_disabled = false,
    login_disabled_at = null,
    login_disabled_reason = null
WHERE role IN (
  'president',
  'vice_president',
  'technical_lead',
  'technical_co_lead',
  'tech',
  'aiml_lead',
  'aiml_co_lead',
  'finance_lead',
  'finance_co_lead',
  'finance',
  'hr_lead',
  'hr_co_lead',
  'hr',
  'superadmin'
)
OR email IN (
  'lakshya.24bce10549@vitbhopal.ac.in',
  'harshvardhan.24bce10511@vitbhopal.ac.in',
  'akshita.25bce10779@vitbhopal.ac.in',
  'abhinav.24bsa10110@vitbhopal.ac.in',
  'amritanshu.25bce10255@vitbhopal.ac.in',
  'srishti.25bce10196@vitbhopal.ac.in'
)
OR id IN (
  SELECT user_id FROM public.member_roles
  WHERE team IN ('technical', 'technical_team', 'aiml', 'aiml_innovation_team', 'finance', 'finance_team', 'human_resources', 'hr_team', 'executive_panel', 'top_6', 'top-6')
);

-- 6. Disable login access for general members outside the authorized active teams
-- NOTE: Kept records, kept roles, and kept passwords — only disable login access.
UPDATE public.user_profiles
SET is_active = false,
    is_login_disabled = true,
    login_disabled_at = COALESCE(login_disabled_at, now()),
    login_disabled_reason = COALESCE(login_disabled_reason, 'Login disabled by default for operational role')
WHERE role NOT IN (
  'president',
  'vice_president',
  'technical_lead',
  'technical_co_lead',
  'tech',
  'aiml_lead',
  'aiml_co_lead',
  'finance_lead',
  'finance_co_lead',
  'finance',
  'hr_lead',
  'hr_co_lead',
  'hr',
  'superadmin'
)
AND email NOT IN (
  'lakshya.24bce10549@vitbhopal.ac.in',
  'harshvardhan.24bce10511@vitbhopal.ac.in',
  'akshita.25bce10779@vitbhopal.ac.in',
  'abhinav.24bsa10110@vitbhopal.ac.in',
  'amritanshu.25bce10255@vitbhopal.ac.in',
  'srishti.25bce10196@vitbhopal.ac.in'
)
AND id NOT IN (
  SELECT user_id FROM public.member_roles
  WHERE team IN ('technical', 'technical_team', 'aiml', 'aiml_innovation_team', 'finance', 'finance_team', 'human_resources', 'hr_team', 'executive_panel', 'top_6', 'top-6')
);
