-- ============================================================================
-- Supabase Migration: Add Avatar & Drive columns to user_profiles
-- ============================================================================

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS drive_file_id TEXT;

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles';
