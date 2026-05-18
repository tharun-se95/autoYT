import "server-only";

import { Buffer } from "node:buffer";

import { createServiceSupabase } from "@/lib/supabase/admin-client";
import { getLocalAssetsRoot, writeThumbnailToLocalRoot } from "@/lib/assets/local-asset-store";

let devWarnedMissingAssetsRoot = false;
let devWarnedUnresolvableAssetsRoot = false;
let devWarnedDiskWithoutSupabase = false;

function isLikelyUuid(value: string): boolean {
  return (
    value.length === 36 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

function hasLocalAssetsEnv(): boolean {
  return !!(
    process.env.UPGRADE_LIFE_LOCAL_ASSETS_ROOT?.trim() ||
    process.env.LOCAL_ASSETS_ROOT?.trim()
  );
}

/**
 * After Imagen returns base64, write bytes under `UPGRADE_LIFE_LOCAL_ASSETS_ROOT`
 * (e.g. a mounted Seagate SSD) and insert `thumbnail_generation_events` with
 * `local_relative_path` when Supabase service role is configured.
 *
 * If the root env is unset, returns `{}` (no-op). If disk write fails, throws.
 * DB insert failure is logged and still returns disk path when write succeeded.
 */
export async function persistThumbnailGenerationWithLocalFile(
  base64Image: string,
  mimeType: string,
  generatedIdeaId?: string | null
): Promise<{ localRelativePath?: string; dbEventId?: string }> {
  const meta: { localRelativePath?: string; dbEventId?: string } = {};

  if (!hasLocalAssetsEnv()) {
    if (process.env.NODE_ENV === "development" && !devWarnedMissingAssetsRoot) {
      devWarnedMissingAssetsRoot = true;
      console.warn(
        "[studio-db] Thumbnail not written to disk: set UPGRADE_LIFE_LOCAL_ASSETS_ROOT to an absolute folder " +
          "(see .env.example). Add NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY so thumbnails reload via API."
      );
    }
    return meta;
  }

  if (!getLocalAssetsRoot()) {
    if (process.env.NODE_ENV === "development" && !devWarnedUnresolvableAssetsRoot) {
      devWarnedUnresolvableAssetsRoot = true;
      console.warn(
        "[studio-db] UPGRADE_LIFE_LOCAL_ASSETS_ROOT is set but could not be resolved — create the folder or fix the path."
      );
    }
    return meta;
  }

  const buffer = Buffer.from(base64Image, "base64");
  const ext: ".png" | ".webp" = mimeType.includes("webp") ? ".webp" : ".png";
  const written = await writeThumbnailToLocalRoot(buffer, ext);
  meta.localRelativePath = written.relativePath;

  const supabase = createServiceSupabase();
  if (!supabase) {
    if (!devWarnedDiskWithoutSupabase) {
      devWarnedDiskWithoutSupabase = true;
      console.warn(
        "[studio-db] Thumbnail saved to disk but Supabase service role is not configured — " +
          "set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) so " +
          "`thumbnail_generation_events` gets a row and `/api/studio/thumbnails/by-id/...` can serve files."
      );
    }
    return meta;
  }

  const ideaId =
    generatedIdeaId && isLikelyUuid(generatedIdeaId)
      ? generatedIdeaId
      : null;

  const { data, error } = await supabase
    .from("thumbnail_generation_events")
    .insert({
      idea_id: ideaId,
      mime_type: mimeType.trim() || "image/png",
      local_relative_path: written.relativePath,
      file_size_bytes: written.fileSizeBytes,
      sha256_hex: written.sha256Hex,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[studio-db] thumbnail_generation_events:", error);
    return meta;
  }

  meta.dbEventId = data.id;
  return meta;
}
