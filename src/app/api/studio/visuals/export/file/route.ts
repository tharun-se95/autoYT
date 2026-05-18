import { NextResponse } from "next/server";

import {
  getLocalAssetsRoot,
  resolveVisAssemblyExportAbsolutePath,
  visAssemblyExportRelativePath,
} from "@/lib/assets/local-asset-store";
import { exportAssemblyVideoForEpisode } from "@/lib/studio/export-assembly-video";
import {
  checkFfmpegAvailable,
  checkFfprobeAvailable,
  streamMp4FileWithDisposition,
} from "@/lib/studio/ffmpeg-vis-motion";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId")?.trim();
  const filenameRaw = searchParams.get("filename")?.trim();

  if (!videoId) {
    return NextResponse.json({ ok: false, error: "Missing videoId." }, { status: 400 });
  }

  if (!getLocalAssetsRoot()) {
    return NextResponse.json(
      { ok: false, error: "Local assets root not configured." },
      { status: 503 },
    );
  }

  const [ffmpegOk, ffprobeOk] = await Promise.all([
    checkFfmpegAvailable(),
    checkFfprobeAvailable(),
  ]);
  if (!ffmpegOk || !ffprobeOk) {
    return NextResponse.json(
      { ok: false, error: "ffmpeg/ffprobe is not available." },
      { status: 503 },
    );
  }

  const exportRel = visAssemblyExportRelativePath(videoId);
  let exportAbs: string;
  try {
    exportAbs = resolveVisAssemblyExportAbsolutePath(exportRel);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  try {
    await import("node:fs/promises").then((fs) => fs.access(exportAbs));
  } catch {
    const built = await exportAssemblyVideoForEpisode({ videoId });
    if (!built.ok) {
      return NextResponse.json(
        { ok: false, error: built.error },
        { status: 404 },
      );
    }
    exportAbs = built.absolutePath;
  }

  const filename =
    filenameRaw && filenameRaw.endsWith(".mp4")
      ? filenameRaw
      : filenameRaw
        ? `${filenameRaw}.mp4`
        : "upgrade-life-assembly.mp4";

  try {
    return await streamMp4FileWithDisposition(exportAbs, {
      inline: false,
      filename,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 },
    );
  }
}
