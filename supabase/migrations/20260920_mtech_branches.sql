-- ============================================================================
-- Migration: 20260920_mtech_branches.sql
-- Description: Adds official VIT Bhopal M.Tech and Integrated M.Tech programs
--              from Schools List (SCSE, SEEE, SASL) to branches table.
-- ============================================================================

insert into public.branches (name, code, display_order) values
  -- M.Tech 2-Year Programmes
  ('M.Tech. Computer Science & Engineering (Artificial Intelligence & Data Science)', 'MTECH-AIDS', 20),
  ('M.Tech. Computer Science & Engineering (Cyber Security & Digital Forensics)', 'MTECH-CYBER', 21),
  ('M.Tech. Computer Science & Engineering (Computational & Data Science)', 'MTECH-CDS', 22),
  ('M.Tech. VLSI Design', 'MTECH-VLSI', 23),
  -- Integrated M.Tech (5-Year) Programmes
  ('Integrated M.Tech. Computer Science & Engineering (Artificial Intelligence & Machine Learning)', 'INT-MTECH-AIML', 24),
  ('Integrated M.Tech. Computer Science & Engineering (Cyber Security & Digital Forensics)', 'INT-MTECH-CYBER', 25),
  ('Integrated M.Tech. Computer Science & Engineering (Computational & Data Science)', 'INT-MTECH-CDS', 26),
  ('Integrated M.Tech. Software Engineering', 'INT-MTECH-SE', 27)
on conflict (code) do update
  set name = excluded.name,
      display_order = excluded.display_order,
      updated_at = now();
