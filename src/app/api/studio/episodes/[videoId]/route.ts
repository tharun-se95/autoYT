import { NextResponse } from "next/server";

import { buildCommissionedVideoFromDisk } from "@/lib/studio/disk-episode-manifest";

export async function GET(
  _request: Request,
  context: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await context.params;
  const id = videoId?.trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Missing videoId." },
      { status: 400 },
    );
  }

  const video = await buildCommissionedVideoFromDisk(id);
  if (!video) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No script.json for this id under UPGRADE_LIFE_LOCAL_ASSETS_ROOT/vis-stills.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, video });
}
