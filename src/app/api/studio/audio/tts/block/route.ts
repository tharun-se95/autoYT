import { NextResponse } from "next/server";

import {
  NARRATION_TTS_BLOCK_MAX_CHARS,
} from "@/lib/script-writer/narration-for-tts";
import type { ScriptActId } from "@/lib/script-writer/types";
import { ACT_TTS_DIRECTOR_NOTES } from "@/prompts/narration-tts-act-notes";
import { generateNarrationTts } from "@/lib/studio/generate-narration-tts";
import { persistNarrationAudioBlock } from "@/lib/studio-db/persist-narration-segment";
import { createServiceSupabase } from "@/lib/supabase/admin-client";

function isScriptActId(s: string): s is ScriptActId {
  return typeof s === "string" && s.trim().length > 0 && /^[a-z0-9_-]+$/i.test(s);
}

type Body = {
  videoId?: string;
  actId?: string;
  blockIndex?: number;
  narration?: string;
  workingTitle?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
  const actIdRaw = typeof body.actId === "string" ? body.actId.trim() : "";
  const blockIndex =
    typeof body.blockIndex === "number" && Number.isFinite(body.blockIndex)
      ? Math.floor(body.blockIndex)
      : NaN;
  const narration = typeof body.narration === "string" ? body.narration : "";
  const workingTitle =
    typeof body.workingTitle === "string" ? body.workingTitle : undefined;

  if (!videoId) {
    return NextResponse.json({ ok: false, error: "Missing videoId." }, { status: 400 });
  }
  if (!isScriptActId(actIdRaw)) {
    return NextResponse.json({ ok: false, error: "Invalid actId." }, { status: 400 });
  }
  if (!Number.isFinite(blockIndex) || blockIndex < 0 || blockIndex > 9999) {
    return NextResponse.json(
      { ok: false, error: "Invalid blockIndex." },
      { status: 400 },
    );
  }

  const narr = narration.trim();
  if (!narr) {
    return NextResponse.json(
      { ok: false, error: "Missing narration text." },
      { status: 400 },
    );
  }
  if (narr.length > NARRATION_TTS_BLOCK_MAX_CHARS) {
    return NextResponse.json(
      {
        ok: false,
        error: `Narration block is ${narr.length} characters; max is ${NARRATION_TTS_BLOCK_MAX_CHARS}.`,
      },
      { status: 400 },
    );
  }

  let channelId: string | null = null;
  const supabase = createServiceSupabase();
  if (supabase && videoId) {
    const { data: vidRow } = await supabase
      .from("videos")
      .select("channel_id")
      .eq("id", videoId)
      .maybeSingle();
    if (vidRow?.channel_id) {
      channelId = vidRow.channel_id;
      console.info(`[api/tts] Resolved channelId "${channelId}" for video "${videoId}"`);
    }
  }

  const director = ACT_TTS_DIRECTOR_NOTES[actIdRaw];
  const tts = await generateNarrationTts(narr, {
    directorAddendum: director,
    maxInputChars: NARRATION_TTS_BLOCK_MAX_CHARS,
    channelId,
  });

  if (!tts.ok) {
    return NextResponse.json({ ok: false, error: tts.error }, { status: 502 });
  }

  try {
    const saved = await persistNarrationAudioBlock({
      videoId,
      actId: actIdRaw,
      blockIndex,
      base64: tts.base64,
      mimeType: tts.mimeType,
      workingTitle,
    });
    const fileUrl = `/api/studio/audio/file?rel=${encodeURIComponent(saved.localRelativePath)}`;
    return NextResponse.json({
      ok: true,
      segment: {
        id: saved.id,
        actId: saved.actId,
        blockIndex: saved.blockIndex,
        mimeType: saved.mimeType,
        localRelativePath: saved.localRelativePath,
        fileUrl,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
