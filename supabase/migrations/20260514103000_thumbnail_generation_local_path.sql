-- Local disk assets (e.g. external SSD): DB stores path relative to UPGRADE_LIFE_LOCAL_ASSETS_ROOT.

alter table public.thumbnail_generation_events
  add column if not exists local_relative_path text,
  add column if not exists file_size_bytes bigint,
  add column if not exists sha256_hex text;

comment on column public.thumbnail_generation_events.local_relative_path is
  'File path relative to UPGRADE_LIFE_LOCAL_ASSETS_ROOT (posix segments, e.g. thumbnails/2026/05/<uuid>.png).';
comment on column public.thumbnail_generation_events.file_size_bytes is 'Byte length of the file on disk.';
comment on column public.thumbnail_generation_events.sha256_hex is 'SHA-256 of file bytes for dedupe/integrity.';

create index if not exists thumbnail_generation_events_local_path_idx
  on public.thumbnail_generation_events (local_relative_path)
  where local_relative_path is not null;
