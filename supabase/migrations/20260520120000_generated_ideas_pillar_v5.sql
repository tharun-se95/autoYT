-- Align generated_ideas.pillar with Channel DNA v5 psychology sub-themes (app + Gemini schema).

alter table public.generated_ideas
  drop constraint if exists generated_ideas_pillar_check;

-- Remap legacy v4 pillars (21 existing rows as of 2026-05-20).
update public.generated_ideas
set pillar = case pillar
  when 'modern_mind' then 'overthinking'
  when 'sorted_finance' then 'habit_architecture'
  when 'biological_reset' then 'habit_architecture'
  when 'relationship_engineering' then 'social_dynamics'
  else pillar
end
where pillar in (
  'modern_mind',
  'sorted_finance',
  'biological_reset',
  'relationship_engineering'
);

alter table public.generated_ideas
  add constraint generated_ideas_pillar_check check (
    pillar in (
      'overthinking',
      'emotional_armor',
      'identity_clarity',
      'social_dynamics',
      'habit_architecture'
    )
  );

comment on column public.generated_ideas.pillar is
  'Psychology sub-theme (v5): overthinking | emotional_armor | identity_clarity | social_dynamics | habit_architecture';
