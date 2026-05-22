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
import { listAssemblyBeats } from "@/lib/studio/assembly-beats";
import { parseMotionStorageIndex } from "@/lib/studio/beat-timings";
import { loadScriptDocumentForVideo } from "@/lib/studio/load-script-document";
import { renderVisMotionBeat } from "@/lib/studio/render-vis-motion-beat";
import { listNarrationSegmentsForVideo } from "@/lib/studio-db/persist-narration-segment";
import { listVisStillsForVideo } from "@/lib/studio-db/persist-vis-still";
import type { ScriptActId } from "@/lib/script-writer/types";

export const dynamic = "force-dynamic";

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
  const actId: ScriptActId = actIdRaw;
  const motionStorageIndex = Number.parseInt(blockRaw, 10);
  if (!Number.isInteger(motionStorageIndex) || motionStorageIndex < 0) {
    return NextResponse.json(
      { ok: false, error: "Invalid blockIndex (motion storage index)." },
      { status: 400 },
    );
  }

  const { baseBlockIndex, beatIndex } = parseMotionStorageIndex(motionStorageIndex);

  if (!getLocalAssetsRoot()) {
    return NextResponse.json(
      { ok: false, error: "Local assets root not configured." },
      { status: 503 },
    );
  }

  if (!(await checkFfmpegAvailable()) || !(await checkFfprobeAvailable())) {
    return ffmpegUnavailableResponse();
  }

  const [script, segments, stills] = await Promise.all([
    loadScriptDocumentForVideo(videoId),
    listNarrationSegmentsForVideo(videoId),
    listVisStillsForVideo(videoId),
  ]);

  const beat = listAssemblyBeats(script, segments, stills).find(
    (b) =>
      b.actId === actId &&
      b.baseBlockIndex === baseBlockIndex &&
      b.beatIndex === beatIndex,
  );

  if (!beat) {
    return NextResponse.json(
      { ok: false, error: "No still or narration for this beat." },
      { status: 404 },
    );
  }

  const result = await renderVisMotionBeat({
    videoId,
    actId,
    baseBlockIndex,
    beatIndex,
    still: beat.still,
    segment: beat.segment,
    blockVisualBeats: beat.blockVisualBeats,
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
