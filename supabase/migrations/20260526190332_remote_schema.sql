drop extension if exists "pg_net";

create sequence "public"."agent_logs_id_seq";

revoke delete on table "public"."narration_audio_segments" from "anon";

revoke insert on table "public"."narration_audio_segments" from "anon";

revoke references on table "public"."narration_audio_segments" from "anon";

revoke select on table "public"."narration_audio_segments" from "anon";

revoke trigger on table "public"."narration_audio_segments" from "anon";

revoke truncate on table "public"."narration_audio_segments" from "anon";

revoke update on table "public"."narration_audio_segments" from "anon";

revoke delete on table "public"."narration_audio_segments" from "authenticated";

revoke insert on table "public"."narration_audio_segments" from "authenticated";

revoke references on table "public"."narration_audio_segments" from "authenticated";

revoke select on table "public"."narration_audio_segments" from "authenticated";

revoke trigger on table "public"."narration_audio_segments" from "authenticated";

revoke truncate on table "public"."narration_audio_segments" from "authenticated";

revoke update on table "public"."narration_audio_segments" from "authenticated";

revoke delete on table "public"."narration_audio_segments" from "service_role";

revoke insert on table "public"."narration_audio_segments" from "service_role";

revoke references on table "public"."narration_audio_segments" from "service_role";

revoke select on table "public"."narration_audio_segments" from "service_role";

revoke trigger on table "public"."narration_audio_segments" from "service_role";

revoke truncate on table "public"."narration_audio_segments" from "service_role";

revoke update on table "public"."narration_audio_segments" from "service_role";

revoke delete on table "public"."vis_still_generation_events" from "anon";

revoke insert on table "public"."vis_still_generation_events" from "anon";

revoke references on table "public"."vis_still_generation_events" from "anon";

revoke select on table "public"."vis_still_generation_events" from "anon";

revoke trigger on table "public"."vis_still_generation_events" from "anon";

revoke truncate on table "public"."vis_still_generation_events" from "anon";

revoke update on table "public"."vis_still_generation_events" from "anon";

revoke delete on table "public"."vis_still_generation_events" from "authenticated";

revoke insert on table "public"."vis_still_generation_events" from "authenticated";

revoke references on table "public"."vis_still_generation_events" from "authenticated";

revoke select on table "public"."vis_still_generation_events" from "authenticated";

revoke trigger on table "public"."vis_still_generation_events" from "authenticated";

revoke truncate on table "public"."vis_still_generation_events" from "authenticated";

revoke update on table "public"."vis_still_generation_events" from "authenticated";

revoke delete on table "public"."vis_still_generation_events" from "service_role";

revoke insert on table "public"."vis_still_generation_events" from "service_role";

revoke references on table "public"."vis_still_generation_events" from "service_role";

revoke select on table "public"."vis_still_generation_events" from "service_role";

revoke trigger on table "public"."vis_still_generation_events" from "service_role";

revoke truncate on table "public"."vis_still_generation_events" from "service_role";

revoke update on table "public"."vis_still_generation_events" from "service_role";

alter table "public"."generated_ideas" drop constraint "generated_ideas_suggested_tone_check";

alter table "public"."generated_ideas" drop constraint "generated_ideas_suggested_visual_style_check";

alter table "public"."narration_audio_segments" drop constraint "narration_audio_segments_act_id_check";

alter table "public"."narration_audio_segments" drop constraint "narration_audio_segments_block_index_check";

alter table "public"."narration_audio_segments" drop constraint "narration_audio_segments_video_id_act_id_block_index_key";

alter table "public"."vis_still_generation_events" drop constraint "vis_still_generation_events_act_id_check";

alter table "public"."vis_still_generation_events" drop constraint "vis_still_generation_events_block_index_check";

alter table "public"."vis_still_generation_events" drop constraint "vis_still_generation_events_video_id_act_id_block_index_key";

alter table "public"."narration_audio_segments" drop constraint "narration_audio_segments_pkey";

alter table "public"."vis_still_generation_events" drop constraint "vis_still_generation_events_pkey";

drop index if exists "public"."narration_audio_segments_pkey";

drop index if exists "public"."narration_audio_segments_video_id_act_id_block_index_key";

