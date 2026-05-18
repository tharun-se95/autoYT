import "server-only";

import { createHash, randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * Absolute root for on-disk generated assets (e.g. Seagate SSD mounted at
 * `/Volumes/Seagate/upgrade-life-assets`). Set in `.env.local` as
 * `UPGRADE_LIFE_LOCAL_ASSETS_ROOT`.
 */
export function getLocalAssetsRoot(): string | null {
  const raw =
    process.env.UPGRADE_LIFE_LOCAL_ASSETS_ROOT?.trim() ||
    process.env.LOCAL_ASSETS_ROOT?.trim();
  if (!raw) return null;
  return path.resolve(raw);
}

function assertSafeRelative(rel: string): void {
  const norm = path.posix.normalize(rel.replace(/\\/g, "/"));
  if (norm.startsWith("..") || norm.includes("/../") || norm.startsWith("/")) {
    throw new Error("[local-asset-store] unsafe relative path");
  }
}

/** Paths under `thumbnails/{year}/{month}/{uuid}.(png|webp)` — no `..` segments. */
const STORED_THUMBNAIL_REL =
  /^thumbnails\/\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|webp)$/i;

export function isSafeStoredThumbnailRelativePath(rel: string): boolean {
  const norm = path.posix.normalize(rel.trim().replace(/\\/g, "/"));
  if (norm.startsWith("..") || norm.includes("/../") || norm.startsWith("/")) {
    return false;
  }
  return STORED_THUMBNAIL_REL.test(norm);
}

export type WriteThumbnailResult = {
  relativePath: string;
  absolutePath: string;
  sha256Hex: string;
  fileSizeBytes: number;
};

/**
 * Writes PNG (or other) bytes under `{root}/thumbnails/{yyyy}/{mm}/{uuid}.{ext}`.
 * Returns a **posix** relative path for database storage (stable across platforms).
 */
export function resolveLocalAssetAbsolutePath(relativePath: string): string {
  const root = getLocalAssetsRoot();
  if (!root) {
    throw new Error("UPGRADE_LIFE_LOCAL_ASSETS_ROOT is not set");
  }
  const norm = path.posix.normalize(relativePath.replace(/\\/g, "/"));
  if (!isSafeStoredThumbnailRelativePath(norm)) {
    throw new Error("[local-asset-store] relative path is not an allowed thumbnail path");
  }
  return path.join(root, ...norm.split("/"));
}

/** `narration-audio/{episodeId}/{actId}-{blockIndex}.wav|mp3` — episodeId is sanitized (alphanumeric + `_-`). */
const STORED_NARRATION_AUDIO_REL =
  /^narration-audio\/[a-zA-Z0-9_-]{1,64}\/(mess|deep_dive|mirror|way_forward)-\d{4}\.(wav|mp3)$/i;

export function sanitizeEpisodeIdForAssets(id: string): string {
  const s = id
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 64);
  return s || "episode";
}

export function isSafeStoredNarrationAudioRelativePath(rel: string): boolean {
  const norm = path.posix.normalize(rel.trim().replace(/\\/g, "/"));
  if (norm.startsWith("..") || norm.includes("/../") || norm.startsWith("/")) {
    return false;
  }
  return STORED_NARRATION_AUDIO_REL.test(norm);
}

export type WriteNarrationBlockResult = {
  relativePath: string;
  absolutePath: string;
  sha256Hex: string;
  fileSizeBytes: number;
};

export function resolveNarrationAudioAbsolutePath(relativePath: string): string {
  const root = getLocalAssetsRoot();
  if (!root) {
    throw new Error("UPGRADE_LIFE_LOCAL_ASSETS_ROOT is not set");
  }
  const norm = path.posix.normalize(relativePath.replace(/\\/g, "/"));
  if (!isSafeStoredNarrationAudioRelativePath(norm)) {
    throw new Error(
      "[local-asset-store] relative path is not an allowed narration-audio path",
    );
  }
  return path.join(root, ...norm.split("/"));
}

/**
 * Writes narration TTS bytes under `{root}/narration-audio/{episodeId}/{actId}-{blockIndexPadded}.{ext}`.
 */
