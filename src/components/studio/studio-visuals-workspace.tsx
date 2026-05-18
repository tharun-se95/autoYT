"use client";

import { Download, Loader2 } from "lucide-react";

import { useVisualsBatchGenerateContext } from "@/components/studio/visuals-batch-generate-context";
import { Button } from "@/components/ui/button";

export function StudioVisualsWorkspace({ videoId: _videoId }: { videoId: string }) {
  const {
    script,
    queue,
    readyCount,
    clipReadyCount,
    loadError,
    genError,
    clipError,
    pending,
    progress,
    runAll,
    clipsPending,
    clipsProgress,
    runAllClips,
    exportPending,
    exportError,
    downloadAssemblyVideo,
  } = useVisualsBatchGenerateContext();

  if (!script) {
    return (
      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <p className="text-xs text-muted-foreground leading-snug">
          Load or generate a script on the Script stage to unlock{" "}
          <span className="font-medium text-foreground">Generate all visuals</span>.
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-white/10 border-l-4 border-l-primary/50 bg-white/[0.02] p-3 sm:p-3.5"
      aria-labelledby="visuals-workspace-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2
            id="visuals-workspace-heading"
            className="font-heading text-sm font-semibold text-foreground"
          >
            Visuals & motion clips
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Generate all visuals</span>{" "}
            walks every [VIS] line (Imagen stills).{" "}
            <span className="font-medium text-foreground">Generate clips</span> runs
            ffmpeg Ken Burns + narration per block (needs still + audio). See{" "}
            <code className="rounded bg-black/30 px-1 py-px text-[10px] text-foreground">
              src/prompts/README.md
            </code>
            .
          </p>
          {loadError ? (
            <p
              role="alert"
              className="mt-2 text-[10px] text-destructive leading-snug"
            >
              {loadError}
            </p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            size="sm"
            className="h-9 w-full shrink-0 text-xs sm:h-8 sm:flex-1"
            disabled={pending || clipsPending || readyCount === 0}
            onClick={() => void runAll()}
          >
            {pending
              ? progress
                ? `Generating ${progress.done}/${progress.total}…`
                : "Generating…"
              : `Generate all visuals (${readyCount} ready)`}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full shrink-0 text-xs sm:h-8 sm:flex-1"
            disabled={pending || clipsPending || clipReadyCount === 0}
            onClick={() => void runAllClips()}
          >
            {clipsPending
              ? clipsProgress
                ? `Clips ${clipsProgress.done}/${clipsProgress.total}…`
                : "Rendering clips…"
              : `Generate clips (${clipReadyCount} ready)`}
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="h-9 w-full shrink-0 text-xs sm:h-8 sm:flex-1"
            disabled={
              exportPending || clipsPending || pending || clipReadyCount === 0
            }
            onClick={() => void downloadAssemblyVideo()}
          >
            {exportPending ? (
              <Loader2 className="mr-1 size-3.5 animate-spin" aria-hidden />
            ) : (
              <Download className="mr-1 size-3.5" aria-hidden />
            )}
            {exportPending ? "Joining…" : "Download video"}
          </Button>
        </div>
      </div>

      {genError ? (
        <p role="alert" className="mt-2 text-xs text-destructive leading-snug">
          {genError}
        </p>
      ) : null}
      {clipError ? (
        <p role="alert" className="mt-2 text-xs text-destructive leading-snug">
          {clipError}
        </p>
      ) : null}
      {exportError ? (
        <p role="alert" className="mt-2 text-xs text-destructive leading-snug">
          {exportError}
        </p>
      ) : null}

      {queue.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          No [VIS] lines in this script.
        </p>
      ) : null}
    </section>
  );
}
