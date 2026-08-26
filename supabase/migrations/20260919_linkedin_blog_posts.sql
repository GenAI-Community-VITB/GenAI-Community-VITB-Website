-- ============================================================================
-- Migration: 20260919_linkedin_blog_posts.sql
-- Description: Table for LinkedIn updates and AI-summarized club blog posts.
-- ============================================================================

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  original_content text,
  post_url text not null,
  author_name text default 'GENAI Social Media Team',
  tags text[] default array['LinkedIn', 'Community']::text[],
  is_published boolean not null default true,
  display_order integer default 0,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_blog_posts_published on public.blog_posts(is_published, published_at desc);

-- RLS
alter table public.blog_posts enable row level security;

-- Public can read published blog posts
drop policy if exists "Public read published blog posts" on public.blog_posts;
create policy "Public read published blog posts" on public.blog_posts
  for select using (is_published = true);

-- Service role can manage
drop policy if exists "Service role manage blog posts" on public.blog_posts;
create policy "Service role manage blog posts" on public.blog_posts
  for all using (true) with check (true);

-- Seed initial representative LinkedIn posts with AI summaries
insert into public.blog_posts (title, summary, original_content, post_url, author_name, tags, published_at)
values
  (
    'Demystifying Multi-Modal Agentic Workflows & Tool Calling',
    'Exploring autonomous agent reasoning paradigms, deterministic tool-calling loops, and production design patterns tested in our research lab.',
    'Our technical research division recently concluded a deep dive into building production-grade autonomous agent loops...',
    'https://www.linkedin.com/company/generative-ai-community-vit-bhopal/',
    'GENAI Tech Division',
    array['AI Agents', 'Research', 'Tool Calling'],
    now() - interval '2 days'
  ),
  (
    'National Hackathon Victory: Team GenAI Clinches Top Podium',
    'Celebrating our club innovators who engineered a low-latency edge AI system for clinical diagnosis, securing 1st place in national finals.',
    'Thrilled to announce that our student innovators bagged 1st position with a cash prize at the National AI Innovators Sprint...',
    'https://www.linkedin.com/company/generative-ai-community-vit-bhopal/',
    'GENAI PR & Outreach',
    array['Hackathon', 'Victory', 'Innovation'],
    now() - interval '5 days'
  ),
  (
    'From Prompts to Production: Hands-on Transformer Architecture Workshop',
    'Over 450+ attendees joined our intensive masterclass breaking down self-attention mechanisms, KV-caching, and FlashAttention optimizations.',
    'A powerhouse weekend at VIT Bhopal! Our lead researchers led an end-to-end masterclass on modern LLM inference pipelines...',
    'https://www.linkedin.com/company/generative-ai-community-vit-bhopal/',
    'GENAI Event Management',
    array['Workshop', 'LLMs', 'Transformers'],
    now() - interval '10 days'
  )
on conflict do nothing;
