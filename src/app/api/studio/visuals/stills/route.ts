import { NextResponse } from "next/server";

import { listVisStillsForVideo } from "@/lib/studio-db/persist-vis-still";

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
    const stills = await listVisStillsForVideo(videoId);
    return NextResponse.json({ ok: true, stills });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
