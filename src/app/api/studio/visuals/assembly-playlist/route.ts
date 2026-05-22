import { NextResponse } from "next/server";

import { getLocalAssetsRoot } from "@/lib/assets/local-asset-store";
import { buildAssemblyPreviewPlaylist } from "@/lib/studio/assembly-preview-playlist";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId")?.trim();

  if (!videoId) {
    return NextResponse.json(
      { ok: false, error: "Missing videoId." },
      { status: 400 },
    );
  }

  if (!getLocalAssetsRoot()) {
    return NextResponse.json(
      { ok: false, error: "Local assets root not configured." },
      { status: 503 },
    );
  }

  try {
    const items = await buildAssemblyPreviewPlaylist(videoId);
    return NextResponse.json({ ok: true, videoId, items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
