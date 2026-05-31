import { NextResponse } from "next/server";

import { generateVisStillImageForBlock } from "@/lib/studio/generate-vis-still";
import type { ScriptActId } from "@/lib/script-writer/types";

function isScriptActId(s: string): s is ScriptActId {
  return typeof s === "string" && s.trim().length > 0 && /^[a-z0-9_-]+$/i.test(s);
}

type Body = {
  videoId?: string;
  actId?: string;
  /** Clients sometimes send this as a string; normalize in `parseBlockIndex`. */
  blockIndex?: number | string;
  visualDescription?: string;
  workingTitle?: string;
  force?: boolean;
};

function parseBlockIndex(raw: Body["blockIndex"]): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.floor(raw);
  }
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    return Number.parseInt(raw.trim(), 10);
  }
  return NaN;
}

export async function POST(request: Request) {
  try {
    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
    const actIdRaw = typeof body.actId === "string" ? body.actId.trim() : "";
    const blockIndex = parseBlockIndex(body.blockIndex);
    const visualDescription =
      typeof body.visualDescription === "string" ? body.visualDescription : "";
    const workingTitle =
      typeof body.workingTitle === "string" ? body.workingTitle : undefined;

    if (!videoId) {
      return NextResponse.json(
        { ok: false, error: "Missing videoId." },
        { status: 400 },
      );
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

    const result = await generateVisStillImageForBlock({
      videoId,
      actId: actIdRaw,
      blockIndex,
      visualDescription,
      workingTitle,
      force: Boolean(body.force),
    });

    if (!result.ok) {
      const err =
        typeof result.error === "string" && result.error.trim()
          ? result.error
          : "Image generation failed.";
      const status =
        err.includes("GEMINI_API_KEY") || err.includes("LOCAL_ASSETS_ROOT")
          ? 503
          : err.includes("too short") || err.includes("too long")
            ? 400
            : 502;
      return NextResponse.json({ ok: false, error: err }, { status });
    }

    return NextResponse.json({
      ok: true,
      still: {
        id: result.id,
        actId: actIdRaw,
        blockIndex,
        mimeType: result.mimeType,
        localRelativePath: result.localRelativePath,
        fileUrl: result.fileUrl,
      },
    });
  } catch (e) {
    console.error("[api/studio/visuals/generate]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        error: `Unexpected server error while generating still: ${msg}`,
      },
      { status: 500 },
    );
  }
}
