"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ListedNarrationSegment } from "@/lib/studio/narration-segment-types";
import type { ListedVisStill } from "@/lib/studio/vis-still-types";
import { motionPreviewUrl } from "@/lib/studio/motion-preview-url";
import { cn } from "@/lib/utils";

type VisQueueMotionPreviewProps = {
  videoId: string;
  actId: string;
  /** Motion storage index (baseBlock×100+beat) passed to the motion API. */
  motionStorageIndex: number;
  /** Display-only block number in UI. */
  baseBlockIndex?: number;
  still: ListedVisStill | undefined;
  segment: ListedNarrationSegment | undefined;
  short: boolean;
  /** Bumped after batch clip render so previews reload cached MP4s. */
  clipsVersion?: number;
  className?: string;
};

export function VisQueueMotionPreview({
  videoId,
  actId,
  motionStorageIndex,
  baseBlockIndex,
  still,
  segment,
  short,
  clipsVersion = 0,
  className,
}: VisQueueMotionPreviewProps) {
  const blockLabel = (baseBlockIndex ?? Math.floor(motionStorageIndex / 100)) + 1;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [motionFailed, setMotionFailed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const poster = still
    ? `${still.fileUrl}&v=${encodeURIComponent(still.updatedAt)}`
    : undefined;

  const motionSrc = useMemo(() => {
    if (!still || !segment) return null;
    return motionPreviewUrl({
      videoId,
      actId,
      motionStorageIndex,
      stillUpdatedAt: still.updatedAt,
      segmentUpdatedAt: segment.updatedAt,
      clipsVersion,
    });
  }, [videoId, actId, motionStorageIndex, still, segment, clipsVersion]);

  useEffect(() => {
    setMotionFailed(false);
    setIsPlaying(false);
  }, [motionSrc]);

  const tryPlay = useCallback((el: HTMLVideoElement) => {
    void el.play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        // Autoplay can be blocked until gesture; keep video mounted for manual hover play.
      });
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !motionSrc || motionFailed) return;

    const onCanPlay = () => tryPlay(el);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (visible) {
          if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            tryPlay(el);
          } else {
            el.addEventListener("canplay", onCanPlay, { once: true });
          }
        } else {
          el.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.15, rootMargin: "48px 0px" },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      el.removeEventListener("canplay", onCanPlay);
    };
  }, [motionSrc, motionFailed, tryPlay]);

  const frameClass = cn(
    "relative aspect-video w-full max-w-[9.5rem] shrink-0 overflow-hidden rounded-md border border-white/10 bg-black object-cover sm:max-w-[10rem]",
    short && "border-amber-500/45",
    className,
  );

  if (!still) {
    return (
      <div
        className={cn(
          frameClass,
          "flex items-center justify-center border-dashed bg-black/30 text-[9px] text-muted-foreground",
        )}
      >
        No still
      </div>
    );
  }

  if (!segment || motionFailed) {
    return (
      <div className={cn(frameClass, "group")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- same-origin API URL */}
        <img src={poster} alt="" className="size-full object-cover" />
        {motionFailed && segment ? (
          <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-center text-[8px] text-amber-200/90">
            Clip unavailable
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(frameClass, "group cursor-pointer")}
      onClick={() => {
        const el = videoRef.current;
        if (el) tryPlay(el);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const el = videoRef.current;
          if (el) tryPlay(el);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Play motion preview for block ${blockLabel}`}
    >
      <video
        ref={videoRef}
        className="size-full object-cover"
        src={motionSrc ?? undefined}
        poster={poster}
        muted
        playsInline
        autoPlay
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => {
          setMotionFailed(true);
          setIsPlaying(false);
        }}
        aria-label={`Motion preview for block ${blockLabel}`}
      />
      {!isPlaying ? (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        >
          <span className="rounded-full bg-black/60 px-1.5 py-0.5 text-[8px] font-medium text-white/90">
            ▶
          </span>
        </span>
      ) : null}
    </div>
  );
}
