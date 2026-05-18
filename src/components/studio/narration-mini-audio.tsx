"use client";

import { Pause, Play } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type NarrationMiniAudioProps = {
  src: string;
  className?: string;
};

/**
 * Dark-themed narration clip control (hidden native audio + play + scrub bar).
 * Native `<audio controls>` is not themeable enough for the studio shell.
 */
export function NarrationMiniAudio({ src, className }: NarrationMiniAudioProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    el.src = src;
    void el.load();
  }, [src]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrent(el.currentTime);
    const syncDur = () => {
      const d = el.duration;
      if (Number.isFinite(d) && d > 0) setDuration(d);
    };
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("durationchange", syncDur);
    el.addEventListener("loadedmetadata", syncDur);
    el.addEventListener("ended", onEnded);

    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("durationchange", syncDur);
      el.removeEventListener("loadedmetadata", syncDur);
      el.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else void el.play().catch(() => setPlaying(false));
  }, [playing]);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const tr = trackRef.current;
      const el = audioRef.current;
      if (!tr || !el || duration <= 0) return;
      const rect = tr.getBoundingClientRect();
      const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
      el.currentTime = (x / rect.width) * duration;
      setCurrent(el.currentTime);
    },
    [duration],
  );

  const onTrackClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    seekFromClientX(e.clientX);
  };

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <audio ref={audioRef} preload="metadata" className="sr-only" aria-hidden />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 rounded-full bg-primary/15 text-primary hover:bg-primary/25 hover:text-primary"
        onClick={() => void toggle()}
        aria-label={playing ? "Pause narration clip" : "Play narration clip"}
      >
        {playing ? (
          <Pause className="size-4" aria-hidden />
        ) : (
          <Play className="size-4 pl-0.5" aria-hidden />
        )}
      </Button>
      <div className="min-w-0 flex-1">
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek narration"
          aria-valuenow={Math.round(current)}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration || 0)}
          className="group relative h-2 w-full cursor-pointer rounded-full bg-white/10 outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-primary/50"
          onClick={onTrackClick}
          onKeyDown={(e) => {
            if (!duration) return;
            const el = audioRef.current;
            if (!el) return;
            const step = Math.max(2, duration * 0.03);
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              el.currentTime = Math.max(0, el.currentTime - step);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              el.currentTime = Math.min(duration, el.currentTime + step);
            }
          }}
        >
          <div
            className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-primary/70 transition-[width] duration-150 ease-out group-hover:bg-primary"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between gap-2 font-mono text-[9px] tabular-nums text-muted-foreground">
          <span>{formatTime(current)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
