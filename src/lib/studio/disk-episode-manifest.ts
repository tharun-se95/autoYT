import "server-only";

import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { CommissionedVideo } from "@/lib/home/commissioned-videos-storage";
import {
  DEFAULT_SUGGESTED_TONE,
  DEFAULT_SUGGESTED_VISUAL_STYLE,
  parseSuggestedTone,
  parseSuggestedVisualStyle,
  type ContentPillar,
  type ThumbnailTextGlow,
  type VideoIdea,
} from "@/lib/content-architect/types";
import {
  getLocalAssetsRoot,
  sanitizeEpisodeIdForAssets,
} from "@/lib/assets/local-asset-store";
import { loadScriptDocumentForVideo } from "@/lib/studio/load-script-document";
import type { ScriptDocument } from "@/lib/script-writer/types";



function defaultIdeaFromScript(script: ScriptDocument): VideoIdea {
  const title = script.workingTitle.trim() || "Untitled production";
  const firstNarration =
    script.acts[0]?.narrationBlocks[0]?.narration?.trim() ?? "";
  const hook =
    firstNarration.length > 0
      ? firstNarration.slice(0, 280)
      : "A video episode for this channel.";
  return {
    title,
    hook,
    thumbnailVisualDescription:
      "16:9 narrative explainer panel — mentor in split Daily Chaos vs Sorted Peace scene.",
    thumbnailTextOverlay: title.split(/\s+/).slice(0, 4).join(" ").toUpperCase().slice(0, 32) || "CREATOR STUDIO",
    thumbnailTextGlow: "cyan",
    pillar: "overthinking",
    suggestedTone: DEFAULT_SUGGESTED_TONE,
    suggestedVisualStyle: DEFAULT_SUGGESTED_VISUAL_STYLE,
  };
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function hasNarrationOnDisk(videoId: string): Promise<boolean> {
  const root = getLocalAssetsRoot();
  if (!root) return false;
  const safeId = sanitizeEpisodeIdForAssets(videoId);
  const dir = path.join(root, "narration-audio", safeId);
  const manifest = path.join(dir, "manifest.json");
  if (await pathExists(manifest)) return true;
  try {
    const { readdir } = await import("node:fs/promises");
    const names = await readdir(dir);
    return names.some((n) => /\.(wav|mp3)$/i.test(n));
  } catch {
    return false;
  }
}

async function readBootstrapMeta(
  videoId: string,
): Promise<Partial<CommissionedVideo> | null> {
  const root = getLocalAssetsRoot();
  if (!root) return null;
  const safeId = sanitizeEpisodeIdForAssets(videoId);
  const metaPath = path.join(root, "vis-stills", safeId, "commission.meta.json");
  try {
    const raw = await readFile(metaPath, "utf8");
    const o = JSON.parse(raw) as Record<string, unknown>;
    const idea = o.idea;
    if (!idea || typeof idea !== "object") return null;
    const i = idea as Record<string, unknown>;
    const pillar = typeof i.pillar === "string" && i.pillar.trim().length > 0
      ? i.pillar
      : "general";
    const glow: ThumbnailTextGlow =
      i.thumbnailTextGlow === "amber" ? "amber" : "cyan";
    const videoIdea: VideoIdea = {
      title: typeof i.title === "string" ? i.title : "",
      hook: typeof i.hook === "string" ? i.hook : "",
      thumbnailVisualDescription:
        typeof i.thumbnailVisualDescription === "string"
          ? i.thumbnailVisualDescription
          : "",
      thumbnailTextOverlay:
        typeof i.thumbnailTextOverlay === "string"
          ? i.thumbnailTextOverlay
          : "CREATOR STUDIO",
      thumbnailTextGlow: glow,
      pillar,
      suggestedTone: parseSuggestedTone(i.suggestedTone),
      suggestedVisualStyle: parseSuggestedVisualStyle(i.suggestedVisualStyle),
    };
    if (!videoIdea.title.trim()) return null;
    return {
      workingTitle:
        typeof o.workingTitle === "string"
          ? o.workingTitle
          : videoIdea.title,
      idea: videoIdea,
      currentStage:
        o.currentStage === "script" ||
        o.currentStage === "audio" ||
        o.currentStage === "visuals"
          ? o.currentStage
          : "visuals",
      scriptCompletedAt:
        typeof o.scriptCompletedAt === "string" ? o.scriptCompletedAt : null,
      audioCompletedAt:
        typeof o.audioCompletedAt === "string" ? o.audioCompletedAt : null,
    };
  } catch {
    return null;
  }
}

/** Build a commissioned row when `script.json` exists on the local assets disk. */
export async function buildCommissionedVideoFromDisk(
  videoId: string,
): Promise<CommissionedVideo | null> {
  const script = await loadScriptDocumentForVideo(videoId);
  if (!script) return null;

  const now = new Date().toISOString();
  const meta = await readBootstrapMeta(videoId);
  const hasAudio = await hasNarrationOnDisk(videoId);
  const scriptDone = meta?.scriptCompletedAt ?? now;
  const audioDone = meta?.audioCompletedAt ?? (hasAudio ? now : null);

  let currentStage: CommissionedVideo["currentStage"] = "script";
  if (audioDone) currentStage = "visuals";
  else if (scriptDone) currentStage = "audio";
  if (meta?.currentStage) currentStage = meta.currentStage;

  return {
    id: videoId,
    workingTitle: meta?.workingTitle?.trim() || script.workingTitle.trim(),
    idea: meta?.idea ?? defaultIdeaFromScript(script),
    currentStage,
    createdAt: now,
    updatedAt: now,
    scriptCompletedAt: scriptDone,
    audioCompletedAt: audioDone,
    sourceGeneratedIdeaId: null,
    thumbnailDbEventId: null,
    thumbnailLocalRelativePath: null,
    thumbnailInlineDataUrl: null,
  };
}
