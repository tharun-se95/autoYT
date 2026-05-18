import "server-only";

import { stat } from "node:fs/promises";

import {
  resolveNarrationAudioAbsolutePath,
  resolveVisMotionAbsolutePath,
  resolveVisStillAbsolutePath,
  visMotionRelativePathForBlock,
} from "@/lib/assets/local-asset-store";
import {
  probeAudioDurationSeconds,
  renderVisMotionMp4,
} from "@/lib/studio/ffmpeg-vis-motion";
import { kenBurnsPresetForStudioBlock } from "@/lib/studio/ken-burns-zoompan";
import type { ListedNarrationSegment } from "@/lib/studio/narration-segment-types";
import type { ListedVisStill } from "@/lib/studio/vis-still-types";
import type { ScriptActId } from "@/lib/script-writer/types";

export type VisMotionRenderResult =
  | {
      ok: true;
      actId: ScriptActId;
      blockIndex: number;
      motionRelativePath: string;
      cached: boolean;
    }
  | {
      ok: false;
      actId: ScriptActId;
      blockIndex: number;
      error: string;
    };

async function outputNeedsRebuild(
  outAbs: string,
  pngAbs: string,
  audioAbs: string,
): Promise<boolean> {
  let outMtime: number;
  try {
    outMtime = (await stat(outAbs)).mtimeMs;
  } catch {
    return true;
  }
  try {
    const [p, a] = await Promise.all([stat(pngAbs), stat(audioAbs)]);
    return outMtime < p.mtimeMs || outMtime < a.mtimeMs;
  } catch {
    return true;
  }
}

/** Renders or returns cached Ken Burns MP4 for one narration block. */
export async function renderVisMotionBlock(params: {
  videoId: string;
  actId: ScriptActId;
  blockIndex: number;
  still: ListedVisStill;
  segment: ListedNarrationSegment;
  force?: boolean;
}): Promise<VisMotionRenderResult> {
  const { videoId, actId, blockIndex, still, segment, force = false } = params;

  let pngAbs: string;
  let audioAbs: string;
  try {
    pngAbs = resolveVisStillAbsolutePath(still.localRelativePath);
    audioAbs = resolveNarrationAudioAbsolutePath(segment.localRelativePath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, actId, blockIndex, error: msg };
  }

  const dur = await probeAudioDurationSeconds(audioAbs);
  if (!dur) {
    return {
      ok: false,
      actId,
      blockIndex,
      error: "Could not read audio duration (ffprobe failed).",
    };
  }

  const motionRel = visMotionRelativePathForBlock(videoId, actId, blockIndex);
  let motionAbs: string;
  try {
    motionAbs = resolveVisMotionAbsolutePath(motionRel);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, actId, blockIndex, error: msg };
  }

  try {
    const need = force || (await outputNeedsRebuild(motionAbs, pngAbs, audioAbs));
    if (need) {
      await renderVisMotionMp4({
        imageAbsolutePath: pngAbs,
        audioAbsolutePath: audioAbs,
        outputAbsolutePath: motionAbs,
        durationSec: dur,
        preset: kenBurnsPresetForStudioBlock(actId, blockIndex),
      });
      return {
        ok: true,
        actId,
        blockIndex,
        motionRelativePath: motionRel,
        cached: false,
      };
    }
    return {
      ok: true,
      actId,
      blockIndex,
      motionRelativePath: motionRel,
      cached: true,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      actId,
      blockIndex,
      error: `Motion render failed: ${msg}`,
    };
  }
}
