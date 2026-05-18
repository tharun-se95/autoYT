import { readFile } from "fs/promises";

import { NextResponse } from "next/server";

import {
  getLocalAssetsRoot,
  isSafeStoredThumbnailRelativePath,
  resolveLocalAssetAbsolutePath,
} from "@/lib/assets/local-asset-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rel = searchParams.get("rel");
  if (!rel?.trim()) {
    return new NextResponse("Missing rel", { status: 400 });
  }

  if (!getLocalAssetsRoot()) {
    return new NextResponse("Local assets root not configured", { status: 503 });
  }

  const trimmed = rel.trim();
  if (!isSafeStoredThumbnailRelativePath(trimmed)) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  let absolute: string;
  try {
    absolute = resolveLocalAssetAbsolutePath(trimmed);
  } catch {
    return new NextResponse("Path resolution failed", { status: 500 });
  }

  try {
    const buf = await readFile(absolute);
    const ext = trimmed.toLowerCase().endsWith(".webp") ? "image/webp" : "image/png";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ext,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("File missing", { status: 404 });
  }
}
