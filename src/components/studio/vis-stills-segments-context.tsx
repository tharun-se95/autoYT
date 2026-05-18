"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { ListedVisStill } from "@/lib/studio/vis-still-types";
import { useScriptDraft } from "@/components/studio/script-draft-context";
import { listNarrationBlocksForTts } from "@/lib/script-writer/narration-for-tts";

type VisStillsSegmentsContextValue = {
  videoId: string;
  stills: ListedVisStill[];
  loadError: string | null;
  reloadStills: () => Promise<void>;
};

const VisStillsSegmentsContext =
  createContext<VisStillsSegmentsContextValue | null>(null);

export function useVisStillsSegments(): VisStillsSegmentsContextValue {
  const ctx = useContext(VisStillsSegmentsContext);
  if (!ctx) {
    throw new Error(
      "useVisStillsSegments must be used within VisStillsSegmentsProvider",
    );
  }
  return ctx;
}

export function VisStillsSegmentsProvider({
  videoId,
  children,
}: {
  videoId: string;
  children: ReactNode;
}) {
  const { script } = useScriptDraft();

  const scriptFingerprint = useMemo(() => {
    if (!script) return "";
    const blocks = listNarrationBlocksForTts(script);
    const narLens = blocks.map((b) => b.narration.length).join(",");
    let visChars = 0;
    for (const act of script.acts) {
      for (const b of act.narrationBlocks) {
        visChars += b.visualDescription?.length ?? 0;
      }
    }
    return `${script.workingTitle}|${blocks.length}|${narLens}|vis:${visChars}`;
  }, [script]);

  const [stills, setStills] = useState<ListedVisStill[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reloadStills = useCallback(async () => {
    void scriptFingerprint;
    setLoadError(null);
    try {
      const r = await fetch(
        `/api/studio/visuals/stills?videoId=${encodeURIComponent(videoId)}`,
      );
      const d = (await r.json()) as {
        ok?: boolean;
        stills?: ListedVisStill[];
        error?: string;
      };
      if (!r.ok || !d.ok || !Array.isArray(d.stills)) {
        setLoadError(d.error || `Could not load stills (${r.status}).`);
        setStills([]);
        return;
      }
      setStills(d.stills);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Load failed.");
      setStills([]);
    }
  }, [videoId, scriptFingerprint]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void reloadStills();
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [reloadStills]);

  const value = useMemo<VisStillsSegmentsContextValue>(
    () => ({
      videoId,
      stills,
      loadError,
      reloadStills,
    }),
    [videoId, stills, loadError, reloadStills],
  );

  return (
    <VisStillsSegmentsContext.Provider value={value}>
      {children}
    </VisStillsSegmentsContext.Provider>
  );
}
