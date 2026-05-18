import "server-only";

import type { ScriptActId } from "@/lib/script-writer/types";
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

export type AssemblyBlockTarget = {
  actId: ScriptActId;
  blockIndex: number;
  still: ListedVisStill;
  segment: ListedNarrationSegment;
};

/** Blocks with both still + narration, sorted in script act order. */
export function listAssemblyBlockTargets(
  segments: ListedNarrationSegment[],
  stills: ListedVisStill[],
): AssemblyBlockTarget[] {
  const stillByKey = new Map(
    stills.map((s) => [`${s.actId}:${s.blockIndex}`, s] as const),
  );
  const segByKey = new Map(
    segments.map((s) => [`${s.actId}:${s.blockIndex}`, s] as const),
  );

  const targets: AssemblyBlockTarget[] = [];
  for (const key of stillByKey.keys()) {
    const segment = segByKey.get(key);
    const still = stillByKey.get(key);
    if (!segment || !still) continue;
    const [actId, idxStr] = key.split(":");
    if (!isAssemblyActId(actId)) continue;
    targets.push({
      actId,
      blockIndex: Number.parseInt(idxStr, 10),
      still,
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
