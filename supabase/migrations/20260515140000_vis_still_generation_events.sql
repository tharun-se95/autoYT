-- Per-episode [VIS] stills (Imagen) — local disk path + optional Supabase row.

create table public.vis_still_generation_events (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  act_id text not null check (act_id in ('mess', 'deep_dive', 'mirror', 'way_forward')),
  block_index int not null check (block_index >= 0 and block_index < 10000),
  mime_type text not null default 'image/png',
  local_relative_path text not null,
  file_size_bytes bigint,
  sha256_hex text,
  working_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (video_id, act_id, block_index)
);

create index vis_still_generation_events_video_id_idx
  on public.vis_still_generation_events (video_id);

alter table public.vis_still_generation_events enable row level security;

comment on table public.vis_still_generation_events is
  'Imagen 16:9 stills from script [VIS] lines; local_relative_path under UPGRADE_LIFE_LOCAL_ASSETS_ROOT (vis-stills/…).';
