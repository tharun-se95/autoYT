import "server-only";

import { spawn } from "node:child_process";
import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

import type { KenBurnsPreset } from "@/lib/studio/ken-burns-zoompan";
import {
  buildKenBurnsZoomPanFilter,
  motionTotalFrames,
  resolveFfmpegBinary,
  resolveFfprobeBinary,
} from "@/lib/studio/ken-burns-zoompan";

const DEFAULT_FPS = 24;
const OUT_W = 1920;
const OUT_H = 1080;

export function runFfmpegCmd(
  bin: string,
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (c) => {
      stdout += String(c);
    });
    child.stderr?.on("data", (c) => {
      stderr += String(c);
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

export async function probeAudioDurationSeconds(
  audioAbsolutePath: string,
): Promise<number | null> {
  const ffprobe = resolveFfprobeBinary();
  const { code, stdout, stderr } = await runFfmpegCmd(ffprobe, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    audioAbsolutePath,
  ]);
  if (code !== 0) return null;
  const raw = stdout.trim() || stderr.trim();
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function checkFfmpegAvailable(): Promise<boolean> {
  const ffmpeg = resolveFfmpegBinary();
  const { code } = await runFfmpegCmd(ffmpeg, ["-version"]);
  return code === 0;
}

export async function checkFfprobeAvailable(): Promise<boolean> {
  const ffprobe = resolveFfprobeBinary();
  const { code } = await runFfmpegCmd(ffprobe, ["-version"]);
  return code === 0;
}

export async function getFfmpegRuntimeStatus(): Promise<{
  ffmpegAvailable: boolean;
  ffprobeAvailable: boolean;
  ffmpegPath: string;
  ffprobePath: string;
}> {
  const [ffmpegAvailable, ffprobeAvailable] = await Promise.all([
    checkFfmpegAvailable(),
    checkFfprobeAvailable(),
  ]);
  return {
    ffmpegAvailable,
    ffprobeAvailable,
    ffmpegPath: resolveFfmpegBinary(),
    ffprobePath: resolveFfprobeBinary(),
  };
}

/**
 * Renders one MP4 per block: still + Ken Burns (`zoompan` + lanczos) + narration audio.
 * Frame count matches audio duration at `fps` (one clip per block).
 */
export async function renderVisMotionMp4(params: {
  imageAbsolutePath: string;
  audioAbsolutePath: string;
  outputAbsolutePath: string;
  durationSec: number;
  preset: KenBurnsPreset;
  fps?: number;
}): Promise<void> {
  const {
    imageAbsolutePath,
    audioAbsolutePath,
    outputAbsolutePath,
    durationSec,
    preset,
    fps = DEFAULT_FPS,
  } = params;

  const totalFrames = motionTotalFrames(durationSec, fps);
  const vf = buildKenBurnsZoomPanFilter(
    preset,
    OUT_W,
    OUT_H,
    totalFrames,
    fps,
  );

  const ffmpeg = resolveFfmpegBinary();
  const tmpOut = `${outputAbsolutePath}.tmp-${Date.now()}.mp4`;

  const args = [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-loop",
    "1",
    "-framerate",
    String(fps),
    "-i",
    imageAbsolutePath,
    "-i",
    audioAbsolutePath,
    "-vf",
    vf,
    "-frames:v",
    String(totalFrames),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "22",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    "-shortest",
    tmpOut,
  ];

  const { code, stderr } = await runFfmpegCmd(ffmpeg, args);
  if (code !== 0) {
    try {
      await fs.unlink(tmpOut);
    } catch {
      // ignore
    }
    const msg = stderr.trim() || `ffmpeg exited with code ${code}`;
    throw new Error(msg);
  }

  await fs.mkdir(path.dirname(outputAbsolutePath), { recursive: true });
  await fs.rename(tmpOut, outputAbsolutePath);
}

export async function streamMp4File(absolutePath: string): Promise<Response> {
  return streamMp4FileWithDisposition(absolutePath, { inline: true });
}

export async function streamMp4FileWithDisposition(
  absolutePath: string,
  opts: { inline: boolean; filename?: string },
): Promise<Response> {
  const st = await fs.stat(absolutePath);
  const nodeStream = createReadStream(absolutePath);
  const body = Readable.toWeb(nodeStream);
  const filename = opts.filename ?? "assembly.mp4";
  const disposition = opts.inline
    ? "inline"
    : `attachment; filename="${filename.replace(/"/g, "")}"`;
  return new Response(body as unknown as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(st.size),
      "Accept-Ranges": "bytes",
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=120",
    },
  });
}
