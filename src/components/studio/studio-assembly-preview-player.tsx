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
import {
  useAssemblyPlaylist,
  type AssemblyPlaylistClipItem,
  type AssemblyPlaylistGapItem,
  type AssemblyPlaylistItem,
} from "@/components/studio/use-assembly-playlist";
import {
  clearMotionClipPreloadCache,
  useMotionClipPreload,
} from "@/components/studio/use-motion-clip-preload";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function clipSrc(item: AssemblyPlaylistClipItem): string {
  return item.motionSrc;
}

function resolveSrc(src: string): string {
  if (typeof window === "undefined") return src;
  try {
    return new URL(src, window.location.origin).href;
  } catch {
    return src;
  }
}

function isClipReady(el: HTMLVideoElement, src: string): boolean {
  const resolved = resolveSrc(src);
  if (!el.src || el.src !== resolved) return false;
  return el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA;
}

export function StudioAssemblyPreviewPlayer({
  videoId,
  workingTitle,
}: {
  videoId: string;
  workingTitle: string;
}) {
  const {
    clipReadyCount,
    clipsVersion,
    clipsPending,
    runAllClips,
    exportPending,
    exportError,
    downloadAssemblyVideo,
    refreshStudioVisuals,
    refreshPending,
  } = useVisualsBatchGenerateContext();

  const { items, clipCount, loadError: playlistError, reload } =
    useAssemblyPlaylist(videoId, clipsVersion);

  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const narrationAudioRef = useRef<HTMLAudioElement>(null);
  const activeSlotRef = useRef<0 | 1>(0);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldAutoplayRef = useRef(false);
  const indexRef = useRef(0);

  const [index, setIndex] = useState(0);
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [clipError, setClipError] = useState<string | null>(null);

  const total = items.length;
  const safeIndex = total > 0 ? Math.min(index, total - 1) : 0;
  const current: AssemblyPlaylistItem | undefined =
    total > 0 ? items[safeIndex] : undefined;

  indexRef.current = safeIndex;
  useMotionClipPreload(items, safeIndex, clipsVersion);

  const videoRef = (slot: 0 | 1) =>
    slot === 0 ? videoARef : videoBRef;

  const clearGapTimer = useCallback(() => {
    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setIndex(0);
    indexRef.current = 0;
    activeSlotRef.current = 0;
    setActiveSlot(0);
    setPlaying(false);
    shouldAutoplayRef.current = false;
    setClipError(null);
    setBuffering(false);
    clearGapTimer();
    clearMotionClipPreloadCache();
    for (const ref of [videoARef, videoBRef]) {
      const el = ref.current;
      if (el) {
        el.pause();
        el.removeAttribute("src");
        el.load();
      }
    }
  }, [clipsVersion, total, clearGapTimer]);

  useEffect(() => {
    void reload();
  }, [clipsVersion, reload]);

  const goTo = useCallback(
    (nextIndex: number, keepPlaying: boolean) => {
      if (nextIndex < 0 || nextIndex >= total) return;
      clearGapTimer();
      shouldAutoplayRef.current = keepPlaying;
      indexRef.current = nextIndex;
      setIndex(nextIndex);
      if (!keepPlaying) setPlaying(false);
    },
    [total, clearGapTimer],
  );

  const advance = useCallback(
    (keepPlaying: boolean) => {
      const idx = indexRef.current;
      if (idx < total - 1) {
        goTo(idx + 1, keepPlaying);
      } else {
        setPlaying(false);
        shouldAutoplayRef.current = false;
      }
    },
    [total, goTo],
  );

  const swapToClip = useCallback(
    async (
      item: AssemblyPlaylistClipItem,
      autoplay: boolean,
      targetIndex: number,
    ) => {
      const src = resolveSrc(clipSrc(item));
      const inactive: 0 | 1 = activeSlotRef.current === 0 ? 1 : 0;
      const nextEl = videoRef(inactive).current;
      const prevEl = videoRef(activeSlotRef.current).current;
      if (!nextEl) return;

      const startPlayback = () => {
        if (indexRef.current !== targetIndex) return;
        prevEl?.pause();
        activeSlotRef.current = inactive;
        setActiveSlot(inactive);
        setBuffering(false);
        if (autoplay) {
          void nextEl
            .play()
            .then(() => {
              if (indexRef.current !== targetIndex) {
                nextEl.pause();
                return;
              }
              setPlaying(true);
            })
            .catch(() => {
              setPlaying(false);
              shouldAutoplayRef.current = false;
            });
        } else {
          nextEl.pause();
          setPlaying(false);
        }
      };

      if (isClipReady(nextEl, clipSrc(item))) {
        startPlayback();
        return;
      }

      setBuffering(true);

      try {
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            nextEl.removeEventListener("canplaythrough", onReady);
            nextEl.removeEventListener("error", onError);
            fn();
          };
          const onReady = () => finish(resolve);
          const onError = () =>
            finish(() => reject(new Error(`Load failed: ${item.label}`)));

          if (nextEl.src !== src) {
            nextEl.src = src;
            nextEl.load();
          } else {
            nextEl.load();
          }

          if (isClipReady(nextEl, clipSrc(item))) {
            finish(resolve);
            return;
          }

          nextEl.addEventListener("canplaythrough", onReady, { once: true });
          nextEl.addEventListener("error", onError, { once: true });
        });
        startPlayback();
      } catch (e) {
        if (indexRef.current !== targetIndex) return;
        setClipError(
          e instanceof Error
            ? e.message
            : `Could not load clip (${item.label}). Run Generate clips, then Refresh.`,
        );
        setPlaying(false);
        setBuffering(false);
        shouldAutoplayRef.current = false;
      }
    },
    [],
  );

  const playGapNarration = useCallback(
    async (
      item: AssemblyPlaylistGapItem,
      autoplay: boolean,
      targetIndex: number,
    ) => {
      const audio = narrationAudioRef.current;
      videoARef.current?.pause();
      videoBRef.current?.pause();
      if (!audio) return;

      setBuffering(false);
      setClipError(null);
      clearGapTimer();

      const stopAt = item.audioStartSec + item.durationSec;
      const src = resolveSrc(item.narrationSrc);

      const finishGap = () => {
        clearGapTimer();
        audio.pause();
        audio.removeEventListener("timeupdate", onTimeUpdate);
        audio.removeEventListener("ended", onEnded);
        if (indexRef.current === targetIndex) {
          advance(shouldAutoplayRef.current);
        }
      };

      const onTimeUpdate = () => {
        if (audio.currentTime >= stopAt - 0.04) {
          finishGap();
        }
      };

      const onEnded = () => finishGap();

      try {
        if (audio.src !== src) {
          audio.src = src;
          audio.load();
        }

        await new Promise<void>((resolve, reject) => {
          if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
            resolve();
            return;
          }
          const onReady = () => resolve();
          const onError = () => reject(new Error("Narration load failed"));
          audio.addEventListener("canplaythrough", onReady, { once: true });
          audio.addEventListener("error", onError, { once: true });
        });

        if (indexRef.current !== targetIndex) return;

        audio.currentTime = item.audioStartSec;
        if (!autoplay) {
          setPlaying(false);
          return;
        }

        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("ended", onEnded);
        await audio.play();
        setPlaying(true);

        gapTimerRef.current = setTimeout(
          finishGap,
          Math.max(100, item.durationSec * 1000 + 250),
        );
      } catch {
        if (indexRef.current !== targetIndex) return;
        if (autoplay) {
          gapTimerRef.current = setTimeout(
            finishGap,
            Math.max(50, item.durationSec * 1000),
          );
          setPlaying(true);
        }
      }
    },
    [advance, clearGapTimer],
  );

  useEffect(() => {
    clearGapTimer();
    narrationAudioRef.current?.pause();
    const item = items[safeIndex];
    if (!item) return;

    if (item.kind === "gap") {
      const autoplay = shouldAutoplayRef.current || playing;
      void playGapNarration(item, autoplay, safeIndex);
      return () => {
        clearGapTimer();
        narrationAudioRef.current?.pause();
      };
    }

    const autoplay = shouldAutoplayRef.current || playing;
    void swapToClip(item, autoplay, safeIndex);

    return () => {
      clearGapTimer();
      narrationAudioRef.current?.pause();
    };
  }, [safeIndex, items, swapToClip, playGapNarration, clearGapTimer]);

  useEffect(() => {
    const onEnded = (slot: 0 | 1) => () => {
      if (slot !== activeSlotRef.current) return;
      const item = items[indexRef.current];
      if (item?.kind !== "clip") return;
      advance(shouldAutoplayRef.current);
    };

    const a = videoARef.current;
    const b = videoBRef.current;
    const endA = onEnded(0);
    const endB = onEnded(1);
    a?.addEventListener("ended", endA);
    b?.addEventListener("ended", endB);
    return () => {
      a?.removeEventListener("ended", endA);
      b?.removeEventListener("ended", endB);
    };
  }, [items, advance]);

  const togglePlay = useCallback(() => {
    if (!current) return;

    if (current.kind === "gap") {
      const audio = narrationAudioRef.current;
      if (playing) {
        clearGapTimer();
        audio?.pause();
        setPlaying(false);
        shouldAutoplayRef.current = false;
      } else {
        shouldAutoplayRef.current = true;
        void playGapNarration(current, true, safeIndex);
      }
      return;
    }

    const el = videoRef(activeSlotRef.current).current;
    if (!el) return;

    if (playing) {
      el.pause();
      setPlaying(false);
      shouldAutoplayRef.current = false;
      return;
    }

    shouldAutoplayRef.current = true;
    if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      void el
        .play()
        .then(() => setPlaying(true))
        .catch(() => {
          setPlaying(false);
          shouldAutoplayRef.current = false;
        });
    } else {
      setBuffering(true);
      void swapToClip(current, true, safeIndex);
    }
  }, [playing, current, advance, clearGapTimer, swapToClip, safeIndex, playGapNarration]);

  if (clipCount === 0) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-black/70 p-6 text-center">
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Assembly preview needs matching [VIS] stills and narration clips. Use{" "}
          <span className="font-medium text-foreground">Generate stills</span> and
          Audio first, then{" "}
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

  const isGap = current?.kind === "gap";

  return (
    <div className="flex flex-col">
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <video
          ref={videoARef}
          className={cn(
            "absolute inset-0 size-full bg-black object-contain transition-opacity duration-150",
            activeSlot === 0 ? "z-10 opacity-100" : "z-0 opacity-0",
          )}
          playsInline
          preload="auto"
          muted={false}
          aria-hidden={activeSlot !== 0}
        />
        <video
          ref={videoBRef}
          className={cn(
            "absolute inset-0 size-full bg-black object-contain transition-opacity duration-150",
            activeSlot === 1 ? "z-10 opacity-100" : "z-0 opacity-0",
          )}
          playsInline
          preload="auto"
          muted={false}
          aria-hidden={activeSlot !== 1}
        />

        {isGap && current.kind === "gap" ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.stillPreviewSrc}
              alt=""
              className="absolute inset-0 z-[15] size-full bg-black object-contain"
            />
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/45 px-6 text-center">
              <p className="text-[11px] font-medium uppercase tracking-wide text-white/60">
                Block narration · before first visual beat
              </p>
              <p className="mt-1 text-sm text-white/90">{current.label}</p>
            </div>
          </>
        ) : null}

        <audio ref={narrationAudioRef} className="sr-only" preload="auto" />

        {buffering ? (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/25">
            <Loader2 className="size-7 animate-spin text-white/70" aria-hidden />
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-black/80 to-transparent px-3 pb-8 pt-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/70">
            Pre-export assembly
          </p>
          <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-white">
            {workingTitle}
          </p>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-3 pt-10">
          <p className="text-[11px] font-medium text-white">
            {current?.label}
            <span className="text-white/60">
              {" "}
              · {safeIndex + 1} / {total}
              {isGap ? " · lead-in" : ""}
            </span>
          </p>
          {current?.kind === "clip" && current.phrase ? (
            <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-white/75">
              {current.phrase}
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
            disabled={safeIndex <= 0}
            onClick={() => goTo(safeIndex - 1, playing)}
            aria-label="Previous segment"
          >
            <SkipBack className="size-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-9 shrink-0"
            onClick={togglePlay}
            aria-label={playing ? "Pause assembly preview" : "Play assembly preview"}
          >
            {buffering && !isGap ? (
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
            disabled={safeIndex >= total - 1}
            onClick={() => goTo(safeIndex + 1, playing)}
            aria-label="Next segment"
          >
            <SkipForward className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-1 h-8 text-[10px] text-white/90"
            disabled={refreshPending || clipsPending}
            onClick={() => void refreshStudioVisuals()}
          >
            {refreshPending ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        <Button
          type="button"
          variant="default"
          size="sm"
          className="h-8 gap-1.5 text-[11px] sm:shrink-0"
          disabled={exportPending || clipsPending || clipCount === 0}
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
        Each block plays narration from the start (including speech before the first
        visual phrase), then switches to phrase-timed Ken Burns clips.
      </p>

      {playlistError ? (
        <p role="alert" className="px-3 pt-1 text-[11px] text-destructive">
          {playlistError}
        </p>
      ) : null}
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
