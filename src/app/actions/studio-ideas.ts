"use server";

import { listIdeaBatchesFromDb } from "@/lib/studio-db/list-idea-batches";
import { generateThumbnailImageCore } from "@/lib/thumbnail/generate-thumbnail-image-core";
import { createServiceSupabase } from "@/lib/supabase/admin-client";
import type { StudioIdeaBatchListItem } from "@/lib/studio/studio-idea-batch";

export type { StudioIdeaBatchListItem } from "@/lib/studio/studio-idea-batch";

/** Loads all Content Architect runs and ideas (Upcoming tab). */
export async function listStudioIdeaBatches(): Promise<StudioIdeaBatchListItem[]> {
  try {
    const batches = await listIdeaBatchesFromDb();
    return Array.isArray(batches) ? batches : [];
  } catch (err) {
    console.error("[studio-ideas] listStudioIdeaBatches:", err);
    return [];
  }
}

/** Generate missing Imagen thumbnails for recent ideas (no event row yet). */
export async function backfillMissingIdeaThumbnails(
  limit = 6
): Promise<{ processed: number; ok: number; fail: number }> {
  const supabase = createServiceSupabase();
  if (!supabase) {
    return { processed: 0, ok: 0, fail: 0 };
  }

  const cap = Math.min(24, Math.max(1, Math.floor(limit) || 6));

  const { data: ideas, error: ideasErr } = await supabase
    .from("generated_ideas")
    .select(
      "id, thumbnail_visual_description, thumbnail_text_overlay, thumbnail_text_glow, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (ideasErr || !ideas?.length) {
    return { processed: 0, ok: 0, fail: 0 };
  }

  const { data: events } = await supabase
    .from("thumbnail_generation_events")
    .select("idea_id")
    .not("idea_id", "is", null);

  const hasThumb = new Set(
    (events ?? []).map((e) => e.idea_id).filter((id): id is string => !!id)
  );
  const missing = ideas.filter((i) => !hasThumb.has(i.id)).slice(0, cap);

  let ok = 0;
  let fail = 0;

  for (const row of missing) {
    const glow = row.thumbnail_text_glow;
    if (glow !== "cyan" && glow !== "amber") {
      fail += 1;
      continue;
    }
    const out = await generateThumbnailImageCore(
      {
        visualDescription: row.thumbnail_visual_description,
        textOverlay: row.thumbnail_text_overlay,
        textGlow: glow,
      },
      { generatedIdeaId: row.id }
    );
    if (out.ok && (out.dbEventId || out.localRelativePath)) ok += 1;
    else fail += 1;
  }

  return { processed: missing.length, ok, fail };
}