drop index if exists "public"."narration_audio_segments_video_id_idx";

drop index if exists "public"."vis_still_generation_events_pkey";

drop index if exists "public"."vis_still_generation_events_video_id_act_id_block_index_key";

drop index if exists "public"."vis_still_generation_events_video_id_idx";

drop table "public"."narration_audio_segments";

drop table "public"."vis_still_generation_events";


  create table "public"."agent_logs" (
    "id" bigint not null default nextval('public.agent_logs_id_seq'::regclass),
    "project_id" uuid,
    "agent" text not null,
    "action" text not null,
    "payload" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."agent_logs" enable row level security;


  create table "public"."assets" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "type" text not null,
    "url" text not null,
    "description" text,
    "project_id" uuid,
    "source" text,
    "metadata" jsonb default '{}'::jsonb,
    "tags" text[] default '{}'::text[],
    "storage_path" text
      );


alter table "public"."assets" enable row level security;


  create table "public"."channel_suggestions" (
    "id" uuid not null default gen_random_uuid(),
    "channel_id" uuid,
    "title" text not null,
    "reasoning" text,
    "hook" text,
    "status" text default 'SUGGESTED'::text,
    "created_at" timestamp with time zone default now(),
    "thumbnail_blueprint" jsonb default '{}'::jsonb,
    "project_id" uuid
      );


alter table "public"."channel_suggestions" enable row level security;


  create table "public"."channels" (
    "id" text not null,
    "name" text not null,
    "handle" text,
    "banner_image_url" text,
    "default_mode" text not null,
    "template_family" text not null,
    "visual_style_notes" text not null default ''::text,
    "palette_hex" jsonb not null default '[]'::jsonb,
    "style_keywords" jsonb not null default '[]'::jsonb,
    "reference_urls" jsonb not null default '[]'::jsonb,
    "visual_donts" text,
    "generation_brief" text,
    "generation_profile" jsonb,
    "voice_id" text not null,
    "voice_speed" double precision not null default 1,
    "music_preset" text not null,
    "sfx_level" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "characters" jsonb not null default '[]'::jsonb
      );


alter table "public"."channels" enable row level security;


  create table "public"."drafts" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid,
    "created_at" timestamp with time zone default now(),
    "prompt_context" text default ''::text,
    "iteration" integer not null,
    "content" text default ''::text,
    "critic_score" integer,
    "critic_notes" text,
    "production_bundle" jsonb,
    "niche_data" text,
    "visual_cues" text,
    "yt_metadata" jsonb,
    "hydration_stage" text,
    "suggestions" jsonb,
    "is_approved" boolean default false,
    "messages" jsonb default '[]'::jsonb,
    "status" text default 'PROCESSING'::text
      );


alter table "public"."drafts" enable row level security;


  create table "public"."projects" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "name" text not null,
    "original_idea" text not null,
    "content_mode" text default 'FILM'::text,
    "channel_id" uuid,
    "status" text default 'APPROVED'::text,
    "niche_opportunities" jsonb default '[]'::jsonb,
    "thumbnail_url" text
      );


alter table "public"."projects" enable row level security;


  create table "public"."videos" (
    "id" text not null,
    "channel_id" text not null,
    "title" text not null,
    "mode" text not null,
    "status" text not null,
    "thumbnail_url" text,
    "duration_label" text,
    "pipeline_unlocked" text not null default 'script'::text,
    "sections" jsonb not null default '[]'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."videos" enable row level security;

alter table "public"."generated_ideas" drop column "suggested_tone";

alter table "public"."generated_ideas" drop column "suggested_visual_style";

alter sequence "public"."agent_logs_id_seq" owned by "public"."agent_logs"."id";

CREATE INDEX agent_logs_agent_idx ON public.agent_logs USING btree (agent, created_at DESC);

CREATE UNIQUE INDEX agent_logs_pkey ON public.agent_logs USING btree (id);

CREATE INDEX agent_logs_project_time_idx ON public.agent_logs USING btree (project_id, created_at DESC);

CREATE INDEX assets_description_search_idx ON public.assets USING gin (to_tsvector('english'::regconfig, COALESCE(description, ''::text)));

CREATE UNIQUE INDEX assets_pkey ON public.assets USING btree (id);

CREATE UNIQUE INDEX channel_suggestions_pkey ON public.channel_suggestions USING btree (id);

CREATE UNIQUE INDEX channels_pkey ON public.channels USING btree (id);

CREATE UNIQUE INDEX drafts_pkey ON public.drafts USING btree (id);

CREATE UNIQUE INDEX drafts_project_iteration_unique ON public.drafts USING btree (project_id, iteration);

CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id);

