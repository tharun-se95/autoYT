import { NextResponse } from "next/server";

import { getLocalAssetsRoot } from "@/lib/assets/local-asset-store";
import { getFfmpegRuntimeStatus } from "@/lib/studio/ffmpeg-vis-motion";
import { createServiceSupabase } from "@/lib/supabase/admin-client";

export async function GET() {
  const localAssetsConfigured = Boolean(getLocalAssetsRoot());
  const supabaseConfigured = createServiceSupabase() !== null;
  const ffmpeg = await getFfmpegRuntimeStatus();
  return NextResponse.json({
    ok: true,
    localAssetsConfigured,
    supabaseConfigured,
    ffmpegAvailable: ffmpeg.ffmpegAvailable,
    ffprobeAvailable: ffmpeg.ffprobeAvailable,
    motionClipsReady:
      localAssetsConfigured && ffmpeg.ffmpegAvailable && ffmpeg.ffprobeAvailable,
  });
}
