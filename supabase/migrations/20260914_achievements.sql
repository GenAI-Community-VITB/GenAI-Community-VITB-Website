-- ============================================================================
-- ACHIEVEMENTS TABLE & PERMISSIONS (Panel & Top-6 Admin CRUD)
-- ============================================================================

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text not null,
  category text not null default 'Hackathon' check (
    category in ('Hackathon', 'Research', 'Award', 'Milestone', 'Workshop', 'Recognition')
  ),
  achievement_date date not null default current_date,
  image_url text,
  drive_file_id text,
  link_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.achievements enable row level security;
drop policy if exists "Allow read achievements to all" on public.achievements;
create policy "Allow read achievements to all" on public.achievements for select using (true);
drop policy if exists "Allow manage achievements to staff" on public.achievements;
create policy "Allow manage achievements to staff" on public.achievements for all using (true);

-- Seed some initial notable achievements
insert into public.achievements (title, caption, category, achievement_date, link_url)
values 
  (
    'National GenAI Hackathon Winners',
    'Secured 1st place in the national-level Generative AI Hackathon with an autonomous multi-modal agent system.',
    'Hackathon',
    '2026-03-15',
    'https://genai.community'
  ),
  (
    'Research Paper Accepted in IEEE / Springer',
    'Published breakthrough research on efficient prompt caching and multi-agent coordination topologies.',
    'Research',
    '2026-05-20',
    'https://genai.community'
  ),
  (
    '1500+ Community Registrations Milestone',
    'Crossed over 1,500 active participants registered across our AI workshop series and flagship hackathon.',
    'Milestone',
    '2026-08-01',
    'https://genai.community'
  )
on conflict do nothing;

notify pgrst, 'reload schema';
