import "server-only";

import type {
  ContentPillar,
  ContentTone,
  SavedStudioIdea,
  ThumbnailTextGlow,
  VideoIdea,
  VisualStylePreference,
} from "@/lib/content-architect/types";
import type { ScriptDocument } from "@/lib/script-writer/types";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createServiceSupabase } from "@/lib/supabase/admin-client";

type GeneratedIdeaInsert = Database["public"]["Tables"]["generated_ideas"]["Insert"];
type GeneratedIdeaRow = Database["public"]["Tables"]["generated_ideas"]["Row"];
type GeneratedIdeaSelectedRow = Pick<
  GeneratedIdeaRow,
  | "id"
  | "title"
  | "hook"
  | "thumbnail_visual_description"
  | "thumbnail_text_overlay"
  | "thumbnail_text_glow"
  | "pillar"
  | "suggested_tone"
  | "suggested_visual_style"
>;

function isContentPillar(s: string): s is ContentPillar {
  return (
    s === "overthinking" ||
    s === "emotional_armor" ||
    s === "identity_clarity" ||
    s === "social_dynamics" ||
    s === "habit_architecture"
  );
}

function isThumbnailTextGlow(s: string): s is ThumbnailTextGlow {
  return s === "cyan" || s === "amber";
}

const TONE_VALUES: ContentTone[] = ["analytical", "stoic", "provocative", "calm"];
const VISUAL_STYLE_VALUES: VisualStylePreference[] = ["metaphoric", "narrative", "typography-focused"];

function isContentTone(s: string): s is ContentTone {
  return TONE_VALUES.includes(s as ContentTone);
}

function isVisualStylePreference(s: string): s is VisualStylePreference {
  return VISUAL_STYLE_VALUES.includes(s as VisualStylePreference);
}

function toGeneratedIdeaInsert(runId: string, idea: VideoIdea): GeneratedIdeaInsert {
  return {
    run_id: runId,
    title: idea.title,
    hook: idea.hook,
    thumbnail_visual_description: idea.thumbnailVisualDescription,
    thumbnail_text_overlay: idea.thumbnailTextOverlay,
    thumbnail_text_glow: idea.thumbnailTextGlow,
    pillar: idea.pillar,
    suggested_tone: idea.suggestedTone,
    suggested_visual_style: idea.suggestedVisualStyle,
  };
}

function mapInsertedIdeaRow(row: GeneratedIdeaSelectedRow): SavedStudioIdea | null {
  if (!isThumbnailTextGlow(row.thumbnail_text_glow)) return null;
  if (!isContentPillar(row.pillar)) return null;
  if (!isContentTone(row.suggested_tone)) return null;
  if (!isVisualStylePreference(row.suggested_visual_style)) return null;

  return {
    id: row.id,
    title: row.title,
    hook: row.hook,
    thumbnailVisualDescription: row.thumbnail_visual_description,
    thumbnailTextOverlay: row.thumbnail_text_overlay,
    thumbnailTextGlow: row.thumbnail_text_glow,
    pillar: row.pillar,
    suggestedTone: row.suggested_tone as ContentTone,
    suggestedVisualStyle: row.suggested_visual_style as VisualStylePreference,
    thumbnailDbEventId: null,
    thumbnailLocalRelativePath: null,
  };
}

export type PersistIdeaRunResult = 
  | { ok: true; runId: string }
  | { ok: false; reason: "not_configured" | "insert_failed"; detail?: string };

/** Persists one idea_generation_runs row. */
export async function persistIdeaRun(
  topics: string,
  ideaCount: number,
): Promise<PersistIdeaRunResult> {
  const supabase = createServiceSupabase();
  if (!supabase) return { ok: false, reason: "not_configured" };

  const { data: run, error: runErr } = await supabase
    .from("idea_generation_runs")
    .insert({ topics, idea_count: ideaCount })
    .select("id")
    .single();

  if (runErr || !run) {
    console.error("[studio-db] idea_generation_runs:", runErr);
    return {
      ok: false,
      reason: "insert_failed",
      detail: runErr?.message,
    };
  }
  return { ok: true, runId: run.id };
}

export type PersistIdeaBatchResult =
  | { ok: true; ideas: SavedStudioIdea[] }
  | { ok: false; reason: "not_configured" | "insert_failed"; detail?: string };

/** Persists a batch of generated_ideas for a given runId. */
export async function persistIdeaBatch(
  runId: string, // REQUIRED runId
  ideas: VideoIdea[],
): Promise<PersistIdeaBatchResult> {
  const supabase = createServiceSupabase();
  if (!supabase || ideas.length === 0) {
    return { ok: false, reason: "not_configured" };
  }

  const rows: GeneratedIdeaInsert[] = ideas.map((idea) =>
    toGeneratedIdeaInsert(runId, idea),
  );

  const { data: inserted, error: ideasErr } = await supabase
    .from("generated_ideas")
    .insert(rows)
    .select(
      "id, title, hook, thumbnail_visual_description, thumbnail_text_overlay, thumbnail_text_glow, pillar, suggested_tone, suggested_visual_style",
    );

  if (ideasErr || !inserted?.length) {
    console.error("[studio-db] generated_ideas:", ideasErr);
    // NOTE: We don't delete the run here; the UI should show an empty run if idea insert fails.
    return {
      ok: false,
      reason: "insert_failed",
      detail: ideasErr?.message,
    };
  }

  const saved: SavedStudioIdea[] = [];
  for (const row of inserted) {
    const mapped = mapInsertedIdeaRow(row);
    if (mapped) saved.push(mapped);
  }
  if (saved.length !== ideas.length) {
    console.error("[studio-db] generated_ideas: row mapping mismatch");
    return {
      ok: false,
      reason: "insert_failed",
      detail: "pillar or thumbnail_text_glow value mismatch after insert",
    };
  }

  return { ok: true, ideas: saved };
}

/** Persists a Lead Scriptwriter document. No-op if Supabase is not configured. */
export async function persistScriptDocument(
  episodeBrief: string,
  script: ScriptDocument,
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
