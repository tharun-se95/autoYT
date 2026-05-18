import { NextResponse } from "next/server";

import { getLocalAssetsRoot } from "@/lib/assets/local-asset-store";
import {
  checkFfmpegAvailable,
  checkFfprobeAvailable,
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

type RenderBody = {
  videoId?: string;
  actId?: string;
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

  const [segments, stills] = await Promise.all([
    listNarrationSegmentsForVideo(videoId),
    listVisStillsForVideo(videoId),
  ]);

  const stillByKey = new Map(
    stills.map((s) => [`${s.actId}:${s.blockIndex}`, s] as const),
  );
  const segByKey = new Map(
    segments.map((s) => [`${s.actId}:${s.blockIndex}`, s] as const),
  );

  const targets: { actId: ScriptActId; blockIndex: number }[] = [];

  if (actIdRaw !== undefined && blockIndex !== undefined) {
    if (!isActId(actIdRaw)) {
      return NextResponse.json({ ok: false, error: "Invalid actId." }, { status: 400 });
    }
    if (!Number.isInteger(blockIndex) || blockIndex < 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid blockIndex." },
        { status: 400 },
      );
    }
    targets.push({ actId: actIdRaw, blockIndex });
  } else if (actIdRaw !== undefined || blockIndex !== undefined) {
    return NextResponse.json(
      { ok: false, error: "Provide both actId and blockIndex, or neither for batch." },
      { status: 400 },
    );
  } else {
    for (const key of stillByKey.keys()) {
      if (!segByKey.has(key)) continue;
      const [actId, idxStr] = key.split(":");
      if (!isActId(actId)) continue;
      targets.push({ actId, blockIndex: Number.parseInt(idxStr, 10) });
    }
    targets.sort((a, b) => {
      const actCmp = ACT_IDS.indexOf(a.actId) - ACT_IDS.indexOf(b.actId);
      if (actCmp !== 0) return actCmp;
      return a.blockIndex - b.blockIndex;
    });
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
      message: "No blocks with both a [VIS] still and narration audio.",
    });
  }

  const results = [];
  let rendered = 0;
  let cached = 0;
  let failed = 0;

  for (const { actId, blockIndex } of targets) {
    const still = stillByKey.get(`${actId}:${blockIndex}`);
    const segment = segByKey.get(`${actId}:${blockIndex}`);
    if (!still || !segment) {
      failed += 1;
      results.push({
        ok: false as const,
        actId,
        blockIndex,
        error: "Missing still or narration for this block.",
      });
      continue;
    }

    const result = await renderVisMotionBlock({
      videoId,
      actId,
      blockIndex,
      still,
      segment,
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
