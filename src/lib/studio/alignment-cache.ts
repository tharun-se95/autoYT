import "server-only";

import { readFile, stat, writeFile } from "node:fs/promises";

import type { VisualBeat } from "@/lib/script-writer/types";
import {
  alignBeatsToWords,
  transcribeWordTimestamps,
} from "@/lib/studio/audio-alignment";
import type { AlignmentSidecar, BeatAlignment } from "@/lib/studio/audio-alignment-types";

const SIDECAR_VERSION = 1 as const;

function sidecarPath(audioAbsPath: string): string {
  return audioAbsPath + ".alignment.json";
}

export async function readCachedAlignmentBeats(
  audioAbsPath: string,
): Promise<BeatAlignment[] | null> {
  const sp = sidecarPath(audioAbsPath);
  let audioMtimeMs: number;
  try {
    audioMtimeMs = (await stat(audioAbsPath)).mtimeMs;
  } catch {
    return null;
  }
  const cached = await readSidecar(sp);
  if (!cached || cached.audioMtimeMs !== audioMtimeMs) return null;
  return cached.beats;
}

async function readSidecar(path: string): Promise<AlignmentSidecar | null> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as AlignmentSidecar;
    if (parsed?.version !== SIDECAR_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeSidecar(
  path: string,
  sidecar: AlignmentSidecar,
): Promise<void> {
  try {
    await writeFile(path, JSON.stringify(sidecar, null, 2), "utf8");
  } catch (e) {
    // Best-effort — a failed write just means next render will re-transcribe
    console.warn("[alignment-cache] Failed to write sidecar:", e);
  }
}

/**
 * Loads or builds the forced-alignment data for an audio block.
 *
 * - **Cache hit**: sidecar exists and audio hasn't changed → returns cached beats instantly.
 * - **Cache miss / stale**: calls ElevenLabs Scribe v2 → aligns beats → saves sidecar.
 * - **Failure**: returns `null` so the caller silently falls back to Tier 2 proportional timing.
 */
export async function loadOrBuildAlignment(params: {
  audioAbsPath: string;
  visualBeats: VisualBeat[];
  totalAudioSec: number;
}): Promise<BeatAlignment[] | null> {
  const { audioAbsPath, visualBeats, totalAudioSec } = params;

  if (visualBeats.length === 0) return null;

  const sp = sidecarPath(audioAbsPath);

  // 1. Get audio mtime for cache validation
  let audioMtimeMs: number;
  try {
    audioMtimeMs = (await stat(audioAbsPath)).mtimeMs;
  } catch {
    return null; // audio file doesn't exist yet
  }

  // 2. Try cache hit
  const cached = await readSidecar(sp);
  if (cached && cached.audioMtimeMs === audioMtimeMs) {
    console.log("[alignment-cache] Cache hit —", audioAbsPath);
    return cached.beats;
  }

  // 3. Cache miss — call Scribe v2
  console.log("[alignment-cache] Transcribing via ElevenLabs Scribe v2 —", audioAbsPath);
  let words;
  try {
    words = await transcribeWordTimestamps(audioAbsPath);
  } catch (e) {
    console.warn(
      "[alignment-cache] Scribe v2 failed, falling back to Tier 2:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }

  // 4. Align beats to transcript
  const beats = alignBeatsToWords(words, visualBeats, totalAudioSec);

  // 5. Persist sidecar
  const sidecar: AlignmentSidecar = {
    version: SIDECAR_VERSION,
    audioMtimeMs,
    words,
    beats,
  };
  await writeSidecar(sp, sidecar);

  return beats;
}
