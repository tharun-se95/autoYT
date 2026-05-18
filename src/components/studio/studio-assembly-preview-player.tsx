"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  Loader2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react";

import { useVisualsBatchGenerateContext } from "@/components/studio/visuals-batch-generate-context";
import { useAssemblyPlaylist } from "@/components/studio/use-assembly-playlist";
import { useScriptDraft } from "@/components/studio/script-draft-context";
import { useNarrationAudioSegments } from "@/components/studio/narration-audio-segments-context";
import { useVisStillsSegments } from "@/components/studio/vis-stills-segments-context";
import { Button } from "@/components/ui/button";

export function StudioAssemblyPreviewPlayer({
  videoId,
  workingTitle,
}: {
  videoId: string;
  workingTitle: string;
}) {
  const { script } = useScriptDraft();
  const { segments } = useNarrationAudioSegments();
  const { stills } = useVisStillsSegments();
  const {
    clipReadyCount,
    clipsVersion,
    clipsPending,
    runAllClips,
    exportPending,
    exportError,
    downloadAssemblyVideo,
  } = useVisualsBatchGenerateContext();

  const playlist = useAssemblyPlaylist(
    script,
    segments,
    stills,
    videoId,
    clipsVersion,
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const shouldAutoplayRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [clipError, setClipError] = useState<string | null>(null);

  const total = playlist.length;
  const safeIndex = total > 0 ? Math.min(index, total - 1) : 0;
  const current = total > 0 ? playlist[safeIndex] : undefined;

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
    shouldAutoplayRef.current = false;
    setClipError(null);
  }, [clipsVersion, total]);

  useEffect(() => {
    const el = videoRef.current;
    const item = current;
    if (!el || !item) return;

    let cancelled = false;
    setBuffering(true);
    setClipError(null);

    const onCanPlay = () => {
      if (cancelled) return;
      setBuffering(false);
      if (shouldAutoplayRef.current) {
        void el.play()
          .then(() => setPlaying(true))
          .catch(() => {
            setPlaying(false);
            shouldAutoplayRef.current = false;
          });
      }
    };

    const onError = () => {
      if (cancelled) return;
      setClipError(`Could not load clip ${safeIndex + 1} of ${total}.`);
      setPlaying(false);
      setBuffering(false);
      shouldAutoplayRef.current = false;
    };

    el.src = item.motionSrc;
    el.load();
    el.addEventListener("canplay", onCanPlay, { once: true });
    el.addEventListener("error", onError, { once: true });

    return () => {
      cancelled = true;
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("error", onError);
    };
  }, [current?.motionSrc, safeIndex, total]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el || !current) return;

    if (playing) {
      el.pause();
      setPlaying(false);
      shouldAutoplayRef.current = false;
      return;
    }

    shouldAutoplayRef.current = true;
    if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      void el.play()
        .then(() => setPlaying(true))
        .catch(() => {
          setPlaying(false);
          shouldAutoplayRef.current = false;
        });
    } else {
      setBuffering(true);
    }
  }, [playing, current]);

  const goTo = useCallback(
    (nextIndex: number, keepPlaying: boolean) => {
      if (nextIndex < 0 || nextIndex >= total) return;
      shouldAutoplayRef.current = keepPlaying;
      setIndex(nextIndex);
      if (!keepPlaying) setPlaying(false);
    },
    [total],
  );

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onEnded = () => {
      if (safeIndex < total - 1) {
        goTo(safeIndex + 1, true);
      } else {
        setPlaying(false);
        shouldAutoplayRef.current = false;
      }
    };

    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, [safeIndex, total, goTo]);

  if (total === 0) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-black/70 p-6 text-center">
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Assembly preview needs matching [VIS] stills and narration clips. Generate
          visuals and audio first, then use{" "}
          <span className="font-medium text-foreground">Generate clips</span>.
        </p>
        {clipReadyCount > 0 ? (
          <Button
            type="button"
            size="sm"
            disabled={clipsPending}
            onClick={() => void runAllClips()}
          >
            {clipsPending ? "Rendering clips…" : `Generate clips (${clipReadyCount})`}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="relative aspect-video w-full bg-black">
        <video
          ref={videoRef}
          className="size-full bg-black object-contain"
          playsInline
          preload="auto"
          aria-label={`Assembly preview: ${current?.label ?? "block"}`}
        />
        {buffering ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="size-8 animate-spin text-white/80" aria-hidden />
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent px-3 pb-8 pt-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/70">
            Pre-export assembly
          </p>
          <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-white">
            {workingTitle}
          </p>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-3 pt-10">
          <p className="text-[11px] font-medium text-white">
            {current?.label}
            <span className="text-white/60">
              {" "}
              · {safeIndex + 1} / {total}
            </span>
          </p>
          {current?.narrationPreview ? (
            <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-white/75">
              {current.narrationPreview}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-white/10 bg-black/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-white hover:bg-white/10"
            disabled={safeIndex <= 0 || buffering}
            onClick={() => goTo(safeIndex - 1, playing)}
            aria-label="Previous clip"
          >
            <SkipBack className="size-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-9 shrink-0"
            disabled={buffering}
            onClick={togglePlay}
            aria-label={playing ? "Pause assembly preview" : "Play assembly preview"}
          >
            {buffering ? (
              <Loader2 className="size-4 animate-spin" />
            ) : playing ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-white hover:bg-white/10"
            disabled={safeIndex >= total - 1 || buffering}
            onClick={() => goTo(safeIndex + 1, playing)}
            aria-label="Next clip"
          >
            <SkipForward className="size-4" />
          </Button>
        </div>

        <Button
          type="button"
          variant="default"
          size="sm"
          className="h-8 gap-1.5 text-[11px] sm:shrink-0"
          disabled={exportPending || clipsPending || total === 0}
          onClick={() => void downloadAssemblyVideo()}
        >
          {exportPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="size-3.5" aria-hidden />
          )}
          {exportPending ? "Joining clips…" : "Download video"}
        </Button>
      </div>

      <p className="border-t border-white/10 bg-black/40 px-3 py-2 text-[10px] leading-snug text-muted-foreground">
        Preview plays block clips in order. Download joins all {total} clips into one
        MP4 (ffmpeg concat, narration included).
      </p>

      {clipError ? (
        <p role="alert" className="px-3 pt-1 text-[11px] text-destructive">
          {clipError}
        </p>
      ) : null}
      {exportError ? (
        <p role="alert" className="px-3 pb-2 text-[11px] text-destructive">
          {exportError}
        </p>
      ) : null}
    </div>
  );
}
