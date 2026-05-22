import type { ScriptActId, ScriptDocument, VisualBeat } from "@/lib/script-writer/types";
import { stillMatchesVisBeat } from "@/lib/script-writer/vis-block-index";
import type { ListedNarrationSegment } from "@/lib/studio/narration-segment-types";
import type { ListedVisStill } from "@/lib/studio/vis-still-types";
import { toMotionStorageIndex } from "@/lib/studio/beat-timings";

export const ASSEMBLY_ACT_ORDER: readonly ScriptActId[] = [
  "mess",
  "deep_dive",
  "mirror",
  "way_forward",
];

export type AssemblyBeatRow = {
  actId: ScriptActId;
  actTitle: string;
  baseBlockIndex: number;
  beatIndex: number;
  /** Motion file + API `blockIndex` param (base×100+beat). */
  motionStorageIndex: number;
  phrase: string;
  visualDescription: string;
  /** All beats in the parent narration block (for phrase-timed motion render). */
  blockVisualBeats: VisualBeat[];
  still: ListedVisStill;
  segment: ListedNarrationSegment;
};

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

function findStillForBeat(
  stills: ListedVisStill[],
  actId: string,
  baseBlock: number,
  beatIndex: number,
  blockHasVisualBeats: boolean,
): ListedVisStill | undefined {
  return stills.find((s) =>
    stillMatchesBeat(s, actId, baseBlock, beatIndex, blockHasVisualBeats),
  );
}

/** Flat ordered list of visual beats that have a still + parent narration clip. */
export function listAssemblyBeats(
  script: ScriptDocument | null,
  segments: ListedNarrationSegment[],
  stills: ListedVisStill[],
): AssemblyBeatRow[] {
  if (!script?.acts?.length) return [];

  const segByKey = new Map(
    segments.map((s) => [`${s.actId}:${s.blockIndex}`, s] as const),
  );

  const out: AssemblyBeatRow[] = [];

  for (const act of script.acts) {
    act.narrationBlocks.forEach((block, baseBlockIndex) => {
      const seg = segByKey.get(`${act.actId}:${baseBlockIndex}`);
      if (!seg) return;

      const beats: VisualBeat[] =
        block.visualBeats && block.visualBeats.length > 0
          ? block.visualBeats
          : block.visualDescription?.trim()
            ? [
                {
                  phrase:
                    block.narration.trim().split(/\s+/).slice(0, 4).join(" ") +
                    "...",
                  visualDescription: block.visualDescription,
                },
              ]
            : [];

      const blockHasVisualBeats =
        Boolean(block.visualBeats && block.visualBeats.length > 0);

      beats.forEach((beat, beatIndex) => {
        const still = findStillForBeat(
          stills,
          act.actId,
          baseBlockIndex,
          beatIndex,
          blockHasVisualBeats,
        );
        if (!still) return;

        out.push({
          actId: act.actId,
          actTitle: act.displayTitle,
          baseBlockIndex,
          beatIndex,
          motionStorageIndex: toMotionStorageIndex(baseBlockIndex, beatIndex),
          phrase: beat.phrase,
          visualDescription: beat.visualDescription,
          blockVisualBeats: beats,
          still,
          segment: seg,
        });
      });
    });
  }

  out.sort((a, b) => {
    const actCmp =
      ASSEMBLY_ACT_ORDER.indexOf(a.actId) - ASSEMBLY_ACT_ORDER.indexOf(b.actId);
    if (actCmp !== 0) return actCmp;
    if (a.baseBlockIndex !== b.baseBlockIndex) {
      return a.baseBlockIndex - b.baseBlockIndex;
    }
    return a.beatIndex - b.beatIndex;
  });

  return out;
}
