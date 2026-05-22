"use client";

import { useEffect } from "react";

import type { AssemblyPlaylistItem } from "@/components/studio/use-assembly-playlist";

const warmed = new Map<string, Promise<void>>();

function warmClip(src: string): Promise<void> {
  const hit = warmed.get(src);
  if (hit) return hit;

  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement("video");
    el.preload = "auto";
    el.muted = true;
    el.playsInline = true;

    const cleanup = () => {
      el.removeAttribute("src");
      el.load();
      el.remove();
    };

    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Preload failed: ${src}`));
    };

    el.addEventListener("canplaythrough", onReady, { once: true });
    el.addEventListener("error", onError, { once: true });
    el.src = src;
    el.load();
  }).catch(() => {
    warmed.delete(src);
  });

  warmed.set(src, promise);
  return promise;
}

export function clearMotionClipPreloadCache(): void {
  warmed.clear();
}

/** Warm the next few clip URLs so the assembly player can swap without a blank frame. */
export function useMotionClipPreload(
  items: AssemblyPlaylistItem[],
  focusIndex: number,
  clipsVersion: number,
): void {
  useEffect(() => {
    clearMotionClipPreloadCache();
  }, [clipsVersion]);

  useEffect(() => {
    const upcoming: string[] = [];
    for (let i = focusIndex; i < items.length && upcoming.length < 4; i++) {
      const it = items[i];
      if (it?.kind === "clip") upcoming.push(it.motionSrc);
    }
    for (const src of upcoming) {
      void warmClip(src);
    }
  }, [items, focusIndex, clipsVersion]);
}
