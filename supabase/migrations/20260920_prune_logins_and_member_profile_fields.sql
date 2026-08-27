-- ============================================================================
-- Migration: 20260920_prune_logins_and_member_profile_fields.sql
-- Description:
-- 1. Add official_email and github_url to public.members table.
-- 2. Void login authentication for all roles outside Tech, AIML, Finance, President, VP.
--    (Retains all 51 member profiles, multi-team assignments, and metadata in the Admin Members Dashboard).
-- ============================================================================

-- 1. Enhance members table with official email and github links
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS official_email text,
ADD COLUMN IF NOT EXISTS github_url text;

-- 2. Void/Disable login access in user_profiles for users outside President, VP, Tech, AIML, and Finance
UPDATE public.user_profiles
SET is_active = false,
    is_voided = true,
    password = ''
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
  'finance'
)
AND email NOT IN (
  'lakshya.24bce10549@vitbhopal.ac.in',
  'harshvardhan.24bce10511@vitbhopal.ac.in',
  'akshita.25bce10779@vitbhopal.ac.in'
);

-- 3. Ensure active login access for President, VP, Tech, AIML, Finance and Superadmin
UPDATE public.user_profiles
SET is_active = true,
    is_voided = false
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
  'finance'
)
OR email IN (
  'lakshya.24bce10549@vitbhopal.ac.in',
  'harshvardhan.24bce10511@vitbhopal.ac.in',
  'akshita.25bce10779@vitbhopal.ac.in'
);
