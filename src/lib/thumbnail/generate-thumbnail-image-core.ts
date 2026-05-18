import type { ThumbnailImageSpec } from "@/lib/content-architect/types";
import { buildThumbnailImagePrompt } from "@/lib/thumbnail/build-image-prompt";
import { generateImagenSinglePng } from "@/lib/thumbnail/imagen-single-png";
import { persistThumbnailGenerationWithLocalFile } from "@/lib/studio-db/persist-thumbnail-local";

export type GenerateThumbnailImageSuccess = {
  ok: true;
  mimeType: string;
  base64: string;
  localRelativePath?: string;
  dbEventId?: string;
};

export type GenerateThumbnailImageFailure = {
  ok: false;
  error: string;
};

export type GenerateThumbnailImageResult =
  | GenerateThumbnailImageSuccess
  | GenerateThumbnailImageFailure;

/**
 * Imagen thumbnail generation + optional disk + `thumbnail_generation_events` row.
 * Shared by the thumbnail server action and Content Architect batch flow.
 */
export async function generateThumbnailImageCore(
  spec: ThumbnailImageSpec,
  persistOptions?: { generatedIdeaId?: string | null }
): Promise<GenerateThumbnailImageResult> {
  const visual = spec.visualDescription?.trim();
  const overlay = spec.textOverlay?.trim();
  if (!visual || visual.length < 40) {
    return {
      ok: false,
      error: "Thumbnail visual description is too short to generate an image.",
    };
  }
  if (!overlay || overlay.length < 2) {
    return {
      ok: false,
      error: "Thumbnail text overlay is missing.",
    };
  }

  const prompt = buildThumbnailImagePrompt(spec);
  const gen = await generateImagenSinglePng(prompt);
  if (!gen.ok) {
    return { ok: false, error: gen.error };
  }

  const { base64: bytes, mimeType } = gen;
  let localRelativePath: string | undefined;
  let dbEventId: string | undefined;
  try {
    const persisted = await persistThumbnailGenerationWithLocalFile(
      bytes,
      mimeType,
      persistOptions?.generatedIdeaId
    );
    localRelativePath = persisted.localRelativePath;
    dbEventId = persisted.dbEventId;
  } catch (e) {
    console.error("[thumbnail-image] local / DB persist failed:", e);
  }

  return {
    ok: true,
    base64: bytes,
    mimeType,
    ...(localRelativePath ? { localRelativePath } : {}),
    ...(dbEventId ? { dbEventId } : {}),
  };
}
