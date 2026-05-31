import "server-only";

import type { ScriptActId } from "@/lib/script-writer/types";

/**
 * Ken Burns motion presets — subtle zoom only.
 * Pan presets removed: they caused visible edge-clipping on tightly-framed stills.
 * Capped at 1.03 (3%) — extremely subtle, high-end cinematic drift.
 */
export type KenBurnsPreset =
  | "zoom_in"
  | "zoom_out";

const PRESET_CYCLE: readonly KenBurnsPreset[] = [
  "zoom_in",
  "zoom_out",
];

export function kenBurnsPresetForBeatIndex(index: number): KenBurnsPreset {
  const i = ((index % PRESET_CYCLE.length) + PRESET_CYCLE.length) % PRESET_CYCLE.length;
  return PRESET_CYCLE[i]!;
}

export function kenBurnsPresetForStudioBlock(
  actId: ScriptActId,
  blockIndex: number,
): KenBurnsPreset {
  // Simple deterministic hash of actId string to replace rigid index
  let actI = 0;
  for (let j = 0; j < actId.length; j++) {
    actI = (actI * 31 + actId.charCodeAt(j)) % 1000;
  }
  const flat = actI * 512 + blockIndex;
  return kenBurnsPresetForBeatIndex(flat);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Subtle zoompan filter — max zoom 1.03 (3%), smooth linear interpolation.
 * scale=3840:2160 provides sub-pixel accuracy to completely prevent coordinates jitter.
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

  // Supersample the input still to a high-resolution 4K canvas (3840x2160) to provide sub-pixel precision
  const SS_W = 3840;
  const SS_H = 2160;

  const tail = `d=${FN}:s=${SS_W}x${SS_H}:fps=${F}`;
  // Center coordinates on the 4K supersampled canvas
  const centre = `x='(iw-ow)/2':y='(ih-oh)/2'`;

  let zExpression = "";
  if (preset === "zoom_out") {
    zExpression = `1.03-0.03*on/${FN}`;
  } else {
    zExpression = `1.0+0.03*on/${FN}`;
  }

  // High-resolution zoompan, then downscale back to target (W x H) to average out sub-pixel jitter
  return `scale=${SS_W}:${SS_H}:flags=lanczos,zoompan=z='${zExpression}':${centre}:${tail},scale=${W}:${H}:flags=lanczos`;
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
