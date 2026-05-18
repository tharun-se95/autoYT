import { readFile } from "fs/promises";

import { NextResponse } from "next/server";

import {
  getLocalAssetsRoot,
  isSafeStoredThumbnailRelativePath,
  resolveLocalAssetAbsolutePath,
} from "@/lib/assets/local-asset-store";
import { createServiceSupabase } from "@/lib/supabase/admin-client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params;
  if (!eventId || !UUID_RE.test(eventId)) {
    return new NextResponse("Invalid id", { status: 400 });
  }

  if (!getLocalAssetsRoot()) {
    return new NextResponse("Local assets root not configured", { status: 503 });
  }

  const supabase = createServiceSupabase();
  if (!supabase) {
    return new NextResponse("Database not configured", { status: 503 });
  }

  const { data, error } = await supabase
    .from("thumbnail_generation_events")
    .select("local_relative_path, mime_type")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !data?.local_relative_path) {
    return new NextResponse("Not found", { status: 404 });
  }

  const rel = data.local_relative_path;
  if (!isSafeStoredThumbnailRelativePath(rel)) {
    return new NextResponse("Invalid stored path", { status: 500 });
  }

  let absolute: string;
  try {
    absolute = resolveLocalAssetAbsolutePath(rel);
  } catch {
    return new NextResponse("Path resolution failed", { status: 500 });
  }

  try {
    const buf = await readFile(absolute);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": data.mime_type?.trim() || "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("File missing", { status: 404 });
  }
}
