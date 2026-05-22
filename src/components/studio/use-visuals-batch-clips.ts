"use client";

import { useCallback, useMemo, useState } from "react";

import { useScriptDraft } from "@/components/studio/script-draft-context";
import { useVisStillsSegments } from "@/components/studio/vis-stills-segments-context";
import { useNarrationAudioSegments } from "@/components/studio/narration-audio-segments-context";
import { listAssemblyBeats } from "@/lib/studio/assembly-beats";

export function useVisualsBatchClips(videoId: string) {
  const { script } = useScriptDraft();
  const { stills } = useVisStillsSegments();
  const { segments } = useNarrationAudioSegments();
  const [clipError, setClipError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [clipsVersion, setClipsVersion] = useState(0);

  const bumpClipsPreview = useCallback(() => {
    setClipsVersion((v) => v + 1);
  }, []);

  const clipReadyCount = useMemo(
    () => listAssemblyBeats(script, segments, stills).length,
    [script, segments, stills],
  );

  const runAllClips = useCallback(
    async (opts?: { force?: boolean }) => {
      if (clipReadyCount === 0) return;
      setClipError(null);
      setPending(true);
      setProgress({ done: 0, total: clipReadyCount });
      try {
        const res = await fetch("/api/studio/visuals/motion/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId,
            force: Boolean(opts?.force),
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          total?: number;
          rendered?: number;
          cached?: number;
          failed?: number;
          results?: {
            ok: boolean;
            actId: string;
            baseBlockIndex?: number;
            beatIndex?: number;
            blockIndex?: number;
            error?: string;
          }[];
        };
        if (!res.ok) {
          setClipError(
            typeof data.error === "string"
              ? data.error
              : `Clip render failed (${res.status}).`,
          );
          return;
        }
        setProgress({
          done: (data.rendered ?? 0) + (data.cached ?? 0),
          total: data.total ?? clipReadyCount,
        });
        if ((data.failed ?? 0) > 0) {
          const first = data.results?.find((r) => !r.ok);
          const block = first?.baseBlockIndex ?? first?.blockIndex;
          setClipError(
            first?.error
              ? `${first.actId} · block ${(block ?? 0) + 1} beat ${(first.beatIndex ?? 0) + 1}: ${first.error}`
              : `${data.failed} clip(s) failed.`,
          );
        } else if ((data.rendered ?? 0) + (data.cached ?? 0) > 0) {
          setClipError(null);
        }
        bumpClipsPreview();
      } catch (e) {
        setClipError(e instanceof Error ? e.message : "Clip render failed.");
      } finally {
        setPending(false);
        setProgress(null);
      }
    },
    [clipReadyCount, videoId, bumpClipsPreview],
  );

  return {
    clipReadyCount,
    clipError,
    clipsPending: pending,
    clipsProgress: progress,
    clipsVersion,
    bumpClipsPreview,
    runAllClips,
  };
}
