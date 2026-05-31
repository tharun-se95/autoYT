import "server-only";

import { GoogleGenAI, PersonGeneration } from "@google/genai";

import { IMAGE_MODEL_CANDIDATES } from "@/lib/thumbnail/image-models";

export type ImagenSinglePngSuccess = {
  ok: true;
  base64: string;
  mimeType: string;
};

export type ImagenSinglePngFailure = {
  ok: false;
  error: string;
};

export type ImagenSinglePngResult = ImagenSinglePngSuccess | ImagenSinglePngFailure;

function modelOrder(): string[] {
  const pinned = process.env.GEMINI_IMAGE_MODEL?.trim();
  if (!pinned) return [...IMAGE_MODEL_CANDIDATES];
  const rest = IMAGE_MODEL_CANDIDATES.filter((m) => m !== pinned);
  return [pinned, ...rest];
}

/**
 * One 16:9 PNG from Imagen (Gemini API). Callers build the prompt string.
 */
export async function generateImagenSinglePng(
  prompt: string,
): Promise<ImagenSinglePngResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key?.trim()) {
    return {
      ok: false,
      error:
        "Missing GEMINI_API_KEY. Add it to .env.local and restart the dev server.",
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const models = modelOrder();
    let lastMessage = "Unknown error";

    for (const model of models) {
      try {
        const response = await ai.models.generateImages({
          model,
          prompt,
          config: {
            numberOfImages: 1,
            aspectRatio: "16:9",
            personGeneration: PersonGeneration.ALLOW_ADULT,
            outputMimeType: "image/png",
          },
        });

        const first = response.generatedImages?.[0];
        const bytes = first?.image?.imageBytes;
        if (!bytes) {
          const reason = first?.raiFilteredReason?.trim();
          lastMessage = reason
            ? `${model}: ${reason}`
            : `${model}: Model returned no image (may be filtered).`;
          if (process.env.LOG_IMAGEN_PROMPTS === "1") {
            console.warn("[imagen] filtered or empty", {
              model,
              raiFilteredReason: reason ?? null,
              safetyAttributes: first?.safetyAttributes ?? null,
            });
          }
          continue;
        }

        const mimeType = first?.image?.mimeType?.trim() || "image/png";
        return { ok: true, base64: bytes, mimeType };
      } catch (e) {
        lastMessage = e instanceof Error ? e.message : String(e);
        continue;
      }
    }

    return {
      ok: false,
      error: `Could not generate an image after trying ${models.length} model(s). Last error: ${lastMessage}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `Imagen client failed before or between model attempts: ${msg}`,
    };
  }
}
