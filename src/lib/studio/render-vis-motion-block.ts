import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import {
  getLocalAssetsRoot,
  resolveNarrationAudioAbsolutePath,
  resolveVisMotionAbsolutePath,
  resolveVisStillAbsolutePath,
  sanitizeEpisodeIdForAssets,
  visMotionRelativePathForBlock,
} from "@/lib/assets/local-asset-store";
import {
  probeAudioDurationSeconds,
  renderVisMotionMp4,
  type VisMotionBeatInput,
} from "@/lib/studio/ffmpeg-vis-motion";
import {
  kenBurnsPresetForBeatIndex,
  kenBurnsPresetForStudioBlock,
} from "@/lib/studio/ken-burns-zoompan";
import type { ListedNarrationSegment } from "@/lib/studio/narration-segment-types";
import type { ListedVisStill } from "@/lib/studio/vis-still-types";
import type { ScriptActId, ScriptDocument } from "@/lib/script-writer/types";
import { listVisStillsForVideo } from "@/lib/studio-db/persist-vis-still";
import { loadOrBuildAlignment } from "@/lib/studio/alignment-cache";
import { stillMatchesVisBeat } from "@/lib/script-writer/vis-block-index";

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

async function loadScriptJson(videoId: string): Promise<ScriptDocument | null> {
  const root = getLocalAssetsRoot();
  if (!root) return null;
  const safeId = sanitizeEpisodeIdForAssets(videoId);
  const p = path.join(root, "vis-stills", safeId, "script.json");
  try {
    const raw = await readFile(p, "utf8");
    return JSON.parse(raw) as ScriptDocument;
  } catch {
    return null;
  }
}

function stillMatchesBeat(
  s: ListedVisStill,
  actId: string,
  baseBlock: number,
  beatIndex: number,
  blockHasVisualBeats: boolean,
): boolean {
  if (s.actId !== actId) return false;
  return stillMatchesVisBeat(s.blockIndex, baseBlock, beatIndex, {
    allowLegacyPlainIndex: !blockHasVisualBeats,
  });
}

async function outputNeedsRebuild(
  outAbs: string,
  pngAbsPaths: string[],
  audioAbs: string,
): Promise<boolean> {
  let outMtime: number;
  try {
    outMtime = (await stat(outAbs)).mtimeMs;
  } catch {
    return true;
  }
  try {
    const a = await stat(audioAbs);
    if (outMtime < a.mtimeMs) return true;
    for (const p of pngAbsPaths) {
      const s = await stat(p);
      if (outMtime < s.mtimeMs) return true;
    }
    try {
      const sc = await stat(audioAbs + ".alignment.json");
      if (outMtime < sc.mtimeMs) return true;
    } catch {
      // no sidecar
    }
    return false;
  } catch {
    return true;
  }
}

const ACT_ORDER: readonly ScriptActId[] = [
  "mess",
  "deep_dive",
  "mirror",
  "way_forward",
];

