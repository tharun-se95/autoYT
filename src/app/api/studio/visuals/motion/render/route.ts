import { NextResponse } from "next/server";

import { getLocalAssetsRoot } from "@/lib/assets/local-asset-store";
import {
  checkFfmpegAvailable,
  checkFfprobeAvailable,
} from "@/lib/studio/ffmpeg-vis-motion";
import { listAssemblyBeats } from "@/lib/studio/assembly-beats";
import { parseMotionStorageIndex } from "@/lib/studio/beat-timings";
import { renderVisMotionBeat } from "@/lib/studio/render-vis-motion-beat";
import { loadScriptDocumentForVideo } from "@/lib/studio/load-script-document";
import { listNarrationSegmentsForVideo } from "@/lib/studio-db/persist-narration-segment";
import { listVisStillsForVideo } from "@/lib/studio-db/persist-vis-still";
import type { ScriptActId } from "@/lib/script-writer/types";

function isActId(s: string): s is ScriptActId {
  return typeof s === "string" && s.trim().length > 0 && /^[a-z0-9_-]+$/i.test(s);
}

type RenderBody = {
  videoId?: string;
  actId?: string;
  /** Motion storage index (baseBlock×100+beat), not base block index only. */
  blockIndex?: number;
  force?: boolean;
};

export async function POST(request: Request) {
  let body: RenderBody;
  try {
    body = (await request.json()) as RenderBody;
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
        ffmpegAvailable: ffmpegOk,
        ffprobeAvailable: ffprobeOk,
      },
      { status: 503 },
    );
  }

  const force = Boolean(body.force);
  const actIdRaw = body.actId?.trim();
  const blockIndex =
    body.blockIndex === undefined ? undefined : Number(body.blockIndex);

  const [script, segments, stills] = await Promise.all([
    loadScriptDocumentForVideo(videoId),
    listNarrationSegmentsForVideo(videoId),
    listVisStillsForVideo(videoId),
  ]);

  const allBeats = listAssemblyBeats(script, segments, stills);

  let targets = allBeats;

  if (actIdRaw !== undefined && blockIndex !== undefined) {
    if (!isActId(actIdRaw)) {
      return NextResponse.json({ ok: false, error: "Invalid actId." }, { status: 400 });
    }
    if (!Number.isInteger(blockIndex) || blockIndex < 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid blockIndex (motion storage index)." },
        { status: 400 },
      );
    }
    const { baseBlockIndex, beatIndex } = parseMotionStorageIndex(blockIndex);
    targets = allBeats.filter(
      (b) =>
        b.actId === actIdRaw &&
        b.baseBlockIndex === baseBlockIndex &&
        b.beatIndex === beatIndex,
    );
  } else if (actIdRaw !== undefined || blockIndex !== undefined) {
    return NextResponse.json(
      {
        ok: false,
        error: "Provide both actId and blockIndex, or neither for batch.",
      },
      { status: 400 },
    );
  }

  if (targets.length === 0) {
    return NextResponse.json({
      ok: true,
      videoId,
      total: 0,
      rendered: 0,
      cached: 0,
      failed: 0,
      results: [],
      message:
        "No beats with both a [VIS] still and narration audio. Generate visuals and audio first.",
    });
  }

  const results = [];
  let rendered = 0;
  let cached = 0;
  let failed = 0;

  for (const beat of targets) {
    const result = await renderVisMotionBeat({
      videoId,
      actId: beat.actId,
      baseBlockIndex: beat.baseBlockIndex,
      beatIndex: beat.beatIndex,
      still: beat.still,
      segment: beat.segment,
      blockVisualBeats: beat.blockVisualBeats,
      force,
    });

    results.push(result);
    if (result.ok) {
      if (result.cached) cached += 1;
      else rendered += 1;
    } else {
      failed += 1;
    }
  }

  return NextResponse.json({
    ok: failed === 0,
    videoId,
    total: targets.length,
    rendered,
    cached,
    failed,
    results,
  });
}
