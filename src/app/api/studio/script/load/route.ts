import { NextResponse } from "next/server";

import { loadScriptDocumentForVideo } from "@/lib/studio/load-script-document";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId")?.trim() ?? "";

  if (!videoId) {
    return NextResponse.json(
      { ok: false, error: "Missing videoId query parameter." },
      { status: 400 },
    );
  }

  const script = await loadScriptDocumentForVideo(videoId);
  if (!script) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No script.json for this episode under UPGRADE_LIFE_LOCAL_ASSETS_ROOT.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, script });
}
