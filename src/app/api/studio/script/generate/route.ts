import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { generateScript } from "@/app/actions/script-writer";
import {
  getLocalAssetsRoot,
  sanitizeEpisodeIdForAssets,
} from "@/lib/assets/local-asset-store";
import { createServiceSupabase } from "@/lib/supabase/admin-client";

type Body = {
  episodeBrief?: string;
  videoId?: string;
  mode?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const episodeBrief =
    typeof body.episodeBrief === "string" ? body.episodeBrief.trim() : "";
  const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
  const mode = typeof body.mode === "string" ? body.mode.trim() : "long";

  if (!episodeBrief) {
    return NextResponse.json(
      { ok: false, error: "Missing episodeBrief." },
      { status: 400 },
    );
  }

  // Resolve channelId from the video if videoId is provided
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
      console.info(`[api/script] Resolved channelId "${channelId}" for video "${videoId}"`);
    }
  }

  const result = await generateScript(episodeBrief, mode as "long" | "short" | "test", channelId);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 422 },
    );
  }

  if (videoId) {
    const root = getLocalAssetsRoot();
    if (!root) {
      return NextResponse.json(
        {
          ok: false,
          error: "UPGRADE_LIFE_LOCAL_ASSETS_ROOT is not set on the server.",
        },
        { status: 503 },
      );
    }
    const safeId = sanitizeEpisodeIdForAssets(videoId);
    const targetDir = path.join(root, "vis-stills", safeId);
    const targetPath = path.join(targetDir, "script.json");
    await mkdir(targetDir, { recursive: true });
    await writeFile(targetPath, JSON.stringify(result.script, null, 2), "utf8");
  }

  return NextResponse.json({
    ok: true,
    script: result.script,
    videoId: videoId || null,
  });
}
