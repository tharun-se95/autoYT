import type { VisualBeat } from "@/lib/script-writer/types";

/** Unique motion/still storage key: `baseBlockIndex * 100 + beatIndex` (no collisions across blocks). */
export function toMotionStorageIndex(
  baseBlockIndex: number,
  beatIndex: number,
): number {
  return baseBlockIndex * 100 + beatIndex;
}

export function parseMotionStorageIndex(motionStorageIndex: number): {
  baseBlockIndex: number;
  beatIndex: number;
} {
  return {
    baseBlockIndex: Math.floor(motionStorageIndex / 100),
    beatIndex: motionStorageIndex % 100,
  };
}

/** Phrase word-count weights → durations that sum to `blockDurationSec`. */
export function computeBeatDurationsSec(
  visualBeats: VisualBeat[],
  blockDurationSec: number,
): number[] {
  if (visualBeats.length === 0) return [];
  const weights = visualBeats.map((b) => {
    const n = b.phrase.trim().split(/\s+/).filter(Boolean).length;
    return n || 1;
  });
  const total = weights.reduce((a, w) => a + w, 0) || 1;
  const durations = weights.map((w) => blockDurationSec * (w / total));
  const sum = durations.reduce((a, d) => a + d, 0);
  const drift = blockDurationSec - sum;
  if (durations.length > 0 && Math.abs(drift) > 0.001) {
    durations[durations.length - 1] = Math.max(
      0.05,
      durations[durations.length - 1]! + drift,
    );
  }
  return durations;
}

export function computeBeatStartTimesSec(durations: number[]): number[] {
  const starts: number[] = [];
  let t = 0;
  for (const d of durations) {
    starts.push(t);
    t += d;
  }
  return starts;
}

/** Phrase-timed audio slice for one beat within a narration block. */
export function resolveBeatAudioTiming(
  visualBeats: VisualBeat[],
  beatIndex: number,
  blockDurationSec: number,
): { audioStartSec: number; durationSec: number } {
  if (visualBeats.length === 0) {
    return { audioStartSec: 0, durationSec: blockDurationSec };
  }
  const durations = computeBeatDurationsSec(visualBeats, blockDurationSec);
  const starts = computeBeatStartTimesSec(durations);
  if (beatIndex < 0 || beatIndex >= durations.length) {
    return { audioStartSec: 0, durationSec: blockDurationSec };
  }
  return {
    audioStartSec: starts[beatIndex] ?? 0,
    durationSec: durations[beatIndex] ?? blockDurationSec,
  };
}
