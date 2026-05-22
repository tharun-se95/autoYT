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
import { listAssemblyBeats } from "@/lib/studio/assembly-beats";
import { concatMp4ClipsToFile } from "@/lib/studio/ffmpeg-concat-export";
import { loadScriptDocumentForVideo } from "@/lib/studio/load-script-document";
import { renderVisMotionBeat } from "@/lib/studio/render-vis-motion-beat";
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

  const [script, segments, stills] = await Promise.all([
    loadScriptDocumentForVideo(videoId),
    listNarrationSegmentsForVideo(videoId),
    listVisStillsForVideo(videoId),
  ]);

  const beats = listAssemblyBeats(script, segments, stills);
  if (beats.length === 0) {
    return {
      ok: false,
      error:
        "No beats with both a [VIS] still and narration audio. Generate visuals and audio first.",
    };
  }

  const clipAbsPaths: string[] = [];

  for (const beat of beats) {
    const result = await renderVisMotionBeat({
      videoId,
      actId: beat.actId,
      baseBlockIndex: beat.baseBlockIndex,
      beatIndex: beat.beatIndex,
      still: beat.still,
      segment: beat.segment,
      blockVisualBeats: beat.blockVisualBeats,
      force: false,
    });
    if (!result.ok) {
      return {
        ok: false,
        error: `${beat.actTitle} · block ${beat.baseBlockIndex + 1} beat ${beat.beatIndex + 1}: ${result.error}`,
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
      clipCount: beats.length,
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
    clipCount: beats.length,
    cached: false,
    relativePath: exportRel,
    absolutePath: exportAbs,
  };
}
