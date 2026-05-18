"use client";

import { useCallback, useMemo, useState } from "react";

import { useScriptDraft } from "@/components/studio/script-draft-context";
import { useVisStillsSegments } from "@/components/studio/vis-stills-segments-context";
import { extractVisQueueFromScript } from "@/lib/script-writer/extract-vis-queue";
import { VIS_STILL_MIN_CHARS } from "@/lib/studio/vis-still-limits";

export function useVisualsBatchGenerate(videoId: string) {
  const { script } = useScriptDraft();
  const { loadError, reloadStills } = useVisStillsSegments();
  const [genError, setGenError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  const queue = useMemo(
    () => extractVisQueueFromScript(script),
    [script],
  );

  const readyCount = useMemo(
    () =>
      queue.filter((q) => q.visualDescription.trim().length >= VIS_STILL_MIN_CHARS)
        .length,
    [queue],
  );

  const runOne = useCallback(
    async (item: (typeof queue)[number]) => {
      if (!script) return false;
      const res = await fetch("/api/studio/visuals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          actId: item.actId,
          blockIndex: item.blockIndex,
          visualDescription: item.visualDescription,
          workingTitle: script.workingTitle,
        }),
      });
      const raw = await res.text();
      let data: { ok?: boolean; error?: string };
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        setGenError(`Non-JSON response (${res.status}).`);
        return false;
      }
      if (!res.ok || !data.ok) {
        setGenError(
          typeof data.error === "string"
            ? `${item.actTitle} · block ${item.blockIndex + 1}: ${data.error}`
            : `Request failed (${res.status}).`,
        );
        return false;
      }
      return true;
    },
    [script, videoId],
  );

  const runAll = useCallback(async () => {
    if (!script || queue.length === 0) return;
    setGenError(null);
    setPending(true);
    setProgress({ done: 0, total: queue.length });
    try {
      for (let i = 0; i < queue.length; i++) {
        const ok = await runOne(queue[i]);
        if (!ok) break;
        setProgress({ done: i + 1, total: queue.length });
      }
    } finally {
      await reloadStills();
      setPending(false);
      setProgress(null);
    }
  }, [script, queue, runOne, reloadStills]);

  return {
    script,
    queue,
    readyCount,
    loadError,
    genError,
    pending,
    progress,
    runAll,
  };
}
