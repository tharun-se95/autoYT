-- Create channel_prompts table
create table if not exists public.channel_prompts (
  id uuid default gen_random_uuid() primary key,
  channel_id text not null references public.channels(id) on delete cascade,
  prompt_key text not null,
  version text not null default 'v1.0',
  prompt_text text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Prevent duplicate prompts of the same key and version on a channel
  constraint unique_channel_prompt_key_version unique(channel_id, prompt_key, version)
);

-- Indexing for rapid resolver searches
create index if not exists idx_channel_prompts_lookup 
on public.channel_prompts(channel_id, prompt_key, version) 
where is_active = true;

-- Enable Row Level Security (RLS)
alter table public.channel_prompts enable row level security;

-- Policy: Allow read access to all authenticated users
create policy "Allow read access to authenticated users"
on public.channel_prompts for select
to authenticated
using (true);

-- Policy: Allow full modifications to service role / admin
create policy "Allow full admin modification"
on public.channel_prompts for all
to service_role
using (true)
with check (true);
