-- ============================================================================
-- Migration: Event Degree & Branch Eligibility Configuration (B.Tech & M.Tech)
-- ============================================================================

-- 1. Add eligibility columns to events table
alter table public.events
  add column if not exists allowed_degrees text[] not null default array['B.Tech', 'M.Tech']::text[],
  add column if not exists allowed_branches text[] default null,
  add column if not exists eligibility_notes text default null;

-- Ensure existing events default safely to allowing both B.Tech and M.Tech
update public.events
set allowed_degrees = array['B.Tech', 'M.Tech']::text[]
where allowed_degrees is null or cardinality(allowed_degrees) = 0;

-- 2. Seed all official VIT Bhopal M.Tech & Integrated M.Tech programs from official Schools List (SCSE, SCAI, SEEE, SBE)
insert into public.branches (name, code, display_order) values
  -- SCSE / SCAI - M.Tech 2-Year Programmes
  ('M.Tech. Computer Science & Engineering (Artificial Intelligence & Data Science)', 'MTECH-AIDS', 20),
  ('M.Tech. Computer Science & Engineering (Cyber Security & Digital Forensics)', 'MTECH-CYBER', 21),
  ('M.Tech. Computer Science & Engineering (Computational & Data Science)', 'MTECH-CDS', 22),
  -- SEEE - M.Tech 2-Year Programmes
  ('M.Tech. VLSI Design', 'MTECH-VLSI', 23),
  -- SCSE / SCAI - Integrated M.Tech (5-Year) Programmes
  ('Integrated M.Tech. Computer Science & Engineering (Artificial Intelligence & Machine Learning)', 'INT-MTECH-AIML', 24),
  ('Integrated M.Tech. Computer Science & Engineering (Cyber Security & Digital Forensics)', 'INT-MTECH-CYBER', 25),
  ('Integrated M.Tech. Computer Science & Engineering (Computational & Data Science)', 'INT-MTECH-CDS', 26),
  ('Integrated M.Tech. Software Engineering', 'INT-MTECH-SE', 27),
  -- SBE - Integrated M.Tech Programme
  ('Integrated M.Tech. Artificial Intelligence & Bioinformatics', 'INT-MTECH-AIBIO', 28)
on conflict (code) do update
  set name = excluded.name,
      display_order = excluded.display_order,
      updated_at = now();
