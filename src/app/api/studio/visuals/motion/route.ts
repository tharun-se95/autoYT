import { NextResponse } from "next/server";

import {
  getLocalAssetsRoot,
  resolveVisMotionAbsolutePath,
} from "@/lib/assets/local-asset-store";
import {
  checkFfmpegAvailable,
  checkFfprobeAvailable,
  streamMp4File,
} from "@/lib/studio/ffmpeg-vis-motion";
import { renderVisMotionBlock } from "@/lib/studio/render-vis-motion-block";
import { listNarrationSegmentsForVideo } from "@/lib/studio-db/persist-narration-segment";
import { listVisStillsForVideo } from "@/lib/studio-db/persist-vis-still";
import type { ScriptActId } from "@/lib/script-writer/types";

const ACT_IDS: readonly ScriptActId[] = [
  "mess",
  "deep_dive",
  "mirror",
  "way_forward",
];

function isActId(s: string): s is ScriptActId {
  return (ACT_IDS as readonly string[]).includes(s);
}

function ffmpegUnavailableResponse() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "ffmpeg/ffprobe is not available. Install ffmpeg (includes ffprobe) or set FFMPEG_PATH and FFPROBE_PATH in .env.local.",
    },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId")?.trim();
  const actIdRaw = searchParams.get("actId")?.trim();
  const blockRaw = searchParams.get("blockIndex")?.trim();

  if (!videoId || !actIdRaw || blockRaw === undefined || blockRaw === "") {
    return NextResponse.json(
      { ok: false, error: "Missing videoId, actId, or blockIndex." },
      { status: 400 },
    );
  }
  if (!isActId(actIdRaw)) {
    return NextResponse.json({ ok: false, error: "Invalid actId." }, { status: 400 });
  }
  const actId = actIdRaw;
  const blockIndex = Number.parseInt(blockRaw, 10);
  if (!Number.isInteger(blockIndex) || blockIndex < 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid blockIndex." },
      { status: 400 },
    );
  }

  if (!getLocalAssetsRoot()) {
    return NextResponse.json(
      { ok: false, error: "Local assets root not configured." },
      { status: 503 },
    );
  }

  if (!(await checkFfmpegAvailable()) || !(await checkFfprobeAvailable())) {
    return ffmpegUnavailableResponse();
  }

  const [segments, stills] = await Promise.all([
    listNarrationSegmentsForVideo(videoId),
    listVisStillsForVideo(videoId),
  ]);

  const seg = segments.find(
    (s) => s.actId === actId && s.blockIndex === blockIndex,
  );
  const still = stills.find(
    (s) => s.actId === actId && s.blockIndex === blockIndex,
  );

  if (!seg) {
    return NextResponse.json(
      { ok: false, error: "No narration audio for this block." },
      { status: 404 },
    );
  }
  if (!still) {
    return NextResponse.json(
      { ok: false, error: "No [VIS] still for this block." },
      { status: 404 },
    );
  }

  const result = await renderVisMotionBlock({
    videoId,
    actId,
    blockIndex,
    still,
    segment: seg,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 500 },
    );
  }

  try {
    const motionAbs = resolveVisMotionAbsolutePath(result.motionRelativePath);
    return await streamMp4File(motionAbs);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Motion file missing after render." },
      { status: 500 },
    );
  }
}
