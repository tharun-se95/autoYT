import type { ScriptActId } from "@/lib/script-writer/types";
import { getBaseBlockIndex } from "@/lib/script-writer/vis-block-index";
import type { ListedNarrationSegment } from "@/lib/studio/narration-segment-types";
import type { ListedVisStill } from "@/lib/studio/vis-still-types";

export const ASSEMBLY_ACT_ORDER: readonly ScriptActId[] = [
  "mess",
  "deep_dive",
  "mirror",
  "way_forward",
];

export function isAssemblyActId(s: string): s is ScriptActId {
  return (ASSEMBLY_ACT_ORDER as readonly string[]).includes(s);
}

export type AssemblyBlockRow = {
  actId: ScriptActId;
  blockIndex: number;
  still: ListedVisStill;
  stills: ListedVisStill[];
  segment: ListedNarrationSegment;
};

/** One row per narration block that has audio + at least one [VIS] still (client + server). */
export function listAssemblyBlocks(
  segments: ListedNarrationSegment[],
  stills: ListedVisStill[],
): AssemblyBlockRow[] {
  const stillsByBlockKey = new Map<string, ListedVisStill[]>();
  for (const s of stills) {
    const baseIdx = getBaseBlockIndex(s.blockIndex);
    const key = `${s.actId}:${baseIdx}`;
    if (!stillsByBlockKey.has(key)) {
      stillsByBlockKey.set(key, []);
    }
    stillsByBlockKey.get(key)!.push(s);
  }

  const targets: AssemblyBlockRow[] = [];
  for (const segment of segments) {
    const key = `${segment.actId}:${segment.blockIndex}`;
    const blockStills = stillsByBlockKey.get(key) ?? [];
    if (blockStills.length === 0) continue;

    blockStills.sort((a, b) => a.blockIndex - b.blockIndex);

    targets.push({
      actId: segment.actId,
      blockIndex: segment.blockIndex,
      still: blockStills[0]!,
      stills: blockStills,
      segment,
    });
  }

  targets.sort((a, b) => {
    const actCmp =
      ASSEMBLY_ACT_ORDER.indexOf(a.actId) - ASSEMBLY_ACT_ORDER.indexOf(b.actId);
    if (actCmp !== 0) return actCmp;
    return a.blockIndex - b.blockIndex;
  });

  return targets;
}
