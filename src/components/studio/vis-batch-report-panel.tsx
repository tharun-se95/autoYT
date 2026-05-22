"use client";

import { AlertTriangle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatVisBeatLabel,
  reportHasProblems,
  summarizeVisBatchReport,
  type VisBatchReport,
} from "@/lib/studio/vis-batch-report";
import { cn } from "@/lib/utils";

type VisBatchReportPanelProps = {
  report: VisBatchReport;
  retryCount: number;
  pending: boolean;
  minWords: number;
  onRetry: () => void;
  onDismiss: () => void;
  className?: string;
  compact?: boolean;
};

export function VisBatchReportPanel({
  report,
  retryCount,
  pending,
  minWords,
  onRetry,
  onDismiss,
  className,
  compact = false,
}: VisBatchReportPanelProps) {
  if (!reportHasProblems(report)) return null;

  const textSize = compact ? "text-[10px]" : "text-xs";

  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border border-amber-500/35 bg-amber-500/10 p-2.5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <AlertTriangle
            className="mt-0.5 size-3.5 shrink-0 text-amber-400"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className={cn("font-medium text-amber-100", textSize)}>
              Batch stills report
            </p>
            <p className={cn("mt-0.5 leading-snug text-amber-200/90", textSize)}>
              {summarizeVisBatchReport(report)}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 shrink-0 p-0 text-amber-200/80 hover:text-amber-100"
          onClick={onDismiss}
          aria-label="Dismiss report"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {(report.failed.length > 0 || report.missing.length > 0) && (
        <ul
          className={cn(
            "mt-2 max-h-36 space-y-1 overflow-y-auto rounded border border-amber-500/20 bg-black/20 px-2 py-1.5",
            textSize,
          )}
        >
          {report.failed.map((f) => (
            <li key={`f-${f.item.actId}-${f.item.blockIndex}-${f.item.beatIndex}`}>
              <span className="font-medium text-foreground">
                {formatVisBeatLabel(f.item)}
              </span>
              <span className="text-muted-foreground"> — failed: </span>
              <span className="text-amber-100/95">{f.error}</span>
            </li>
          ))}
          {report.missing.map((m) => (
            <li key={`m-${m.actId}-${m.blockIndex}-${m.beatIndex}`}>
              <span className="font-medium text-foreground">
                {formatVisBeatLabel(m)}
              </span>
              <span className="text-muted-foreground"> — no still saved after run</span>
            </li>
          ))}
        </ul>
      )}

      {report.skippedShort.length > 0 ? (
        <p className={cn("mt-2 leading-snug text-muted-foreground", textSize)}>
          <span className="font-medium text-foreground">
            {report.skippedShort.length}
          </span>{" "}
          beat{report.skippedShort.length === 1 ? "" : "s"} skipped (description under{" "}
          {minWords} words). Regenerate script on Script stage, then retry.
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-2">
        {retryCount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={cn("h-7", compact ? "text-[10px]" : "text-xs")}
            disabled={pending}
            onClick={onRetry}
          >
            {pending
              ? "Generating…"
              : `Generate failed & missing (${retryCount})`}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn("h-7", compact ? "text-[10px]" : "text-xs")}
          onClick={onDismiss}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
