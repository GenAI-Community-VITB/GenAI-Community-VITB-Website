-- Run only after the new application and real Auth administrator are verified.
-- Passwords are now stored solely as Supabase Auth hashes.
begin;
alter table public.user_profiles drop column if exists password;
alter table public.user_profiles drop column if exists initial_password;
-- Historical reset notes may contain passwords from the previous implementation.
update public.password_reset_requests set notes = 'Legacy credential note removed'
where notes ~* 'password\s*:';
commit;
