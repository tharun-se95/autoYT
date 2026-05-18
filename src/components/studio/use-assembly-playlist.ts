"use client";

import { useMemo } from "react";

import { extractVisQueueFromScript } from "@/lib/script-writer/extract-vis-queue";
import type { ScriptDocument } from "@/lib/script-writer/types";
import { motionPreviewUrl } from "@/lib/studio/motion-preview-url";
import type { ListedNarrationSegment } from "@/lib/studio/narration-segment-types";
import type { ListedVisStill } from "@/lib/studio/vis-still-types";

export type AssemblyPlaylistItem = {
  actId: string;
  actTitle: string;
  blockIndex: number;
  label: string;
  narrationPreview: string;
  motionSrc: string;
};

export function useAssemblyPlaylist(
  script: ScriptDocument | null,
  segments: ListedNarrationSegment[],
  stills: ListedVisStill[],
  videoId: string,
  clipsVersion: number,
): AssemblyPlaylistItem[] {
  return useMemo(() => {
    const queue = extractVisQueueFromScript(script);
    const segByKey = new Map(
      segments.map((s) => [`${s.actId}:${s.blockIndex}`, s] as const),
    );
    const stillByKey = new Map(
      stills.map((s) => [`${s.actId}:${s.blockIndex}`, s] as const),
    );

    const out: AssemblyPlaylistItem[] = [];
    for (const item of queue) {
      const key = `${item.actId}:${item.blockIndex}`;
      const seg = segByKey.get(key);
      const still = stillByKey.get(key);
      if (!seg || !still) continue;

      const narrationPreview =
        script?.acts
          .find((a) => a.actId === item.actId)
          ?.narrationBlocks[item.blockIndex]?.narration.trim() ?? "";

      out.push({
        actId: item.actId,
        actTitle: item.actTitle,
        blockIndex: item.blockIndex,
        label: `${item.actTitle} · block ${item.blockIndex + 1}`,
        narrationPreview,
        motionSrc: motionPreviewUrl({
          videoId,
          actId: item.actId,
          blockIndex: item.blockIndex,
          stillUpdatedAt: still.updatedAt,
          segmentUpdatedAt: seg.updatedAt,
          clipsVersion,
        }),
      });
    }
    return out;
  }, [script, segments, stills, videoId, clipsVersion]);
}
