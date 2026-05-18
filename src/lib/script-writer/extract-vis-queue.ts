import type { ScriptDocument } from "@/lib/script-writer/types";

export type VisQueueItem = {
  actId: string;
  actTitle: string;
  blockIndex: number;
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
      const v = block.visualDescription?.trim();
      if (v) {
        out.push({
          actId: act.actId,
          actTitle: act.displayTitle,
          blockIndex,
          visualDescription: v,
        });
      }
    });
  }
  return out;
}