CREATE UNIQUE INDEX unique_project_iteration ON public.drafts USING btree (project_id, iteration);

CREATE INDEX videos_channel_id_idx ON public.videos USING btree (channel_id);

CREATE UNIQUE INDEX videos_pkey ON public.videos USING btree (id);

alter table "public"."agent_logs" add constraint "agent_logs_pkey" PRIMARY KEY using index "agent_logs_pkey";

alter table "public"."assets" add constraint "assets_pkey" PRIMARY KEY using index "assets_pkey";

alter table "public"."channel_suggestions" add constraint "channel_suggestions_pkey" PRIMARY KEY using index "channel_suggestions_pkey";

alter table "public"."channels" add constraint "channels_pkey" PRIMARY KEY using index "channels_pkey";

alter table "public"."drafts" add constraint "drafts_pkey" PRIMARY KEY using index "drafts_pkey";

alter table "public"."projects" add constraint "projects_pkey" PRIMARY KEY using index "projects_pkey";

alter table "public"."videos" add constraint "videos_pkey" PRIMARY KEY using index "videos_pkey";

alter table "public"."agent_logs" add constraint "agent_logs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."agent_logs" validate constraint "agent_logs_project_id_fkey";

alter table "public"."assets" add constraint "assets_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."assets" validate constraint "assets_project_id_fkey";

alter table "public"."channel_suggestions" add constraint "channel_suggestions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL not valid;

alter table "public"."channel_suggestions" validate constraint "channel_suggestions_project_id_fkey";

alter table "public"."channels" add constraint "channels_default_mode_check" CHECK ((default_mode = ANY (ARRAY['short'::text, 'long'::text]))) not valid;

alter table "public"."channels" validate constraint "channels_default_mode_check";

alter table "public"."drafts" add constraint "drafts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."drafts" validate constraint "drafts_project_id_fkey";

alter table "public"."drafts" add constraint "drafts_project_iteration_unique" UNIQUE using index "drafts_project_iteration_unique";

alter table "public"."drafts" add constraint "unique_project_iteration" UNIQUE using index "unique_project_iteration";

alter table "public"."videos" add constraint "videos_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE not valid;

alter table "public"."videos" validate constraint "videos_channel_id_fkey";

alter table "public"."videos" add constraint "videos_mode_check" CHECK ((mode = ANY (ARRAY['short'::text, 'long'::text]))) not valid;

alter table "public"."videos" validate constraint "videos_mode_check";

alter table "public"."videos" add constraint "videos_pipeline_unlocked_check" CHECK ((pipeline_unlocked = ANY (ARRAY['script'::text, 'audio'::text, 'visuals'::text, 'export'::text]))) not valid;

alter table "public"."videos" validate constraint "videos_pipeline_unlocked_check";

alter table "public"."videos" add constraint "videos_status_check" CHECK ((status = ANY (ARRAY['scripting'::text, 'audio'::text, 'visuals'::text, 'export'::text, 'done'::text]))) not valid;

alter table "public"."videos" validate constraint "videos_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

grant delete on table "public"."agent_logs" to "anon";

grant insert on table "public"."agent_logs" to "anon";

grant references on table "public"."agent_logs" to "anon";

grant select on table "public"."agent_logs" to "anon";

grant trigger on table "public"."agent_logs" to "anon";

grant truncate on table "public"."agent_logs" to "anon";

grant update on table "public"."agent_logs" to "anon";

grant delete on table "public"."agent_logs" to "authenticated";

grant insert on table "public"."agent_logs" to "authenticated";

grant references on table "public"."agent_logs" to "authenticated";

grant select on table "public"."agent_logs" to "authenticated";

grant trigger on table "public"."agent_logs" to "authenticated";

grant truncate on table "public"."agent_logs" to "authenticated";