export async function writeNarrationBlockToLocalRoot(
  episodeId: string,
  actId: string,
  blockIndex: number,
  buffer: Buffer,
  extension: ".wav" | ".mp3",
): Promise<WriteNarrationBlockResult> {
  const root = getLocalAssetsRoot();
  if (!root) {
    throw new Error(
      "UPGRADE_LIFE_LOCAL_ASSETS_ROOT is not set — cannot write narration audio.",
    );
  }
  const safeId = sanitizeEpisodeIdForAssets(episodeId);
  const idx = String(Math.max(0, blockIndex)).padStart(4, "0");
  const relativePath = path.posix.join(
    "narration-audio",
    safeId,
    `${actId}-${idx}${extension}`,
  );
  assertSafeRelative(relativePath);
  if (!isSafeStoredNarrationAudioRelativePath(relativePath)) {
    throw new Error("[local-asset-store] narration path failed validation");
  }
  const absolutePath = path.join(root, ...relativePath.split("/"));
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  const sha256Hex = createHash("sha256").update(buffer).digest("hex");
  return {
    relativePath,
    absolutePath,
    sha256Hex,
    fileSizeBytes: buffer.length,
  };
}

export async function writeThumbnailToLocalRoot(
  buffer: Buffer,
  extension: ".png" | ".webp" = ".png"
): Promise<WriteThumbnailResult> {
  const root = getLocalAssetsRoot();
  if (!root) {
    throw new Error(
      "UPGRADE_LIFE_LOCAL_ASSETS_ROOT is not set — cannot write local assets."
    );
  }

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const id = randomUUID();
  const relativePath = path.posix.join("thumbnails", yyyy, mm, `${id}${extension}`);
  assertSafeRelative(relativePath);

  const absolutePath = path.join(root, ...relativePath.split("/"));
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  const sha256Hex = createHash("sha256").update(buffer).digest("hex");
  return {
    relativePath,
    absolutePath,
    sha256Hex,
    fileSizeBytes: buffer.length,
  };
}

/** `vis-stills/{episodeId}/motion/{actId}-{blockIndex}.mp4` — Ken-burns preview clips. */
const STORED_VIS_MOTION_REL =
  /^vis-stills\/[a-zA-Z0-9_-]{1,64}\/motion\/(mess|deep_dive|mirror|way_forward)-\d{4}\.mp4$/i;

export function isSafeStoredVisMotionRelativePath(rel: string): boolean {
  const norm = path.posix.normalize(rel.trim().replace(/\\/g, "/"));
  if (norm.startsWith("..") || norm.includes("/../") || norm.startsWith("/")) {
    return false;
  }
  return STORED_VIS_MOTION_REL.test(norm);
}

export function resolveVisMotionAbsolutePath(relativePath: string): string {
  const root = getLocalAssetsRoot();
  if (!root) {
    throw new Error("UPGRADE_LIFE_LOCAL_ASSETS_ROOT is not set");
  }
  const norm = path.posix.normalize(relativePath.replace(/\\/g, "/"));
  if (!isSafeStoredVisMotionRelativePath(norm)) {
    throw new Error(
      "[local-asset-store] relative path is not an allowed vis-motion path",
    );
  }
  return path.join(root, ...norm.split("/"));
}

/** `vis-stills/{episodeId}/export/assembly.mp4` — joined episode export. */
const STORED_VIS_ASSEMBLY_EXPORT_REL =
  /^vis-stills\/[a-zA-Z0-9_-]{1,64}\/export\/assembly\.mp4$/i;

export function isSafeStoredVisAssemblyExportRelativePath(rel: string): boolean {
  const norm = path.posix.normalize(rel.trim().replace(/\\/g, "/"));
  if (norm.startsWith("..") || norm.includes("/../") || norm.startsWith("/")) {
    return false;
  }
  return STORED_VIS_ASSEMBLY_EXPORT_REL.test(norm);
}

