import "server-only";

import type { ScriptActId } from "@/lib/script-writer/types";

/**
 * Ken Burns motion presets — subtle zoom only.
 * Pan presets removed: they caused visible edge-clipping on tightly-framed stills.
 * Max zoom capped at 1.08 (8%) — imperceptible crop, smooth cinematic drift.
 */
export type KenBurnsPreset =
  | "zoom_in"
  | "zoom_out";

const PRESET_CYCLE: readonly KenBurnsPreset[] = [
  "zoom_in",
  "zoom_out",
];

const ACT_ORDER: readonly ScriptActId[] = [
  "mess",
  "deep_dive",
  "mirror",
  "way_forward",
];

export function kenBurnsPresetForBeatIndex(index: number): KenBurnsPreset {
  const i =
    ((index % PRESET_CYCLE.length) + PRESET_CYCLE.length) % PRESET_CYCLE.length;
  return PRESET_CYCLE[i]!;
}

/**
 * One clip per narration block: alternate zoom_in / zoom_out so adjacent beats contrast.
 */
export function kenBurnsPresetForStudioBlock(
  actId: ScriptActId,
  blockIndex: number,
): KenBurnsPreset {
  const actI = Math.max(0, ACT_ORDER.indexOf(actId));
  const flat = actI * 512 + blockIndex;
  return kenBurnsPresetForBeatIndex(flat);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Subtle zoompan filter — max zoom 1.08 (8%), step 0.0005/frame.
 * `scale=iw*2` oversample prevents pixelation at the zoomed edge.
 * Always centred: x/y anchored at `iw/2-(iw/zoom/2)`.
 *
 * At 24fps for a 4-second beat (96 frames):
 *   zoom_in:  1.000 → 1.048  (barely visible drift inward)
 *   zoom_out: 1.080 → 1.032  (barely visible drift outward)
 */
export function buildKenBurnsZoomPanFilter(
  preset: KenBurnsPreset,
  width: number,
  height: number,
  totalFrames: number,
  fps: number,
): string {
  const FN = Math.max(15, Math.round(totalFrames));
  const W = Math.max(320, Math.round(width));
  const H = Math.max(320, Math.round(height));
  const F = Math.max(12, Math.round(fps));

  const tail = `d=${FN}:s=${W}x${H}:fps=${F}`;
  // Centre anchor — same for both presets, no panning
  const centre = `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;

  switch (preset) {
    case "zoom_out":
      // Start at 1.08, drift slowly back toward 1.0 — never below 1.0
      return `scale=iw*2:ih*2:flags=lanczos,zoompan=z='if(eq(on,1),1.08,max(zoom-0.0005,1))':${centre}:${tail}`;
    case "zoom_in":
    default:
      // Start at 1.0, drift slowly up to 1.08 — never above 1.08
      return `scale=iw*2:ih*2:flags=lanczos,zoompan=z='if(eq(on,1),1,min(zoom+0.0005,1.08))':${centre}:${tail}`;
  }
}

/** Duration → frame count for one block clip (ceil so mux is not shorter than VO). */
export function motionTotalFrames(durationSec: number, fps: number): number {
  const d = clamp(durationSec, 0.4, 120);
  const f = Math.max(12, Math.ceil(d * fps - 1e-9));
  return Math.max(15, f);
}

export function resolveFfmpegBinary(): string {
  return (process.env.FFMPEG_PATH ?? "ffmpeg").trim() || "ffmpeg";
}

export function resolveFfprobeBinary(): string {
  return (process.env.FFPROBE_PATH ?? "ffprobe").trim() || "ffprobe";
}
