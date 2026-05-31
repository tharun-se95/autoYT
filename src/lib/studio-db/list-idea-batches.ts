import "server-only";

import type {
  ContentPillar,
  ContentTone,
  ThumbnailTextGlow,
  VideoIdea,
  VisualStylePreference,
} from "@/lib/content-architect/types";
import { createServiceSupabase } from "@/lib/supabase/admin-client";
import type { StudioIdeaBatchListItem, StudioIdeaListRow } from "@/lib/studio/studio-idea-batch";
import { topicsPreview } from "@/lib/studio/topics-preview";

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

function isContentTone(s: string): s is ContentTone {
  return (
    s === "analytical" ||
    s === "stoic" ||
    s === "provocative" ||
    s === "calm"
  );
}

function isVisualStylePreference(s: string): s is VisualStylePreference {
  return s === "metaphoric" || s === "narrative" || s === "typography-focused";
}

function mapIdeaRow(row: {
  id: string;
  title: string;
  hook: string;
  thumbnail_visual_description: string;
  thumbnail_text_overlay: string;
  thumbnail_text_glow: string;
  pillar: string;
  suggested_tone: string;
  suggested_visual_style: string;
}): VideoIdea | null {
  if (!isThumbnailTextGlow(row.thumbnail_text_glow)) return null;
  if (!isContentPillar(row.pillar)) return null;
  if (!isContentTone(row.suggested_tone)) return null;
  if (!isVisualStylePreference(row.suggested_visual_style)) return null;
  return {
    title: row.title,
    hook: row.hook,
    thumbnailVisualDescription: row.thumbnail_visual_description,
    thumbnailTextOverlay: row.thumbnail_text_overlay,
    thumbnailTextGlow: row.thumbnail_text_glow,
    pillar: row.pillar,
    suggestedTone: row.suggested_tone,
    suggestedVisualStyle: row.suggested_visual_style,
  };
}

/** All idea generation runs with ideas and latest thumbnail refs (when present). */
export async function listIdeaBatchesFromDb(): Promise<StudioIdeaBatchListItem[]> {
  const supabase = createServiceSupabase();
  if (!supabase) return [];

  const { data: runs, error: runErr } = await supabase
    .from("idea_generation_runs")
    .select("id, topics, idea_count, created_at")
    .order("created_at", { ascending: false });

  if (runErr || !runs?.length) {
    if (runErr) console.error("[studio-db] list idea_generation_runs:", runErr);
    return [];
  }

  const runIds = runs.map((r) => r.id);
  const { data: ideaRows, error: ideasErr } = await supabase
    .from("generated_ideas")
    .select(
      "id, run_id, title, hook, thumbnail_visual_description, thumbnail_text_overlay, thumbnail_text_glow, pillar, suggested_tone, suggested_visual_style, created_at"
    )
    .in("run_id", runIds);

  if (ideasErr || !ideaRows) {
    if (ideasErr) console.error("[studio-db] list generated_ideas:", ideasErr);
    return [];
  }

  const ideaIds = ideaRows.map((r) => r.id);
  const thumbByIdea = new Map<
    string,
    { thumbnailDbEventId: string; thumbnailLocalRelativePath: string | null }
  >();

  if (ideaIds.length > 0) {
    const { data: events, error: evErr } = await supabase
      .from("thumbnail_generation_events")
      .select("id, idea_id, local_relative_path, created_at")
      .in("idea_id", ideaIds)
      .order("created_at", { ascending: false });

    if (evErr) {
      console.error("[studio-db] list thumbnail_generation_events:", evErr);
    } else if (events) {
      for (const ev of events) {
        const iid = ev.idea_id;
        if (!iid || thumbByIdea.has(iid)) continue;
        thumbByIdea.set(iid, {
          thumbnailDbEventId: ev.id,
          thumbnailLocalRelativePath: ev.local_relative_path,
        });
      }
    }
  }

  const ideasByRun = new Map<string, typeof ideaRows>();
  for (const row of ideaRows) {
    const list = ideasByRun.get(row.run_id) ?? [];
    list.push(row);
    ideasByRun.set(row.run_id, list);
  }

  const batches: StudioIdeaBatchListItem[] = [];
  for (const run of runs) {
    const rows = ideasByRun.get(run.id) ?? [];
    rows.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const ideas: StudioIdeaListRow[] = [];
    for (const row of rows) {
      const idea = mapIdeaRow(row);
      if (!idea) continue;
      const thumb = thumbByIdea.get(row.id);
      ideas.push({
        generatedIdeaId: row.id,
        idea,
        thumbnailDbEventId: thumb?.thumbnailDbEventId ?? null,
        thumbnailLocalRelativePath: thumb?.thumbnailLocalRelativePath ?? null,
      });
    }

    batches.push({
      runId: run.id,
      savedAt: run.created_at,
      topicsPreview: topicsPreview(run.topics ?? ""),
      topics: run.topics ?? "",
      ideaCount: ideas.length,
      ideas,
    });
  }

  return batches;
}
