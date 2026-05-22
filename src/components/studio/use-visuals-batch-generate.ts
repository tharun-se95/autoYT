"use client";

import { useCallback, useMemo, useState } from "react";

import { useScriptDraft } from "@/components/studio/script-draft-context";
import { useVisStillsSegments } from "@/components/studio/vis-stills-segments-context";
import {
  extractVisQueueFromScript,
  type VisQueueItem,
} from "@/lib/script-writer/extract-vis-queue";
import { toVisStillBlockIndex } from "@/lib/script-writer/vis-block-index";
import {
  buildVisBatchReport,
  itemsNeedingRetry,
  partitionVisQueue,
  reportHasProblems,
  summarizeVisBatchReport,
  type VisBatchReport,
  type VisBatchRunFailure,
} from "@/lib/studio/vis-batch-report";
import { VIS_STILL_MIN_WORDS } from "@/lib/studio/vis-still-limits";

export function useVisualsBatchGenerate(videoId: string) {
  const { script } = useScriptDraft();
  const { loadError, reloadStills } = useVisStillsSegments();
  const [genError, setGenError] = useState<string | null>(null);
  const [batchReport, setBatchReport] = useState<VisBatchReport | null>(null);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  const queue = useMemo(
    () => extractVisQueueFromScript(script),
    [script],
  );

  const { eligible, skippedShort } = useMemo(
    () => partitionVisQueue(queue),
    [queue],
  );

  const readyCount = eligible.length;

  const retryCount = useMemo(
    () => (batchReport ? itemsNeedingRetry(batchReport).length : 0),
    [batchReport],
  );

  const runOne = useCallback(
    async (item: VisQueueItem): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!script) {
        return { ok: false, error: "No script loaded." };
      }
      const res = await fetch("/api/studio/visuals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          actId: item.actId,
          blockIndex: toVisStillBlockIndex(item.blockIndex, item.beatIndex),
          visualDescription: item.visualDescription,
          workingTitle: script.workingTitle,
        }),
      });
      const raw = await res.text();
      let data: { ok?: boolean; error?: string };
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        return { ok: false, error: `Non-JSON response (${res.status}).` };
      }
      if (!res.ok || !data.ok) {
        return {
          ok: false,
          error:
            typeof data.error === "string"
              ? data.error
              : `Request failed (${res.status}).`,
        };
      }
      return { ok: true };
    },
    [script, videoId],
  );

  const runBatch = useCallback(
    async (items: VisQueueItem[]) => {
      if (!script || items.length === 0) return null;

      setGenError(null);
      setPending(true);
      setProgress({ done: 0, total: items.length });

      const failed: VisBatchRunFailure[] = [];
      let succeeded = 0;

      try {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const result = await runOne(item);
          if (result.ok) {
            succeeded += 1;
          } else {
            failed.push({ item, error: result.error });
          }
          setProgress({ done: i + 1, total: items.length });
        }
      } finally {
        const stills = await reloadStills();
        setPending(false);
        setProgress(null);

        const report = buildVisBatchReport({
          eligible: items,
          skippedShort,
          succeeded,
          failed,
          stills,
        });

        setBatchReport(report);

        if (reportHasProblems(report)) {
          setGenError(summarizeVisBatchReport(report));
        } else {
          setGenError(null);
        }

        return report;
      }
    },
    [script, runOne, reloadStills, skippedShort],
  );

  const runAll = useCallback(async () => {
    if (eligible.length === 0) return;
    await runBatch(eligible);
  }, [eligible, runBatch]);

  const runFailedOrMissing = useCallback(async () => {
    if (!batchReport) return;
    const retryItems = itemsNeedingRetry(batchReport);
    if (retryItems.length === 0) return;
    await runBatch(retryItems);
  }, [batchReport, runBatch]);

  const dismissBatchReport = useCallback(() => {
    setBatchReport(null);
    setGenError(null);
  }, []);

  return {
    script,
    queue,
    eligible,
    skippedShort,
    readyCount,
    retryCount,
    loadError,
    genError,
    batchReport,
    pending,
    progress,
    runAll,
    runFailedOrMissing,
    dismissBatchReport,
    visStillMinWords: VIS_STILL_MIN_WORDS,
  };
}
