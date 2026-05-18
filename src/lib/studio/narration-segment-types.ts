import type { ScriptActId } from "@/lib/script-writer/types";

/** Client-safe shape returned by `GET /api/studio/audio/segments` (matches server lister). */
export type ListedNarrationSegment = {
  id: string;
  actId: ScriptActId;
  blockIndex: number;
  mimeType: string;
  localRelativePath: string;
  updatedAt: string;
  fileUrl: string;
};
