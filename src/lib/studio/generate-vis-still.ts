import "server-only";

import { VIS_STILL_MAX_CHARS, VIS_STILL_MIN_CHARS } from "@/lib/studio/vis-still-limits";
import { persistVisStillFromBase64 } from "@/lib/studio-db/persist-vis-still";
import { generateImagenSinglePng } from "@/lib/thumbnail/imagen-single-png";
import { buildVisStillImagePrompt } from "@/prompts/thumbnail/build-vis-still-image-prompt";
import type { ScriptActId } from "@/lib/script-writer/types";

export type GenerateVisStillSuccess = {
  ok: true;
  mimeType: string;
  base64: string;
  localRelativePath: string;
  fileUrl: string;
  id: string;
};

export type GenerateVisStillFailure = {
  ok: false;
  error: string;
};

export type GenerateVisStillResult = GenerateVisStillSuccess | GenerateVisStillFailure;

/**
 * Imagen 16:9 still from one script [VIS] line + disk + optional `vis_still_generation_events` row.
 */
export async function generateVisStillImageForBlock(params: {
  videoId: string;
  actId: ScriptActId;
  blockIndex: number;
  visualDescription: string;
  workingTitle?: string | null;
}): Promise<GenerateVisStillResult> {
  try {
    const v = params.visualDescription.trim();
    if (v.length < VIS_STILL_MIN_CHARS) {
      return {
        ok: false,
        error: `Visual description is too short (${v.length} chars). Aim for at least ${VIS_STILL_MIN_CHARS} characters of scene detail for Imagen.`,
      };
    }
    if (v.length > VIS_STILL_MAX_CHARS) {
      return {
        ok: false,
        error: `Visual description is too long (${v.length} chars). Maximum is ${VIS_STILL_MAX_CHARS}.`,
      };
    }

    const prompt = buildVisStillImagePrompt(v);
    const gen = await generateImagenSinglePng(prompt);
    if (!gen.ok) {
      return { ok: false, error: gen.error };
    }

    try {
      const saved = await persistVisStillFromBase64({
        videoId: params.videoId,
        actId: params.actId,
        blockIndex: params.blockIndex,
        base64: gen.base64,
        mimeType: gen.mimeType,
        workingTitle: params.workingTitle,
      });
      const fileUrl = `/api/studio/visuals/file?rel=${encodeURIComponent(saved.localRelativePath)}`;
      return {
        ok: true,
        base64: gen.base64,
        mimeType: gen.mimeType,
        localRelativePath: saved.localRelativePath,
        fileUrl,
        id: saved.id,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