/** Renders or returns cached Ken Burns MP4 for one narration block (multi-beat aware). */
export async function renderVisMotionBlock(params: {
  videoId: string;
  actId: ScriptActId;
  blockIndex: number;
  still?: ListedVisStill;
  stills?: ListedVisStill[];
  segment: ListedNarrationSegment;
  force?: boolean;
}): Promise<VisMotionRenderResult> {
  const { videoId, actId, blockIndex, still, stills, segment, force = false } = params;

  let audioAbs: string;
  try {
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

  // 1. Gather all stills for this block
  let blockStills: ListedVisStill[] = [];
  if (stills && stills.length > 0) {
    blockStills = stills;
  } else {
    // If not passed, fetch them
    const allStills = await listVisStillsForVideo(videoId);
    blockStills = allStills.filter(
      (s) =>
        s.actId === actId &&
        (s.blockIndex === blockIndex || Math.floor(s.blockIndex / 100) === blockIndex),
    );
  }

  // Fallback to legacy single still if no stills resolved yet
  if (blockStills.length === 0 && still) {
    blockStills = [still];
  }

  if (blockStills.length === 0) {
    return {
      ok: false,
      actId,
      blockIndex,
      error: "No [VIS] stills found for this block.",
    };
  }

  // Sort stills by beat index ascending
  blockStills.sort((a, b) => a.blockIndex - b.blockIndex);

  // 2. Fetch script.json to look up visualBeats and words
  const scriptDoc = await loadScriptJson(videoId);
  const act = scriptDoc?.acts?.find((a) => a.actId === actId);
  const block = act?.narrationBlocks?.[blockIndex];
  const visualBeats = block?.visualBeats || [];
  const blockHasVisualBeats = visualBeats.length > 0;

  const actI = Math.max(0, ACT_ORDER.indexOf(actId));
  const flatIndex = actI * 512 + blockIndex;

  let beatsInputs: VisMotionBeatInput[] = [];

  if (visualBeats.length > 0) {
    // Strict Quality Control: Verify that every visual beat has its own generated still in the database.
    // If any beat is missing, we explicitly abort and raise an alert instead of compiling a freeze-frame.
    for (let i = 0; i < visualBeats.length; i++) {
      const matchedStill = blockStills.find((s) =>
        stillMatchesBeat(s, actId, blockIndex, i, blockHasVisualBeats)
      );
      if (!matchedStill) {
        return {
          ok: false,
          actId,
          blockIndex,
          error: `Strict QC Check Failed: Still for visual beat index ${i} is missing in Act '${actId}' Block ${blockIndex + 1}. Every beat must have its own compiled still before exporting.`,
        };
      }
    }

    // We have visualBeats in the script!

    // Tier 2 proportional fallback values (computed up-front)
    const totalWords = visualBeats.reduce((sum, b) => {
      const words = b.phrase.trim().split(/\s+/).filter(Boolean).length;
      return sum + (words || 1);
    }, 0);

    // Tier 3: attempt forced alignment via ElevenLabs Scribe v2
    // Returns null on any failure — we silently fall back to Tier 2 in that case
    const alignedBeats = await loadOrBuildAlignment({
      audioAbsPath: audioAbs,
      visualBeats,
      totalAudioSec: dur,
    });

    beatsInputs = visualBeats.map((beat, i) => {
      // Find matching still by composite index
      const matchedStill =
        blockStills.find((s) =>
          stillMatchesBeat(s, actId, blockIndex, i, blockHasVisualBeats),
        ) ||
        blockStills[0]!;

      // Tier 3: use exact aligned duration if available
      // Tier 2 fallback: word-count proportional
      const wordCount = beat.phrase.trim().split(/\s+/).filter(Boolean).length || 1;
      const aligned = alignedBeats?.[i];
      const durationSec =
        aligned &&
        aligned.startSec >= 0 &&
        Number.isFinite(aligned.durationSec) &&
        aligned.durationSec > 0
          ? aligned.durationSec
          : dur * (wordCount / totalWords);

      const preset = kenBurnsPresetForBeatIndex(flatIndex + i);

      return {
        imageAbsolutePath: resolveVisStillAbsolutePath(matchedStill.localRelativePath),
        durationSec,
        preset,
      };
    });
  } else {
    // Fallback: divide duration equally among the stills we have
    const N = blockStills.length;
    beatsInputs = blockStills.map((s, i) => {
      const durationSec = dur / N;
      const preset = kenBurnsPresetForBeatIndex(flatIndex + i);
      return {
        imageAbsolutePath: resolveVisStillAbsolutePath(s.localRelativePath),
        durationSec,
        preset,
      };
    });
  }

  const motionRel = visMotionRelativePathForBlock(videoId, actId, blockIndex);
  let motionAbs: string;
  try {
    motionAbs = resolveVisMotionAbsolutePath(motionRel);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, actId, blockIndex, error: msg };
  }

  const pngAbsPaths = beatsInputs.map((b) => b.imageAbsolutePath);

  try {
    const need = force || (await outputNeedsRebuild(motionAbs, pngAbsPaths, audioAbs));
    if (need) {
      await renderVisMotionMp4({
        audioAbsolutePath: audioAbs,
        outputAbsolutePath: motionAbs,
        durationSec: dur,
        beats: beatsInputs,
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
