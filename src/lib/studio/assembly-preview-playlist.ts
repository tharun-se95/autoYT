import "server-only";

import { stat } from "node:fs/promises";

import {
  resolveNarrationAudioAbsolutePath,
  resolveVisMotionAbsolutePath,
  visMotionRelativePathForBeat,
} from "@/lib/assets/local-asset-store";
import { listAssemblyBeats } from "@/lib/studio/assembly-beats";
import { resolveBeatAudioTiming } from "@/lib/studio/beat-timings";
import { readCachedAlignmentBeats } from "@/lib/studio/alignment-cache";
import { probeAudioDurationSeconds } from "@/lib/studio/ffmpeg-vis-motion";
import { loadScriptDocumentForVideo } from "@/lib/studio/load-script-document";
import { listNarrationSegmentsForVideo } from "@/lib/studio-db/persist-narration-segment";
import { listVisStillsForVideo } from "@/lib/studio-db/persist-vis-still";
import { narrationAudioUrl } from "@/lib/studio/assembly-media-urls";
import type { AssemblyPreviewItem } from "@/lib/studio/assembly-preview-types";

export type { AssemblyPreviewItem } from "@/lib/studio/assembly-preview-types";

const GAP_THRESHOLD_SEC = 0.08;

export async function buildAssemblyPreviewPlaylist(
  videoId: string,
): Promise<AssemblyPreviewItem[]> {
  const [script, segments, stills] = await Promise.all([
    loadScriptDocumentForVideo(videoId),
    listNarrationSegmentsForVideo(videoId),
    listVisStillsForVideo(videoId),
  ]);

  const beats = listAssemblyBeats(script, segments, stills);
  const out: AssemblyPreviewItem[] = [];

  let blockKey = "";
  let cursorInBlock = 0;

  for (const row of beats) {
    const key = `${row.actId}:${row.baseBlockIndex}`;
    if (key !== blockKey) {
      blockKey = key;
      cursorInBlock = 0;
    }

    let audioAbs: string;
    try {
      audioAbs = resolveNarrationAudioAbsolutePath(row.segment.localRelativePath);
    } catch {
      continue;
    }

    const blockDur = (await probeAudioDurationSeconds(audioAbs)) ?? 0;
    const aligned =
      (await readCachedAlignmentBeats(audioAbs)) ??
      null;

    let startSec: number;
    let durationSec: number;

    if (aligned?.[row.beatIndex]) {
      startSec = aligned[row.beatIndex]!.startSec;
      durationSec = aligned[row.beatIndex]!.durationSec;
    } else {
      const tier2 = resolveBeatAudioTiming(
        row.blockVisualBeats,
        row.beatIndex,
        blockDur,
      );
      startSec = tier2.audioStartSec;
      durationSec = tier2.durationSec;
    }

    if (
      !Number.isFinite(startSec) ||
      !Number.isFinite(durationSec) ||
      durationSec <= 0
    ) {
      continue;
    }

    const gapBefore = startSec - cursorInBlock;
    if (gapBefore > GAP_THRESHOLD_SEC) {
      out.push({
        kind: "gap",
        actId: row.actId,
        actTitle: row.actTitle,
        baseBlockIndex: row.baseBlockIndex,
        label: `${row.actTitle} · block ${row.baseBlockIndex + 1} · lead-in`,
        durationSec: gapBefore,
        audioStartSec: cursorInBlock,
        narrationSrc: narrationAudioUrl(
          row.segment.localRelativePath,
          row.segment.updatedAt,
        ),
        segmentUpdatedAt: row.segment.updatedAt,
        stillPreviewRel: row.still.localRelativePath,
        stillUpdatedAt: row.still.updatedAt,
      });
    }

    let motionMtimeMs = 0;
    try {
      const motionRel = visMotionRelativePathForBeat(
        videoId,
        row.actId,
        row.motionStorageIndex,
      );
      motionMtimeMs = (await stat(resolveVisMotionAbsolutePath(motionRel)))
        .mtimeMs;
    } catch {
      motionMtimeMs = 0;
    }

    out.push({
      kind: "clip",
      actId: row.actId,
      actTitle: row.actTitle,
      baseBlockIndex: row.baseBlockIndex,
      beatIndex: row.beatIndex,
      motionStorageIndex: row.motionStorageIndex,
      label: `${row.actTitle} · block ${row.baseBlockIndex + 1} · beat ${row.beatIndex + 1}`,
      phrase: row.phrase,
      durationSec,
      audioStartSec: startSec,
      stillUpdatedAt: row.still.updatedAt,
      segmentUpdatedAt: row.segment.updatedAt,
      motionMtimeMs,
    });

    cursorInBlock = startSec + durationSec;
  }

  return out;
}
