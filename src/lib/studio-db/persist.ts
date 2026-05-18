import "server-only";

import type {
  ContentPillar,
  SavedStudioIdea,
  ThumbnailTextGlow,
  VideoIdea,
} from "@/lib/content-architect/types";
import type { Json } from "@/lib/supabase/database.types";
import { createServiceSupabase } from "@/lib/supabase/admin-client";
import type { ScriptDocument } from "@/lib/script-writer/types";

function isContentPillar(s: string): s is ContentPillar {
  return (
    s === "modern_mind" ||
    s === "sorted_finance" ||
    s === "biological_reset" ||
    s === "relationship_engineering"
  );
}

function isThumbnailTextGlow(s: string): s is ThumbnailTextGlow {
  return s === "cyan" || s === "amber";
}

function mapInsertedIdeaRow(row: {
  id: string;
  title: string;
  hook: string;
  thumbnail_visual_description: string;
  thumbnail_text_overlay: string;
  thumbnail_text_glow: string;
  pillar: string;
}): SavedStudioIdea | null {
  if (!isThumbnailTextGlow(row.thumbnail_text_glow)) return null;
  if (!isContentPillar(row.pillar)) return null;
  return {
    id: row.id,
    title: row.title,
    hook: row.hook,
    thumbnailVisualDescription: row.thumbnail_visual_description,
    thumbnailTextOverlay: row.thumbnail_text_overlay,
    thumbnailTextGlow: row.thumbnail_text_glow,
    pillar: row.pillar,
    thumbnailDbEventId: null,
    thumbnailLocalRelativePath: null,
  };
}

/** Persists one Content Architect batch (run + ideas). No-op if Supabase is not configured. */
export async function persistIdeaBatch(
  topics: string,
  ideaCount: number,
  ideas: VideoIdea[]
): Promise<{ runId: string; ideas: SavedStudioIdea[] } | null> {
  const supabase = createServiceSupabase();
  if (!supabase || ideas.length === 0) return null;

  const { data: run, error: runErr } = await supabase
    .from("idea_generation_runs")
    .insert({ topics, idea_count: ideaCount })
    .select("id")
    .single();

  if (runErr || !run) {
    console.error("[studio-db] idea_generation_runs:", runErr);
    return null;
  }

  const rows = ideas.map((i) => ({
    run_id: run.id,
    title: i.title,
    hook: i.hook,
    thumbnail_visual_description: i.thumbnailVisualDescription,
    thumbnail_text_overlay: i.thumbnailTextOverlay,
    thumbnail_text_glow: i.thumbnailTextGlow,
    pillar: i.pillar,
  }));

  const { data: inserted, error: ideasErr } = await supabase
    .from("generated_ideas")
    .insert(rows)
    .select(
      "id, title, hook, thumbnail_visual_description, thumbnail_text_overlay, thumbnail_text_glow, pillar"
    );

  if (ideasErr || !inserted?.length) {
    console.error("[studio-db] generated_ideas:", ideasErr);
    return null;
  }

  const saved: SavedStudioIdea[] = [];
  for (const row of inserted) {
    const mapped = mapInsertedIdeaRow(row);
    if (mapped) saved.push(mapped);
  }
  if (saved.length !== ideas.length) {
    console.error("[studio-db] generated_ideas: row mapping mismatch");
    return null;
  }

  return { runId: run.id, ideas: saved };
}

/** Persists a Lead Scriptwriter document. No-op if Supabase is not configured. */
export async function persistScriptDocument(
  episodeBrief: string,
  script: ScriptDocument
): Promise<{ id: string } | null> {
  const supabase = createServiceSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("script_documents")
    .insert({
      episode_brief: episodeBrief.trim(),
      working_title: script.workingTitle.trim(),
      document: script as unknown as Json,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[studio-db] script_documents:", error);
    return null;
  }

  return { id: data.id };
}
