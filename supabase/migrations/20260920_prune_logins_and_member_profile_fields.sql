-- ============================================================================
-- Migration: 20260920_prune_logins_and_member_profile_fields.sql
-- Description:
-- 1. Add official_email and github_url to public.members table.
-- 2. Restrict active admin login accounts strictly to President, VP, Technical Team,
--    AI/ML Innovation Team, and Finance Team (excludes HR and all other non-technical/non-finance roles).
--    (Preserves all 51 team members in public.members for the website).
-- ============================================================================

-- 1. Enhance members table with official email and github links
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS official_email text,
ADD COLUMN IF NOT EXISTS github_url text;

-- 2. Prune login roles for users outside President, VP, Tech, AIML, and Finance
DELETE FROM public.member_roles
WHERE user_id IN (
  SELECT id FROM public.user_profiles
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
  )
);

-- 3. Prune user_profiles for users outside President, VP, Tech, AIML, and Finance
DELETE FROM public.user_profiles
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
