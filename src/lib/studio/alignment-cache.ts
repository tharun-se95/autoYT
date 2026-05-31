import "server-only";

import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

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
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

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

  // 3. Cache miss — Call local high-fidelity Python Aligner!
  console.log("[alignment-cache] Running local Python speech-pause aligner —", audioAbsPath);
  try {
    const pythonScriptPath = path.join(process.cwd(), "scripts", "local-aligner.py");
    const cmd = `python3 "${pythonScriptPath}" "${audioAbsPath}" ${visualBeats.length} ${totalAudioSec}`;
    const { stdout } = await execAsync(cmd);
    const beats = JSON.parse(stdout.trim()) as BeatAlignment[];

    // 4. Save sidecar to prevent re-running FFmpeg/python audits consecutively
    const sidecar: AlignmentSidecar = {
      version: SIDECAR_VERSION,
      audioMtimeMs,
      words: [], // No words needed for local RMS aligner
      beats,
    };
    await writeSidecar(sp, sidecar);

    return beats;
  } catch (e) {
    console.warn(
      "[alignment-cache] Local Python aligner failed, falling back to proportional:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}
