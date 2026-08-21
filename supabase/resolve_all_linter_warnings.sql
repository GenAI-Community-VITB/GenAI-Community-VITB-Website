-- ============================================================================
-- SUPABASE DATABASE LINTER WARNINGS - COMPLETE REMEDIATION SCRIPT
-- ============================================================================
-- Resolves all reported warnings:
-- 1. function_search_path_mutable: Fixes mutable search_path on set_updated_at
-- 2. rls_policy_always_true: Drops unrestricted "ALL" policies on achievements,
--    event_winners, members, projects, and teams, and re-creates properly scoped
--    policies (Public SELECT + Explicit service_role write access).
--
-- Instructions: Copy and run this entire script in your Supabase SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FIX FUNCTION SEARCH PATH MUTABLE (function_search_path_mutable)
-- ----------------------------------------------------------------------------
-- Enforce immutable search_path on trigger and utility functions to prevent
-- search_path hijacking attacks.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Ensure ALTER also pins the search path in case the function was already compiled
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;


-- ----------------------------------------------------------------------------
-- 2. FIX OVERLY PERMISSIVE RLS POLICIES (rls_policy_always_true)
-- ----------------------------------------------------------------------------
-- Problem: Policies with `FOR ALL USING (true) WITH CHECK (true)` that omitted
-- `TO service_role` applied to the `public` pseudo-role (allowing unrestricted
-- INSERT/UPDATE/DELETE).
-- Fix: Drop the permissive ALL policies and ensure:
--   - SELECT is public (USING true)
--   - INSERT/UPDATE/DELETE is strictly scoped TO service_role only.

-- A. Table: achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manage achievements" ON public.achievements;
DROP POLICY IF EXISTS "Public read achievements" ON public.achievements;
DROP POLICY IF EXISTS "Allow public read on achievements" ON public.achievements;

CREATE POLICY "Public read achievements"
  ON public.achievements
  FOR SELECT
  USING (true);

CREATE POLICY "Service role manage achievements"
  ON public.achievements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- B. Table: event_winners
ALTER TABLE public.event_winners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manage event_winners" ON public.event_winners;
DROP POLICY IF EXISTS "Public read event_winners" ON public.event_winners;
DROP POLICY IF EXISTS "Allow public read on event_winners" ON public.event_winners;

CREATE POLICY "Public read event_winners"
  ON public.event_winners
  FOR SELECT
  USING (true);

CREATE POLICY "Service role manage event_winners"
  ON public.event_winners
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- C. Table: members
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manage members" ON public.members;
DROP POLICY IF EXISTS "Public read members" ON public.members;
DROP POLICY IF EXISTS "Allow public read on members" ON public.members;

CREATE POLICY "Public read members"
  ON public.members
  FOR SELECT
  USING (true);

CREATE POLICY "Service role manage members"
  ON public.members
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- D. Table: projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manage projects" ON public.projects;
DROP POLICY IF EXISTS "Public read projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public read on projects" ON public.projects;

CREATE POLICY "Public read projects"
  ON public.projects
  FOR SELECT
  USING (true);

CREATE POLICY "Service role manage projects"
  ON public.projects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- E. Table: teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manage teams" ON public.teams;
DROP POLICY IF EXISTS "Public read teams" ON public.teams;
DROP POLICY IF EXISTS "Allow public read on teams" ON public.teams;

CREATE POLICY "Public read teams"
  ON public.teams
  FOR SELECT
  USING (true);

CREATE POLICY "Service role manage teams"
  ON public.teams
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ----------------------------------------------------------------------------
-- 3. ENSURE EVENTS AND OTHER CORE TABLES REMAIN HARDENED
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manage events" ON public.events;
DROP POLICY IF EXISTS "Public read events" ON public.events;

CREATE POLICY "Public read events"
  ON public.events
  FOR SELECT
  USING (true);

CREATE POLICY "Service role manage events"
  ON public.events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- VERIFICATION NOTIFICATION:
-- Run the Supabase Database Linter again in Dashboard -> Database -> Linter.
-- All function_search_path_mutable and rls_policy_always_true warnings will be 0.
-- ============================================================================
