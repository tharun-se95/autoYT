import {
  parseMotionStorageIndex,
  toMotionStorageIndex,
} from "@/lib/studio/beat-timings";

/** Storage index for vis-stills / DB `block_index` — same encoding as motion clips (`block×100+beat`). */
export function toVisStillBlockIndex(
  baseBlockIndex: number,
  beatIndex: number,
): number {
  return toMotionStorageIndex(baseBlockIndex, beatIndex);
}

export function parseVisStillBlockIndex(stillBlockIndex: number): {
  baseBlockIndex: number;
  beatIndex: number;
} {
  return parseMotionStorageIndex(stillBlockIndex);
}

export function getBaseBlockIndex(stillBlockIndex: number): number {
  return parseVisStillBlockIndex(stillBlockIndex).baseBlockIndex;
}

export function visStillLookupKey(
  actId: string,
  baseBlockIndex: number,
  beatIndex: number,
): string {
  return `${actId}:${toVisStillBlockIndex(baseBlockIndex, beatIndex)}`;
}

export type StillMatchOptions = {
  /**
   * When true, beat 0 may match a legacy plain `block_index` (pre multi-beat scripts).
   * Must be false for blocks with `visualBeats` — otherwise index 1 collides with
   * block 0 beat 1 (storage 1) and block 1 beat 0 (legacy plain 1).
   */
  allowLegacyPlainIndex?: boolean;
};

/**
 * Whether a persisted still row belongs to this narration block + visual beat.
 */
export function stillMatchesVisBeat(
  stillBlockIndex: number,
  baseBlockIndex: number,
  beatIndex: number,
  options?: StillMatchOptions,
): boolean {
  if (stillBlockIndex === toVisStillBlockIndex(baseBlockIndex, beatIndex)) {
    return true;
  }
  if (
    options?.allowLegacyPlainIndex &&
    beatIndex === 0 &&
    stillBlockIndex === baseBlockIndex &&
    stillBlockIndex < 100
  ) {
    return true;
  }
  return false;
}

/** Lists storage indices that match more than one (block, beat) when legacy matching is enabled. */
export function findAmbiguousStillIndices(
  stills: { actId: string; blockIndex: number }[],
  actId: string,
  blockCount: number,
  beatsPerBlock: (baseBlockIndex: number) => number,
): number[] {
  const ambiguous: number[] = [];
  const forAct = stills.filter((s) => s.actId === actId);
  const indices = new Set(forAct.map((s) => s.blockIndex));

  for (const storageIndex of indices) {
    let matchCount = 0;
    for (let base = 0; base < blockCount; base++) {
      const beatLen = Math.max(1, beatsPerBlock(base));
      for (let beat = 0; beat < beatLen; beat++) {
        if (
          stillMatchesVisBeat(storageIndex, base, beat, {
            allowLegacyPlainIndex: true,
          })
        ) {
          matchCount++;
        }
      }
    }
    if (matchCount > 1) ambiguous.push(storageIndex);
  }
  return ambiguous;
}
