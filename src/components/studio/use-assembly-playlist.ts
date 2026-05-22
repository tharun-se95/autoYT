"use client";

import { useCallback, useEffect, useState } from "react";

import { motionPreviewUrl } from "@/lib/studio/motion-preview-url";
import { visStillPreviewUrl } from "@/lib/studio/assembly-media-urls";
import type { AssemblyPreviewItem } from "@/lib/studio/assembly-preview-types";

export type AssemblyPlaylistGapItem = {
  kind: "gap";
  actId: string;
  actTitle: string;
  baseBlockIndex: number;
  label: string;
  durationSec: number;
  audioStartSec: number;
  narrationSrc: string;
  stillPreviewSrc: string;
};

export type AssemblyPlaylistClipItem = {
  kind: "clip";
  actId: string;
  actTitle: string;
  baseBlockIndex: number;
  beatIndex: number;
  motionStorageIndex: number;
  label: string;
  phrase: string;
  durationSec: number;
  audioStartSec: number;
  motionSrc: string;
};

export type AssemblyPlaylistItem = AssemblyPlaylistGapItem | AssemblyPlaylistClipItem;

export function useAssemblyPlaylist(
  videoId: string,
  clipsVersion: number,
): {
  items: AssemblyPlaylistItem[];
  clipCount: number;
  loadError: string | null;
  reload: () => Promise<void>;
} {
  const [items, setItems] = useState<AssemblyPlaylistItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/studio/visuals/assembly-playlist?videoId=${encodeURIComponent(videoId)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        items?: AssemblyPreviewItem[];
        error?: string;
      };
      if (!res.ok || !data.ok || !Array.isArray(data.items)) {
        setLoadError(
          typeof data.error === "string"
            ? data.error
            : `Could not load assembly playlist (${res.status}).`,
        );
        setItems([]);
        return;
      }

      const mapped: AssemblyPlaylistItem[] = data.items.map((row) => {
        if (row.kind === "gap") {
          return {
            kind: "gap",
            actId: row.actId,
            actTitle: row.actTitle,
            baseBlockIndex: row.baseBlockIndex,
            label: row.label,
            durationSec: row.durationSec,
            audioStartSec: row.audioStartSec,
            narrationSrc: row.narrationSrc,
            stillPreviewSrc: visStillPreviewUrl(
              row.stillPreviewRel,
              row.stillUpdatedAt,
            ),
          };
        }
        return {
          kind: "clip",
          actId: row.actId,
          actTitle: row.actTitle,
          baseBlockIndex: row.baseBlockIndex,
          beatIndex: row.beatIndex,
          motionStorageIndex: row.motionStorageIndex,
          label: row.label,
          phrase: row.phrase,
          durationSec: row.durationSec,
          audioStartSec: row.audioStartSec,
          motionSrc: motionPreviewUrl({
            videoId,
            actId: row.actId,
            motionStorageIndex: row.motionStorageIndex,
            stillUpdatedAt: row.stillUpdatedAt,
            segmentUpdatedAt: row.segmentUpdatedAt,
            clipsVersion,
            motionMtimeMs: row.motionMtimeMs,
          }),
        };
      });

      setItems(mapped);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Load failed.");
      setItems([]);
    }
  }, [videoId, clipsVersion]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const clipCount = items.filter((i) => i.kind === "clip").length;

  return { items, clipCount, loadError, reload };
}