grant update on table "public"."agent_logs" to "authenticated";

grant delete on table "public"."agent_logs" to "service_role";

grant insert on table "public"."agent_logs" to "service_role";

grant references on table "public"."agent_logs" to "service_role";

grant select on table "public"."agent_logs" to "service_role";

grant trigger on table "public"."agent_logs" to "service_role";

grant truncate on table "public"."agent_logs" to "service_role";

grant update on table "public"."agent_logs" to "service_role";

grant delete on table "public"."assets" to "anon";

grant insert on table "public"."assets" to "anon";

grant references on table "public"."assets" to "anon";

grant select on table "public"."assets" to "anon";

grant trigger on table "public"."assets" to "anon";

grant truncate on table "public"."assets" to "anon";

grant update on table "public"."assets" to "anon";

grant delete on table "public"."assets" to "authenticated";

grant insert on table "public"."assets" to "authenticated";

grant references on table "public"."assets" to "authenticated";

grant select on table "public"."assets" to "authenticated";

grant trigger on table "public"."assets" to "authenticated";

grant truncate on table "public"."assets" to "authenticated";

grant update on table "public"."assets" to "authenticated";

grant delete on table "public"."assets" to "service_role";

grant insert on table "public"."assets" to "service_role";

grant references on table "public"."assets" to "service_role";

grant select on table "public"."assets" to "service_role";

grant trigger on table "public"."assets" to "service_role";

grant truncate on table "public"."assets" to "service_role";

grant update on table "public"."assets" to "service_role";

grant delete on table "public"."channel_suggestions" to "anon";

grant insert on table "public"."channel_suggestions" to "anon";

grant references on table "public"."channel_suggestions" to "anon";

grant select on table "public"."channel_suggestions" to "anon";

grant trigger on table "public"."channel_suggestions" to "anon";

grant truncate on table "public"."channel_suggestions" to "anon";

grant update on table "public"."channel_suggestions" to "anon";

grant delete on table "public"."channel_suggestions" to "authenticated";

grant insert on table "public"."channel_suggestions" to "authenticated";

grant references on table "public"."channel_suggestions" to "authenticated";

grant select on table "public"."channel_suggestions" to "authenticated";

grant trigger on table "public"."channel_suggestions" to "authenticated";

grant truncate on table "public"."channel_suggestions" to "authenticated";

grant update on table "public"."channel_suggestions" to "authenticated";

grant delete on table "public"."channel_suggestions" to "service_role";

grant insert on table "public"."channel_suggestions" to "service_role";

grant references on table "public"."channel_suggestions" to "service_role";

grant select on table "public"."channel_suggestions" to "service_role";

grant trigger on table "public"."channel_suggestions" to "service_role";

grant truncate on table "public"."channel_suggestions" to "service_role";

grant update on table "public"."channel_suggestions" to "service_role";

grant delete on table "public"."channels" to "anon";

grant insert on table "public"."channels" to "anon";

grant references on table "public"."channels" to "anon";

grant select on table "public"."channels" to "anon";

grant trigger on table "public"."channels" to "anon";

grant truncate on table "public"."channels" to "anon";

grant update on table "public"."channels" to "anon";

grant delete on table "public"."channels" to "authenticated";

grant insert on table "public"."channels" to "authenticated";

grant references on table "public"."channels" to "authenticated";

grant select on table "public"."channels" to "authenticated";

grant trigger on table "public"."channels" to "authenticated";

grant truncate on table "public"."channels" to "authenticated";

grant update on table "public"."channels" to "authenticated";

grant delete on table "public"."channels" to "service_role";

grant insert on table "public"."channels" to "service_role";

grant references on table "public"."channels" to "service_role";

grant select on table "public"."channels" to "service_role";

grant trigger on table "public"."channels" to "service_role";

grant truncate on table "public"."channels" to "service_role";

grant update on table "public"."channels" to "service_role";

grant delete on table "public"."drafts" to "anon";

grant insert on table "public"."drafts" to "anon";

grant references on table "public"."drafts" to "anon";

grant select on table "public"."drafts" to "anon";

grant trigger on table "public"."drafts" to "anon";

grant truncate on table "public"."drafts" to "anon";

grant update on table "public"."drafts" to "anon";

