import "server-only";

import { stat } from "node:fs/promises";

import {
  resolveNarrationAudioAbsolutePath,
  resolveVisMotionAbsolutePath,
  resolveVisStillAbsolutePath,
  visMotionRelativePathForBeat,
} from "@/lib/assets/local-asset-store";
import { loadOrBuildAlignment } from "@/lib/studio/alignment-cache";
import { resolveBeatAudioTiming } from "@/lib/studio/beat-timings";
import {
  probeAudioDurationSeconds,
  probeVideoDurationSeconds,
  renderVisMotionBeatMp4,
} from "@/lib/studio/ffmpeg-vis-motion";
import { kenBurnsPresetForBeatIndex } from "@/lib/studio/ken-burns-zoompan";
import { loadScriptDocumentForVideo } from "@/lib/studio/load-script-document";
import type { ListedNarrationSegment } from "@/lib/studio/narration-segment-types";
import type { ListedVisStill } from "@/lib/studio/vis-still-types";
import type { ScriptActId, VisualBeat } from "@/lib/script-writer/types";

const ACT_ORDER: readonly ScriptActId[] = [
  "mess",
  "deep_dive",
  "mirror",
  "way_forward",
];

export type VisMotionBeatRenderResult =
  | {
      ok: true;
      actId: ScriptActId;
      baseBlockIndex: number;
      beatIndex: number;
      motionStorageIndex: number;
      motionRelativePath: string;
      cached: boolean;
    }
  | {
      ok: false;
      actId: ScriptActId;
      baseBlockIndex: number;
      beatIndex: number;
      motionStorageIndex: number;
      error: string;
    };

async function outputNeedsRebuild(
  outAbs: string,
  pngAbs: string,
  audioAbs: string,
  expectedDurationSec?: number,
): Promise<boolean> {
  let outMtime: number;
  try {
    outMtime = (await stat(outAbs)).mtimeMs;
  } catch {
    return true;
  }
  try {
    const a = await stat(audioAbs);
    const p = await stat(pngAbs);
    if (outMtime < a.mtimeMs || outMtime < p.mtimeMs) return true;
    const sidecar = audioAbs + ".alignment.json";
    try {
      const sc = await stat(sidecar);
      if (outMtime < sc.mtimeMs) return true;
    } catch {
      // no sidecar yet
    }
  } catch {
    return true;
  }

  if (expectedDurationSec != null && expectedDurationSec > 0) {
    const videoDur = await probeVideoDurationSeconds(outAbs);
    if (
      videoDur != null &&
      Math.abs(videoDur - expectedDurationSec) > 1.25
    ) {
      return true;
    }
  }

  return false;
}

/** Renders one per-beat Ken Burns MP4 with a phrase-timed slice of block narration. */
export async function renderVisMotionBeat(params: {
  videoId: string;
  actId: ScriptActId;
  baseBlockIndex: number;
  beatIndex: number;
  still: ListedVisStill;
  segment: ListedNarrationSegment;
  /** When set, overrides script.json lookup for phrase-timed audio slices. */
  blockVisualBeats?: VisualBeat[];
  force?: boolean;
}): Promise<VisMotionBeatRenderResult> {
  const {
    videoId,
    actId,
    baseBlockIndex,
    beatIndex,
    still,
    segment,
    blockVisualBeats,
    force = false,
  } = params;

  const motionStorageIndex = baseBlockIndex * 100 + beatIndex;

  let audioAbs: string;
  try {
    audioAbs = resolveNarrationAudioAbsolutePath(segment.localRelativePath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      actId,
      baseBlockIndex,
      beatIndex,
      motionStorageIndex,
      error: msg,
    };
  }

  const blockDur = await probeAudioDurationSeconds(audioAbs);
  if (!blockDur) {
    return {
      ok: false,
      actId,
      baseBlockIndex,
      beatIndex,
      motionStorageIndex,
      error: "Could not read audio duration (ffprobe failed).",
    };
  }

  let visualBeats: VisualBeat[] = [];
  let block: any = null;
  if (blockVisualBeats === undefined) {
    const scriptDoc = await loadScriptDocumentForVideo(videoId);
    const act = scriptDoc?.acts?.find((a) => a.actId === actId);
    block = act?.narrationBlocks?.[baseBlockIndex];
    visualBeats = block?.visualBeats ?? [];
  } else {
    visualBeats = blockVisualBeats;
    const scriptDoc = await loadScriptDocumentForVideo(videoId);
    const act = scriptDoc?.acts?.find((a) => a.actId === actId);
    block = act?.narrationBlocks?.[baseBlockIndex];
  }

  if (visualBeats.length > 0 && beatIndex >= visualBeats.length) {
    return {
      ok: false,
      actId,
      baseBlockIndex,
      beatIndex,
      motionStorageIndex,
      error: "Beat index out of range for this block.",
    };
  }

  let audioStartSec: number;
  let durationSec: number;

  if (visualBeats.length > 0) {
    const alignedBeats = await loadOrBuildAlignment({
      audioAbsPath: audioAbs,
      visualBeats,
      totalAudioSec: blockDur,
    });
    const aligned = alignedBeats?.[beatIndex];
    if (
      aligned &&
      aligned.startSec >= 0 &&
      Number.isFinite(aligned.durationSec) &&
      aligned.durationSec > 0
    ) {
      audioStartSec = aligned.startSec;
      durationSec = aligned.durationSec;
    } else {
      const tier2 = resolveBeatAudioTiming(visualBeats, beatIndex, blockDur, block?.narration);
      audioStartSec = tier2.audioStartSec;
      durationSec = tier2.durationSec;
    }
  } else {
    audioStartSec = 0;
    durationSec = blockDur;
  }

  let pngAbs: string;
  try {
    pngAbs = resolveVisStillAbsolutePath(still.localRelativePath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      actId,
      baseBlockIndex,
      beatIndex,
      motionStorageIndex,
      error: msg,
    };
  }

  const motionRel = visMotionRelativePathForBeat(
    videoId,
    actId,
    motionStorageIndex,
  );
  let motionAbs: string;
  try {
    motionAbs = resolveVisMotionAbsolutePath(motionRel);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      actId,
      baseBlockIndex,
      beatIndex,
      motionStorageIndex,
      error: msg,
    };
  }

  const actI = Math.max(0, ACT_ORDER.indexOf(actId));
  const flatIndex = actI * 512 + baseBlockIndex * 16 + beatIndex;
  const preset = kenBurnsPresetForBeatIndex(flatIndex);

  try {
    const need =
      force ||
      (await outputNeedsRebuild(motionAbs, pngAbs, audioAbs, durationSec));
    if (need) {
      await renderVisMotionBeatMp4({
        imageAbsolutePath: pngAbs,
        audioAbsolutePath: audioAbs,
        audioStartSec,
        durationSec,
        outputAbsolutePath: motionAbs,
        preset,
      });
      return {
        ok: true,
        actId,
        baseBlockIndex,
        beatIndex,
        motionStorageIndex,
        motionRelativePath: motionRel,
        cached: false,
      };
    }
    return {
      ok: true,
      actId,
      baseBlockIndex,
      beatIndex,
      motionStorageIndex,
      motionRelativePath: motionRel,
      cached: true,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      actId,
      baseBlockIndex,
      beatIndex,
      motionStorageIndex,
      error: `Motion render failed: ${msg}`,
    };
  }
}
