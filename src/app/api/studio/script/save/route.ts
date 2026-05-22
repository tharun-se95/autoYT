import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import {
  getLocalAssetsRoot,
  sanitizeEpisodeIdForAssets,
} from "@/lib/assets/local-asset-store";
import { normalizeScript } from "@/lib/script-writer/normalize-script-document";
import {
  formatValidationIssuesForUser,
  validateScriptBlockOpenings,
} from "@/lib/script-writer/validate-block-openings";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { videoId, script } = body;

    if (!videoId || !script) {
      return NextResponse.json(
        { ok: false, error: "Missing videoId or script in request body." },
        { status: 400 }
      );
    }

    const parsed = normalizeScript(script);
    if (!parsed) {
      return NextResponse.json(
        { ok: false, error: "Invalid script document shape." },
        { status: 400 },
      );
    }

    const issues = validateScriptBlockOpenings(parsed);
    if (issues.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Script validation failed. ${formatValidationIssuesForUser(issues)}`,
          issues,
        },
        { status: 400 },
      );
    }

    const root = getLocalAssetsRoot();
    if (!root) {
      return NextResponse.json(
        { ok: false, error: "UPGRADE_LIFE_LOCAL_ASSETS_ROOT is not set on the server." },
        { status: 503 }
      );
    }

    const safeId = sanitizeEpisodeIdForAssets(videoId);
    const targetDir = path.join(root, "vis-stills", safeId);
    const targetPath = path.join(targetDir, "script.json");

    await mkdir(targetDir, { recursive: true });
    await writeFile(targetPath, JSON.stringify(parsed, null, 2), "utf8");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[script-save-api] Error saving script:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