grant delete on table "public"."drafts" to "authenticated";

grant insert on table "public"."drafts" to "authenticated";

grant references on table "public"."drafts" to "authenticated";

grant select on table "public"."drafts" to "authenticated";

grant trigger on table "public"."drafts" to "authenticated";

grant truncate on table "public"."drafts" to "authenticated";

grant update on table "public"."drafts" to "authenticated";

grant delete on table "public"."drafts" to "service_role";

grant insert on table "public"."drafts" to "service_role";

grant references on table "public"."drafts" to "service_role";

grant select on table "public"."drafts" to "service_role";

grant trigger on table "public"."drafts" to "service_role";

grant truncate on table "public"."drafts" to "service_role";

grant update on table "public"."drafts" to "service_role";

grant delete on table "public"."projects" to "anon";

grant insert on table "public"."projects" to "anon";

grant references on table "public"."projects" to "anon";

grant select on table "public"."projects" to "anon";

grant trigger on table "public"."projects" to "anon";

grant truncate on table "public"."projects" to "anon";

grant update on table "public"."projects" to "anon";

grant delete on table "public"."projects" to "authenticated";

grant insert on table "public"."projects" to "authenticated";

grant references on table "public"."projects" to "authenticated";

grant select on table "public"."projects" to "authenticated";

grant trigger on table "public"."projects" to "authenticated";

grant truncate on table "public"."projects" to "authenticated";

grant update on table "public"."projects" to "authenticated";

grant delete on table "public"."projects" to "service_role";

grant insert on table "public"."projects" to "service_role";

grant references on table "public"."projects" to "service_role";

grant select on table "public"."projects" to "service_role";

grant trigger on table "public"."projects" to "service_role";

grant truncate on table "public"."projects" to "service_role";

grant update on table "public"."projects" to "service_role";

grant delete on table "public"."videos" to "anon";

grant insert on table "public"."videos" to "anon";

grant references on table "public"."videos" to "anon";

grant select on table "public"."videos" to "anon";

grant trigger on table "public"."videos" to "anon";

grant truncate on table "public"."videos" to "anon";

grant update on table "public"."videos" to "anon";

grant delete on table "public"."videos" to "authenticated";

grant insert on table "public"."videos" to "authenticated";

grant references on table "public"."videos" to "authenticated";

grant select on table "public"."videos" to "authenticated";

grant trigger on table "public"."videos" to "authenticated";

grant truncate on table "public"."videos" to "authenticated";

grant update on table "public"."videos" to "authenticated";

grant delete on table "public"."videos" to "service_role";

grant insert on table "public"."videos" to "service_role";

grant references on table "public"."videos" to "service_role";

grant select on table "public"."videos" to "service_role";

grant trigger on table "public"."videos" to "service_role";

grant truncate on table "public"."videos" to "service_role";

grant update on table "public"."videos" to "service_role";


  create policy "deny all to anon and authenticated"
  on "public"."agent_logs"
  as permissive
  for all
  to anon, authenticated
using (false)
with check (false);



  create policy "deny all to anon and authenticated"
  on "public"."assets"
  as permissive
  for all
  to anon, authenticated
using (false)
with check (false);



  create policy "deny all to anon and authenticated"
  on "public"."channel_suggestions"
  as permissive
  for all
  to anon, authenticated
using (false)
with check (false);



  create policy "channels_read"
  on "public"."channels"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "deny all to anon and authenticated"
  on "public"."drafts"
  as permissive
  for all
  to anon, authenticated
using (false)
with check (false);



  create policy "deny all to anon and authenticated"
  on "public"."projects"
  as permissive
  for all
  to anon, authenticated
using (false)
with check (false);



  create policy "videos_read"
  on "public"."videos"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Public read on production_assets"
  on "storage"."objects"
  as permissive
  for select
  to anon, authenticated
using ((bucket_id = 'production_assets'::text));



  create policy "Public read on production_audio"
  on "storage"."objects"
  as permissive
  for select
  to anon, authenticated
using ((bucket_id = 'production_audio'::text));



  create policy "Public read on thumbnails"
  on "storage"."objects"
  as permissive
  for select
  to anon, authenticated
using ((bucket_id = 'thumbnails'::text));



