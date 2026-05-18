import type { ScriptActId } from "@/lib/script-writer/types";

export type ListedVisStill = {
  id: string;
  actId: ScriptActId;
  blockIndex: number;
  localRelativePath: string;
  mimeType: string;
  updatedAt: string;
  fileUrl: string;
};
