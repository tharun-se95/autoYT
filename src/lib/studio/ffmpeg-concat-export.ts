import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { runFfmpegCmd } from "@/lib/studio/ffmpeg-vis-motion";
import { resolveFfmpegBinary } from "@/lib/studio/ken-burns-zoompan";

function escapeConcatPath(absPath: string): string {
  return absPath.replace(/'/g, "'\\''");
}

/**
 * Joins MP4 clips in order via ffmpeg concat demuxer.
 * Tries stream copy first; re-encodes if codecs/timestamps differ.
 */
export async function concatMp4ClipsToFile(params: {
  inputAbsolutePaths: string[];
  outputAbsolutePath: string;
  workDirAbsolutePath: string;
}): Promise<void> {
  const { inputAbsolutePaths, outputAbsolutePath, workDirAbsolutePath } = params;
  if (inputAbsolutePaths.length === 0) {
    throw new Error("No clips to concatenate.");
  }

  await fs.mkdir(workDirAbsolutePath, { recursive: true });
  await fs.mkdir(path.dirname(outputAbsolutePath), { recursive: true });

  const listPath = path.join(workDirAbsolutePath, `concat-${Date.now()}.txt`);
  const listBody = inputAbsolutePaths
    .map((p) => `file '${escapeConcatPath(p)}'`)
    .join("\n");
  await fs.writeFile(listPath, listBody, "utf8");

  const ffmpeg = resolveFfmpegBinary();
  const tmpOut = `${outputAbsolutePath}.tmp-${Date.now()}.mp4`;

  const copyArgs = [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    tmpOut,
  ];

  let { code, stderr } = await runFfmpegCmd(ffmpeg, copyArgs);

  if (code !== 0) {
    try {
      await fs.unlink(tmpOut);
    } catch {
      // ignore
    }
    const reencodeArgs = [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
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
      tmpOut,
    ];
    const retry = await runFfmpegCmd(ffmpeg, reencodeArgs);
    code = retry.code;
    stderr = retry.stderr;
  }

  try {
    await fs.unlink(listPath);
  } catch {
    // ignore
  }

  if (code !== 0) {
    try {
      await fs.unlink(tmpOut);
    } catch {
      // ignore
    }
    throw new Error(stderr.trim() || `ffmpeg concat exited with code ${code}`);
  }

  await fs.rename(tmpOut, outputAbsolutePath);
}
