import type { ScriptDocument } from "@/lib/script-writer/types";

export type VisQueueItem = {
  actId: string;
  actTitle: string;
  blockIndex: number;
  beatIndex: number;
  phrase: string;
  visualDescription: string;
};

/** Flatten [VIS] lines from a script for the visuals “suggested queue”. */
export function extractVisQueueFromScript(
  doc: ScriptDocument | null
): VisQueueItem[] {
  if (!doc?.acts?.length) return [];
  const out: VisQueueItem[] = [];
  for (const act of doc.acts) {
    act.narrationBlocks.forEach((block, blockIndex) => {
      const beats = block.visualBeats || [];
      if (beats.length > 0) {
        beats.forEach((beat, beatIndex) => {
          out.push({
            actId: act.actId,
            actTitle: act.displayTitle,
            blockIndex,
            beatIndex,
            phrase: beat.phrase,
            visualDescription: beat.visualDescription,
          });
        });
      } else if (block.visualDescription) {
        // Fallback for non-normalized legacy blocks
        out.push({
          actId: act.actId,
          actTitle: act.displayTitle,
          blockIndex,
          beatIndex: 0,
          phrase: block.narration.trim().split(" ").slice(0, 4).join(" ") + "...",
          visualDescription: block.visualDescription,
        });
      }
    });
  }
  return out;
}
