import "server-only";

import { stat } from "node:fs/promises";
import path from "node:path";

import {
  getLocalAssetsRoot,
  resolveVisAssemblyExportAbsolutePath,
  resolveVisMotionAbsolutePath,
  sanitizeEpisodeIdForAssets,
  visAssemblyExportRelativePath,
} from "@/lib/assets/local-asset-store";
import { ASSEMBLY_ACT_ORDER } from "@/lib/studio/assembly-beats";
import { concatMp4ClipsToFile } from "@/lib/studio/ffmpeg-concat-export";
import { renderVisMotionBlock } from "@/lib/studio/render-vis-motion-block";
import { listNarrationSegmentsForVideo } from "@/lib/studio-db/persist-narration-segment";
import { listVisStillsForVideo } from "@/lib/studio-db/persist-vis-still";

export type ExportAssemblyVideoResult =
  | {
      ok: true;
      videoId: string;
      clipCount: number;
      cached: boolean;
      relativePath: string;
      absolutePath: string;
    }
  | {
      ok: false;
      error: string;
    };

async function exportNeedsRebuild(
  exportAbs: string,
  clipAbsPaths: string[],
): Promise<boolean> {
  let exportMtime: number;
  try {
    exportMtime = (await stat(exportAbs)).mtimeMs;
  } catch {
    return true;
  }
  try {
    const mtimes = await Promise.all(
      clipAbsPaths.map(async (p) => (await stat(p)).mtimeMs),
    );
    return mtimes.some((m) => m > exportMtime);
  } catch {
    return true;
  }
}

/**
 * Ensures per-beat motion clips exist, then ffmpeg-concats them into one MP4.
 */
export async function exportAssemblyVideoForEpisode(params: {
  videoId: string;
  force?: boolean;
}): Promise<ExportAssemblyVideoResult> {
  const { videoId, force = false } = params;

  if (!getLocalAssetsRoot()) {
    return { ok: false, error: "Local assets root not configured." };
  }

  const [segments, stills] = await Promise.all([
    listNarrationSegmentsForVideo(videoId),
    listVisStillsForVideo(videoId),
  ]);

  if (segments.length === 0) {
    return {
      ok: false,
      error: "No narration segments found. Generate audio first.",
    };
  }

  // Sort segments to ensure correct chronological video order (Mess -> Deep Dive -> Mirror -> Way Forward)
  segments.sort((a, b) => {
    const actCmp =
      ASSEMBLY_ACT_ORDER.indexOf(a.actId as any) - ASSEMBLY_ACT_ORDER.indexOf(b.actId as any);
    if (actCmp !== 0) return actCmp;
    return a.blockIndex - b.blockIndex;
  });

  const clipAbsPaths: string[] = [];

  for (const seg of segments) {
    const result = await renderVisMotionBlock({
      videoId,
      actId: seg.actId as any,
      blockIndex: seg.blockIndex,
      stills,
      segment: seg,
      force,
    });
    if (!result.ok) {
      return {
        ok: false,
        error: `Act ${seg.actId} · block ${seg.blockIndex + 1}: ${result.error}`,
      };
    }
    try {
      clipAbsPaths.push(resolveVisMotionAbsolutePath(result.motionRelativePath));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg };
    }
  }

  const exportRel = visAssemblyExportRelativePath(videoId);
  let exportAbs: string;
  try {
    exportAbs = resolveVisAssemblyExportAbsolutePath(exportRel);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  const need =
    force || (await exportNeedsRebuild(exportAbs, clipAbsPaths));
  if (!need) {
    return {
      ok: true,
      videoId,
      clipCount: segments.length,
      cached: true,
      relativePath: exportRel,
      absolutePath: exportAbs,
    };
  }

  const root = getLocalAssetsRoot()!;
  const safeId = sanitizeEpisodeIdForAssets(videoId);
  const workDir = path.join(root, "vis-stills", safeId, "export");

  try {
    await concatMp4ClipsToFile({
      inputAbsolutePaths: clipAbsPaths,
      outputAbsolutePath: exportAbs,
      workDirAbsolutePath: workDir,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Join failed: ${msg}` };
  }

  return {
    ok: true,
    videoId,
    clipCount: segments.length,
    cached: false,
    relativePath: exportRel,
    absolutePath: exportAbs,
  };
}
