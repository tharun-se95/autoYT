import type { ScriptActId } from "@/lib/script-writer/types";

/** Narration slice before a visual beat (or between beats) — full block audio, not phrase-clipped. */
export type AssemblyPreviewGapItem = {
  kind: "gap";
  actId: ScriptActId;
  actTitle: string;
  baseBlockIndex: number;
  label: string;
  /** Slice length in seconds. */
  durationSec: number;
  /** Start offset inside the block narration WAV. */
  audioStartSec: number;
  /** Same-origin narration file URL (`/api/studio/audio/file`). */
  narrationSrc: string;
  segmentUpdatedAt: string;
  /** Still shown during lead-in (usually the upcoming beat's frame). */
  stillPreviewRel: string;
  stillUpdatedAt: string;
};

export type AssemblyPreviewClipItem = {
  kind: "clip";
  actId: ScriptActId;
  actTitle: string;
  baseBlockIndex: number;
  beatIndex: number;
  motionStorageIndex: number;
  label: string;
  phrase: string;
  durationSec: number;
  audioStartSec: number;
  stillUpdatedAt: string;
  segmentUpdatedAt: string;
  motionMtimeMs: number;
};

export type AssemblyPreviewItem = AssemblyPreviewGapItem | AssemblyPreviewClipItem;
