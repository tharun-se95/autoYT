"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useScriptDraft } from "@/components/studio/script-draft-context";
import { listNarrationBlocksForTts } from "@/lib/script-writer/narration-for-tts";
import type { ListedNarrationSegment } from "@/lib/studio/narration-segment-types";

type NarrationAudioSegmentsContextValue = {
  videoId: string;
  segments: ListedNarrationSegment[];
  loadError: string | null;
  reloadSegments: () => Promise<void>;
};

const NarrationAudioSegmentsContext =
  createContext<NarrationAudioSegmentsContextValue | null>(null);

export function useNarrationAudioSegments(): NarrationAudioSegmentsContextValue {
  const ctx = useContext(NarrationAudioSegmentsContext);
  if (!ctx) {
    throw new Error(
      "useNarrationAudioSegments must be used within NarrationAudioSegmentsProvider",
    );
  }
  return ctx;
}

export function NarrationAudioSegmentsProvider({
  videoId,
  children,
}: {
  videoId: string;
  children: ReactNode;
}) {
  const { script } = useScriptDraft();
  const [segments, setSegments] = useState<ListedNarrationSegment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const scriptFingerprint = useMemo(() => {
    if (!script) return "";
    const blocks = listNarrationBlocksForTts(script);
    const lens = blocks.map((b) => b.narration.length).join(",");
    return `${script.workingTitle}|${blocks.length}|${lens}`;
  }, [script]);

  const reloadSegments = useCallback(async () => {
    setLoadError(null);
    try {
      const r = await fetch(
        `/api/studio/audio/segments?videoId=${encodeURIComponent(videoId)}`,
      );
      const d = (await r.json()) as {
        ok?: boolean;
        segments?: ListedNarrationSegment[];
        error?: string;
      };
      if (!r.ok || !d.ok || !Array.isArray(d.segments)) {
        setLoadError(d.error || `Could not load segments (${r.status}).`);
        setSegments([]);
        return;
      }
      setSegments(d.segments);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Load failed.");
      setSegments([]);
    }
  }, [videoId]);

  useEffect(() => {
    void reloadSegments();
  }, [videoId, scriptFingerprint, reloadSegments]);

  const value = useMemo<NarrationAudioSegmentsContextValue>(
    () => ({
      videoId,
      segments,
      loadError,
      reloadSegments,
    }),
    [videoId, segments, loadError, reloadSegments],
  );

  return (
    <NarrationAudioSegmentsContext.Provider value={value}>
      {children}
    </NarrationAudioSegmentsContext.Provider>
  );
}
