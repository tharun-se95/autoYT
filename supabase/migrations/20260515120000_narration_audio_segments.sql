-- Per-block narration TTS files on disk; DB row for reload via Studio API.

create table public.narration_audio_segments (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  act_id text not null check (
    act_id in ('mess', 'deep_dive', 'mirror', 'way_forward')
  ),
  block_index int not null check (block_index >= 0 and block_index < 10000),
  mime_type text not null default 'audio/wav',
  local_relative_path text not null,
  file_size_bytes bigint,
  sha256_hex text,
  working_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (video_id, act_id, block_index)
);

create index narration_audio_segments_video_id_idx
  on public.narration_audio_segments (video_id);

alter table public.narration_audio_segments enable row level security;

comment on table public.narration_audio_segments is
  'Gemini TTS per narration block; `local_relative_path` is under UPGRADE_LIFE_LOCAL_ASSETS_ROOT (see narration-audio/…).';
