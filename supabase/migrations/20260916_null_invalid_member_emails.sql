-- ============================================================================
-- Supabase SQL: Relax NOT NULL on user_profiles.email & Null invalid member emails
-- Format required: firstname.registrationnumber@vitbhopal.ac.in
-- (e.g. harshvardhan.24bce10511@vitbhopal.ac.in)
-- ============================================================================

-- 1. Allow user_profiles.email to be NULL
ALTER TABLE public.user_profiles ALTER COLUMN email DROP NOT NULL;

-- 2. Null out emails in user_profiles that do NOT match firstname.registrationnumber@vitbhopal.ac.in
-- Regex breakdown:
--   ^[a-zA-Z0-9_-]+   -> first name
--   \.                -> literal dot
--   [0-9]{2}[a-zA-Z]{2,5}[0-9]{3,6} -> batch year (2 digits) + branch code (2-5 letters) + roll/reg number (3-6 digits)
--   @vitbhopal\.ac\.in$ -> domain
UPDATE public.user_profiles
SET 
  email = NULL,
  updated_at = NOW()
WHERE 
  email IS NOT NULL 
  AND email !~* '^[a-zA-Z0-9_-]+\.[0-9]{2}[a-zA-Z]{2,5}[0-9]{3,6}@vitbhopal\.ac\.in$';

-- 3. (Optional) Check results
SELECT id, full_name, assigned_to_name, role, email 
FROM public.user_profiles 
ORDER BY email NULLS LAST;
