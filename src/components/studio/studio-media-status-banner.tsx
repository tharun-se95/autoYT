"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type MediaStatus = {
  ok: boolean;
  localAssetsConfigured: boolean;
  supabaseConfigured: boolean;
  ffmpegAvailable?: boolean;
  ffprobeAvailable?: boolean;
  motionClipsReady?: boolean;
};

export function StudioMediaStatusBanner() {
  const pathname = usePathname();
  const [status, setStatus] = useState<MediaStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    void (async () => {
      try {
        const r = await fetch("/api/studio/media-status");
        const data = (await r.json()) as MediaStatus & { error?: string };
        if (cancelled) return;
        if (!r.ok || !data.ok) {
          setStatus(null);
          setLoadError(
            typeof data.error === "string" ? data.error : `Status failed (${r.status}).`,
          );
          return;
        }
        setStatus({
          ok: data.ok,
          localAssetsConfigured: Boolean(data.localAssetsConfigured),
          supabaseConfigured: Boolean(data.supabaseConfigured),
          ffmpegAvailable: Boolean(data.ffmpegAvailable),
          ffprobeAvailable: Boolean(data.ffprobeAvailable),
          motionClipsReady: Boolean(data.motionClipsReady),
        });
      } catch (e) {
        if (!cancelled) {
          setStatus(null);
          setLoadError(e instanceof Error ? e.message : "Could not load status.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (loadError) {
    return (
      <p
        role="status"
        className="mb-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-[10px] text-destructive leading-snug"
      >
        {loadError}
      </p>
    );
  }

  if (!status) return null;

  const allGood =
    status.localAssetsConfigured &&
    status.supabaseConfigured &&
    status.motionClipsReady !== false;
  /** Healthy setups stay quiet — only surface gaps or risks. */
  if (allGood) return null;

  const partial =
    status.localAssetsConfigured ||
    status.supabaseConfigured ||
    status.ffmpegAvailable;

  return (
    <p
      role="status"
      className={cn(
        "mb-3 rounded-md border px-2.5 py-1.5 text-[10px] leading-snug",
        partial
          ? "border-amber-500/25 bg-amber-500/10 text-amber-100/90"
          : "border-amber-500/30 bg-amber-500/[0.08] text-amber-100/85",
      )}
    >
      {!status.localAssetsConfigured ? (
        <span>Local assets path not detected. </span>
      ) : null}
      {!status.supabaseConfigured ? (
        <span>Supabase service client not configured. </span>
      ) : null}
      {status.localAssetsConfigured && !status.ffmpegAvailable ? (
        <span>ffmpeg not found (install or set FFMPEG_PATH). </span>
      ) : null}
      {status.localAssetsConfigured &&
      status.ffmpegAvailable &&
      !status.ffprobeAvailable ? (
        <span>ffprobe not found (set FFPROBE_PATH). </span>
      ) : null}
      Disk-only mode may limit reloads. Setup:{" "}
      <Link
        href="/studio"
        className="font-medium underline underline-offset-2 hover:text-foreground"
      >
        Studio home
      </Link>{" "}
      ·{" "}
      <code className="rounded bg-black/25 px-0.5 text-[9px]">
        src/prompts/README.md
      </code>
    </p>
  );
}
