"use server";

import "server-only";

import type { ThumbnailImageSpec } from "@/lib/content-architect/types";
import {
  generateThumbnailImageCore,
  type GenerateThumbnailImageResult,
} from "@/lib/thumbnail/generate-thumbnail-image-core";

/**
 * Generates one 16:9 PNG from structured thumbnail fields using Imagen (Gemini API).
 * See `generateThumbnailImageCore` for implementation details.
 *
 * Types live on `@/lib/thumbnail/generate-thumbnail-image-core` — avoid re-exporting
 * them from this `"use server"` module (Turbopack can otherwise emit invalid runtime refs).
 */
export async function generateThumbnailImage(
  spec: ThumbnailImageSpec,
  persistOptions?: { generatedIdeaId?: string | null }
): Promise<GenerateThumbnailImageResult> {
  return generateThumbnailImageCore(spec, persistOptions);
}
