import type { VisQueueItem } from "@/lib/script-writer/extract-vis-queue";
import { toVisStillBlockIndex } from "@/lib/script-writer/vis-block-index";
import type { ListedVisStill } from "@/lib/studio/vis-still-types";
import { isVisStillDescriptionEligible } from "@/lib/studio/vis-still-limits";

export type VisBatchRunFailure = {
  item: VisQueueItem;
  error: string;
};

export type VisBatchReport = {
  /** ISO timestamp when the batch finished. */
  finishedAt: string;
  attempted: number;
  succeeded: number;
  /** API errors during this run. */
  failed: VisBatchRunFailure[];
  /** Eligible beats with no still after reload. */
  missing: VisQueueItem[];
  /** Beats skipped because the visual description is too short. */
  skippedShort: VisQueueItem[];
};

export function visStillStorageKey(
  actId: string,
  blockIndex: number,
  beatIndex: number,
): string {
  return `${actId}:${toVisStillBlockIndex(blockIndex, beatIndex)}`;
}

export function formatVisBeatLabel(item: VisQueueItem): string {
  return `${item.actTitle} · block ${item.blockIndex + 1} · beat ${item.beatIndex + 1}`;
}

export function partitionVisQueue(queue: VisQueueItem[]): {
  eligible: VisQueueItem[];
  skippedShort: VisQueueItem[];
} {
  const eligible: VisQueueItem[] = [];
  const skippedShort: VisQueueItem[] = [];
  for (const item of queue) {
    if (isVisStillDescriptionEligible(item.visualDescription)) {
      eligible.push(item);
    } else {
      skippedShort.push(item);
    }
  }
  return { eligible, skippedShort };
}

export function findMissingVisStills(
  eligible: VisQueueItem[],
  stills: ListedVisStill[],
): VisQueueItem[] {
  const have = new Set(stills.map((s) => `${s.actId}:${s.blockIndex}`));
  return eligible.filter(
    (it) => !have.has(visStillStorageKey(it.actId, it.blockIndex, it.beatIndex)),
  );
}

export function buildVisBatchReport(params: {
  eligible: VisQueueItem[];
  skippedShort: VisQueueItem[];
  succeeded: number;
  failed: VisBatchRunFailure[];
  stills: ListedVisStill[];
}): VisBatchReport {
  const missing = findMissingVisStills(params.eligible, params.stills);
  return {
    finishedAt: new Date().toISOString(),
    attempted: params.eligible.length,
    succeeded: params.succeeded,
    failed: params.failed,
    missing,
    skippedShort: params.skippedShort,
  };
}

export function reportHasProblems(report: VisBatchReport): boolean {
  return (
    report.failed.length > 0 ||
    report.missing.length > 0 ||
    report.skippedShort.length > 0
  );
}

export function itemsNeedingRetry(report: VisBatchReport): VisQueueItem[] {
  const seen = new Set<string>();
  const out: VisQueueItem[] = [];
  for (const entry of [...report.failed.map((f) => f.item), ...report.missing]) {
    const key = visStillStorageKey(entry.actId, entry.blockIndex, entry.beatIndex);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

export function summarizeVisBatchReport(report: VisBatchReport): string {
  const saved = report.succeeded;
  const total = report.attempted;
  const problems: string[] = [];
  if (report.failed.length > 0) {
    problems.push(`${report.failed.length} failed`);
  }
  if (report.missing.length > 0) {
    problems.push(`${report.missing.length} missing`);
  }
  if (report.skippedShort.length > 0) {
    problems.push(`${report.skippedShort.length} too short to generate`);
  }
  if (problems.length === 0) {
    return `All ${saved} still${saved === 1 ? "" : "s"} generated successfully.`;
  }
  return `${saved}/${total} stills saved — ${problems.join(", ")}.`;
}
