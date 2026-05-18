import { NextResponse } from "next/server";

import { listNarrationSegmentsForVideo } from "@/lib/studio-db/persist-narration-segment";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");
  if (!videoId?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Missing videoId." },
      { status: 400 },
    );
  }

  try {
    const segments = await listNarrationSegmentsForVideo(videoId);
    return NextResponse.json({ ok: true, segments });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