export function visAssemblyExportRelativePath(episodeId: string): string {
  const safeId = sanitizeEpisodeIdForAssets(episodeId);
  const relativePath = path.posix.join("vis-stills", safeId, "export", "assembly.mp4");
  assertSafeRelative(relativePath);
  if (!isSafeStoredVisAssemblyExportRelativePath(relativePath)) {
    throw new Error("[local-asset-store] assembly export path failed validation");
  }
  return relativePath;
}

export function resolveVisAssemblyExportAbsolutePath(relativePath: string): string {
  const root = getLocalAssetsRoot();
  if (!root) {
    throw new Error("UPGRADE_LIFE_LOCAL_ASSETS_ROOT is not set");
  }
  const norm = path.posix.normalize(relativePath.replace(/\\/g, "/"));
  if (!isSafeStoredVisAssemblyExportRelativePath(norm)) {
    throw new Error(
      "[local-asset-store] relative path is not an allowed assembly export path",
    );
  }
  return path.join(root, ...norm.split("/"));
}

/** Relative path for cached [VIS] motion preview (H.264 + AAC). */
export function visMotionRelativePathForBlock(
  episodeId: string,
  actId: string,
  blockIndex: number,
): string {
  const safeId = sanitizeEpisodeIdForAssets(episodeId);
  const idx = String(Math.max(0, blockIndex)).padStart(4, "0");
  const relativePath = path.posix.join(
    "vis-stills",
    safeId,
    "motion",
    `${actId}-${idx}.mp4`,
  );
  assertSafeRelative(relativePath);
  if (!isSafeStoredVisMotionRelativePath(relativePath)) {
    throw new Error("[local-asset-store] vis-motion path failed validation");
  }
  return relativePath;
}

/** `vis-stills/{episodeId}/{actId}-{blockIndex}.png` — episodeId sanitized. */
const STORED_VIS_STILL_REL =
  /^vis-stills\/[a-zA-Z0-9_-]{1,64}\/(mess|deep_dive|mirror|way_forward)-\d{4}\.png$/i;

export type WriteVisStillResult = {
  relativePath: string;
  absolutePath: string;
  sha256Hex: string;
  fileSizeBytes: number;
};

export function isSafeStoredVisStillRelativePath(rel: string): boolean {
  const norm = path.posix.normalize(rel.trim().replace(/\\/g, "/"));
  if (norm.startsWith("..") || norm.includes("/../") || norm.startsWith("/")) {
    return false;
  }
  return STORED_VIS_STILL_REL.test(norm);
}

export function resolveVisStillAbsolutePath(relativePath: string): string {
  const root = getLocalAssetsRoot();
  if (!root) {
    throw new Error("UPGRADE_LIFE_LOCAL_ASSETS_ROOT is not set");
  }
  const norm = path.posix.normalize(relativePath.replace(/\\/g, "/"));
  if (!isSafeStoredVisStillRelativePath(norm)) {
    throw new Error(
      "[local-asset-store] relative path is not an allowed vis-stills path",
    );
  }
  return path.join(root, ...norm.split("/"));
}

/**
 * Writes a script [VIS] still under `{root}/vis-stills/{episodeId}/{actId}-{blockIndexPadded}.png`.
 */
export async function writeVisStillToLocalRoot(
  episodeId: string,
  actId: string,
  blockIndex: number,
  buffer: Buffer,
): Promise<WriteVisStillResult> {
  const root = getLocalAssetsRoot();
  if (!root) {
    throw new Error(
      "UPGRADE_LIFE_LOCAL_ASSETS_ROOT is not set — cannot write vis still.",
    );
  }
  const safeId = sanitizeEpisodeIdForAssets(episodeId);
  const idx = String(Math.max(0, blockIndex)).padStart(4, "0");
  const relativePath = path.posix.join(
    "vis-stills",
    safeId,
    `${actId}-${idx}.png`,
  );
  assertSafeRelative(relativePath);
  if (!isSafeStoredVisStillRelativePath(relativePath)) {
    throw new Error("[local-asset-store] vis-stills path failed validation");
  }
  const absolutePath = path.join(root, ...relativePath.split("/"));
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  const sha256Hex = createHash("sha256").update(buffer).digest("hex");
  return {
    relativePath,
    absolutePath,
    sha256Hex,
    fileSizeBytes: buffer.length,
  };
}
