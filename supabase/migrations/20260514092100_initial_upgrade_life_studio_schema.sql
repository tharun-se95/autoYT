-- Upgrade Life studio: content runs, ideas, scripts (RLS on; use service role from Next server).
-- Applied to project upgrade-life-studio via Supabase MCP; keep file for local `supabase db` workflows.

create extension if not exists "pgcrypto";

create table public.idea_generation_runs (
  id uuid primary key default gen_random_uuid(),
  topics text not null,
  idea_count int not null default 6 check (idea_count > 0 and idea_count <= 24),
  created_at timestamptz not null default now()
);

create table public.generated_ideas (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.idea_generation_runs (id) on delete cascade,
  title text not null,
  hook text not null,
  thumbnail_visual_description text not null,
  thumbnail_text_overlay text not null,
  thumbnail_text_glow text not null check (thumbnail_text_glow in ('cyan', 'amber')),
  pillar text not null check (
    pillar in (
      'modern_mind',
      'sorted_finance',
      'biological_reset',
      'relationship_engineering'
    )
  ),
  created_at timestamptz not null default now()
);

create index generated_ideas_run_id_idx on public.generated_ideas (run_id);

create table public.script_documents (
  id uuid primary key default gen_random_uuid(),
  episode_brief text not null,
  working_title text not null,
  document jsonb not null,
  created_at timestamptz not null default now()
);

create index script_documents_created_at_idx on public.script_documents (created_at desc);

create table public.thumbnail_generation_events (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references public.generated_ideas (id) on delete set null,
  mime_type text not null default 'image/png',
  created_at timestamptz not null default now()
);

alter table public.idea_generation_runs enable row level security;
alter table public.generated_ideas enable row level security;
alter table public.script_documents enable row level security;
alter table public.thumbnail_generation_events enable row level security;

comment on table public.idea_generation_runs is 'Content architect: one row per generate-ideas request (topics seed).';
comment on table public.generated_ideas is 'Structured VideoIdea rows from Gemini.';
comment on table public.script_documents is 'Lead scriptwriter output; document is ScriptDocument JSON.';
comment on table public.thumbnail_generation_events is 'Imagen generation audit trail; link blobs via Storage when added.';
