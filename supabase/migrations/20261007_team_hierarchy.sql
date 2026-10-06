BEGIN;
-- Display configuration only: does not modify members, login roles or event data.
CREATE TABLE IF NOT EXISTS public.team_hierarchy_layout (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(nodes) = 'array' AND jsonb_array_length(nodes) <= 250),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_hierarchy_layout ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.team_hierarchy_layout FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.team_hierarchy_layout TO service_role;
COMMENT ON TABLE public.team_hierarchy_layout IS 'Public team display layout; writes only through authorized server action. No row means legacy layout.';
COMMIT;
