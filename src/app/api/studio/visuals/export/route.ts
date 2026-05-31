import { NextResponse } from "next/server";

import { getLocalAssetsRoot } from "@/lib/assets/local-asset-store";
import {
  checkFfmpegAvailable,
  checkFfprobeAvailable,
} from "@/lib/studio/ffmpeg-vis-motion";
import { exportAssemblyVideoForEpisode } from "@/lib/studio/export-assembly-video";

type ExportBody = {
  videoId?: string;
  workingTitle?: string;
  force?: boolean;
};

function sanitizeDownloadFilename(title: string): string {
  const base = title
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return base.length > 0 ? `${base}-assembly.mp4` : "autoYT-assembly.mp4";
}

export async function POST(request: Request) {
  let body: ExportBody;
  try {
    body = (await request.json()) as ExportBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const videoId = body.videoId?.trim();
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
      {
        ok: false,
        error:
          "ffmpeg/ffprobe is not available. Install ffmpeg or set FFMPEG_PATH and FFPROBE_PATH in .env.local.",
      },
      { status: 503 },
    );
  }

  const result = await exportAssemblyVideoForEpisode({
    videoId,
    force: Boolean(body.force),
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.error.includes("No blocks") ? 404 : 500 },
    );
  }

  const filename = sanitizeDownloadFilename(body.workingTitle ?? "");
  const downloadUrl = `/api/studio/visuals/export/file?videoId=${encodeURIComponent(videoId)}&filename=${encodeURIComponent(filename)}`;

  return NextResponse.json({
    ok: true,
    videoId,
    clipCount: result.clipCount,
    cached: result.cached,
    relativePath: result.relativePath,
    downloadUrl,
    filename,
  });
}
