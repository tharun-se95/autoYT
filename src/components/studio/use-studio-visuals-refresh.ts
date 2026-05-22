"use client";

import { useCallback, useState } from "react";

import { useNarrationAudioSegments } from "@/components/studio/narration-audio-segments-context";
import { useVisStillsSegments } from "@/components/studio/vis-stills-segments-context";

export function useStudioVisualsRefresh(bumpClipsPreview: () => void) {
  const { reloadStills } = useVisStillsSegments();
  const { reloadSegments } = useNarrationAudioSegments();
  const [refreshPending, setRefreshPending] = useState(false);

  const refreshStudioVisuals = useCallback(async () => {
    setRefreshPending(true);
    try {
      await Promise.all([reloadStills(), reloadSegments()]);
      bumpClipsPreview();
    } finally {
      setRefreshPending(false);
    }
  }, [reloadStills, reloadSegments, bumpClipsPreview]);

  return { refreshStudioVisuals, refreshPending };
}
