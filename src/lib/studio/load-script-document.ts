import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  getLocalAssetsRoot,
  sanitizeEpisodeIdForAssets,
} from "@/lib/assets/local-asset-store";
import type { ScriptDocument } from "@/lib/script-writer/types";

export async function loadScriptDocumentForVideo(
  videoId: string,
): Promise<ScriptDocument | null> {
  const root = getLocalAssetsRoot();
  if (!root) return null;
  const safeId = sanitizeEpisodeIdForAssets(videoId);
  const p = path.join(root, "vis-stills", safeId, "script.json");
  try {
    const raw = await readFile(p, "utf8");
    return JSON.parse(raw) as ScriptDocument;
  } catch {
    return null;
  }
}
