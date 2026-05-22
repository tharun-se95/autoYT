import "server-only";

import type { ListedNarrationSegment } from "@/lib/studio/narration-segment-types";
import type { ListedVisStill } from "@/lib/studio/vis-still-types";

export {
  ASSEMBLY_ACT_ORDER,
  isAssemblyActId,
  listAssemblyBlocks,
  type AssemblyBlockRow,
} from "@/lib/studio/assembly-blocks";

import {
  listAssemblyBlocks,
  type AssemblyBlockRow,
} from "@/lib/studio/assembly-blocks";

/** @deprecated Use AssemblyBlockRow */
export type AssemblyBlockTarget = AssemblyBlockRow;

/** Blocks with both still + narration, sorted in script act order. */
export function listAssemblyBlockTargets(
  segments: ListedNarrationSegment[],
  stills: ListedVisStill[],
): AssemblyBlockRow[] {
  return listAssemblyBlocks(segments, stills);
}
