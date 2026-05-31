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
  narration?: string,
): number[] {
  if (visualBeats.length === 0) return [];
  
  let weights: number[] = [];
  
  // High-fidelity segment word-count calculation based on the narration text between trigger phrases
  if (narration && narration.trim().length > 0) {
    const text = narration.toLowerCase();
    const positions = visualBeats.map((b) => {
      const phrase = b.phrase.trim().toLowerCase();
      const pos = text.indexOf(phrase);
      return { pos, beat: b };
    });
    
    // Check if we found all phrases and they are in chronological order
    const allFound = positions.every((p) => p.pos !== -1);
    if (allFound) {
      // Sort positions to be safe
      positions.sort((a, b) => a.pos - b.pos);
      
      const segments: string[] = [];
      for (let i = 0; i < positions.length; i++) {
        const start = positions[i].pos;
        const end = i < positions.length - 1 ? positions[i + 1].pos : text.length;
        segments.push(narration.slice(start, end));
      }
      
      weights = segments.map((seg) => {
        const n = seg.trim().split(/\s+/).filter(Boolean).length;
        return n || 1;
      });
    }
  }
  
  // Fallback to trigger phrase word count if narration parsing fails or is empty
  if (weights.length === 0) {
    weights = visualBeats.map((b) => {
      const n = b.phrase.trim().split(/\s+/).filter(Boolean).length;
      return n || 1;
    });
  }

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
  narration?: string,
): { audioStartSec: number; durationSec: number } {
  if (visualBeats.length === 0) {
    return { audioStartSec: 0, durationSec: blockDurationSec };
  }
  const durations = computeBeatDurationsSec(visualBeats, blockDurationSec, narration);
  const starts = computeBeatStartTimesSec(durations);
  if (beatIndex < 0 || beatIndex >= durations.length) {
    return { audioStartSec: 0, durationSec: blockDurationSec };
  }
  return {
    audioStartSec: starts[beatIndex] ?? 0,
    durationSec: durations[beatIndex] ?? blockDurationSec,
  };
}
