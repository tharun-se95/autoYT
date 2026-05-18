import "server-only";

import type { ScriptActId } from "@/lib/script-writer/types";

/**
 * Ken Burns motion presets (same vocabulary as the YouTube video generator web app).
 * Each maps to a tuned `zoompan` chain: oversample still, animate, crop to WxH.
 */
export type KenBurnsPreset =
  | "zoom_in"
  | "zoom_out"
  | "pan_left"
  | "pan_right";

const PRESET_CYCLE: readonly KenBurnsPreset[] = [
  "zoom_in",
  "zoom_out",
  "pan_left",
  "pan_right",
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
 * One clip per narration block: rotate presets by act + block so neighbors differ.
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
 * `zoompan` chain: oversample still, animate zoom/pan for `totalFrames`, crop to `s=WxH`.
 * Tuned for subtle motion (matches `web/src/lib/ken-burns-ffmpeg.ts`).
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

  switch (preset) {
    case "zoom_out":
      return `scale=iw*4:ih*4:flags=lanczos,zoompan=z='if(eq(on,1),1.35,max(zoom-0.0016,1))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':${tail}`;
    case "pan_left":
      return `scale=iw*3:ih*3:flags=lanczos,zoompan=z='1.08':x='min(max(iw/zoom-on*((iw-iw/zoom)/${FN}),0),iw-iw/zoom)':y='ih/2-(ih/zoom/2)':${tail}`;
    case "pan_right":
      return `scale=iw*3:ih*3:flags=lanczos,zoompan=z='1.08':x='min(max(iw-iw/zoom-on*((iw-iw/zoom)/${FN}),0),iw-iw/zoom)':y='ih/2-(ih/zoom/2)':${tail}`;
    case "zoom_in":
    default:
      return `scale=iw*4:ih*4:flags=lanczos,zoompan=z='if(eq(on,1),1,min(zoom+0.0016,1.35))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':${tail}`;
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
