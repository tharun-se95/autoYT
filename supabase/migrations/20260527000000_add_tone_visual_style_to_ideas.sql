-- Add suggested_tone and suggested_visual_style columns to generated_ideas table.

alter table public.generated_ideas
  add column if not exists suggested_tone text not null default 'analytical' check (suggested_tone in ('analytical', 'stoic', 'provocative', 'calm')),
  add column if not exists suggested_visual_style text not null default 'metaphoric' check (suggested_visual_style in ('metaphoric', 'narrative', 'typography-focused'));

comment on column public.generated_ideas.suggested_tone is 'Suggested overall tone for the script, provided by Content Architect.';
comment on column public.generated_ideas.suggested_visual_style is 'Suggested visual approach for the script, provided by Content Architect.';
