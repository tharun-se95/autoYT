import { HOST_MODEL_SHEET_PROSE } from "@/prompts/shared/host-model-sheet";
import {
  VIS_STILL_NO_TEXT_PROSE,
  VIS_STILL_PALETTE_PROSE,
  VIS_STILL_STYLE_PROSE,
  proseForImagen,
} from "@/prompts/shared/imagen-safe-prose";

/**
 * **Layer D — Imagen:** Ken Burns / b-roll still from a script `[VIS]` line only.
 *
 * v8: prose-only prompt (no section headers / NOT 3D labels that leak into pixels).
 * Developer API cannot set `enhancePrompt`; leakage is controlled via prompt shape only.
 */
export function buildVisStillImagePrompt(visualDescription: string): string {
  const visual = visualDescription.trim();
  const host = proseForImagen(HOST_MODEL_SHEET_PROSE);

  return [
    `Draw a single widescreen cartoon illustration filling the entire frame edge to edge.`,
    `Scene: ${visual}`,
    VIS_STILL_STYLE_PROSE,
    `When the mentor appears: ${host}`,
    VIS_STILL_PALETTE_PROSE,
    VIS_STILL_NO_TEXT_PROSE,
  ].join(" ");
}
