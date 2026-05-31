import { HOST_MODEL_SHEET_PROSE } from "@/prompts/shared/host-model-sheet";
import {
  VIS_STILL_NO_TEXT_PROSE,
  VIS_STILL_PALETTE_PROSE,
  VIS_STILL_STYLE_PROSE,
  proseForImagen,
  sanitizeSceneForImagen,
} from "@/prompts/shared/imagen-safe-prose";
import { getPromptWithFallback } from "@/prompts/registry";
import { injectChannelMetadataIntoPrompt } from "@/lib/studio/prompt-param-injector";
import { createServiceSupabase } from "@/lib/supabase/admin-client";

/**
 * **Layer D — Imagen:** Ken Burns / b-roll still from a script `[VIS]` line only.
 * Supports custom channel-scoped visual presets, color palettes, and negative constraints.
 */
export async function buildVisStillImagePrompt(
  visualDescription: string,
  channelId?: string | null
): Promise<string> {
  const visual = sanitizeSceneForImagen(visualDescription);
  
  let hostProse = HOST_MODEL_SHEET_PROSE;
  let styleProse = VIS_STILL_STYLE_PROSE;
  let paletteProse = VIS_STILL_PALETTE_PROSE;
  let noTextProse = VIS_STILL_NO_TEXT_PROSE;

  const supabase = createServiceSupabase();
  if (supabase && channelId) {
    const { data: channelRow } = await supabase
      .from("channels")
      .select("*")
      .eq("id", channelId)
      .maybeSingle();

    if (channelRow) {
      // Load custom overrides from database if they exist, otherwise use static prompts
      const customHost = await getPromptWithFallback("HOST_MODEL_SHEET_PROSE", "v1.0", channelId);
      const customStyle = await getPromptWithFallback("IMAGEN_VIS_STILL_PROSE_STYLE", "v1.0", channelId);
      const customPalette = await getPromptWithFallback("IMAGEN_VIS_STILL_PROSE_PALETTE", "v1.0", channelId);
      const customNoText = await getPromptWithFallback("IMAGEN_VIS_STILL_PROSE_NOTEXT", "v1.0", channelId);

      if (customHost) {
        hostProse = customHost;
      }
      styleProse = injectChannelMetadataIntoPrompt(customStyle || VIS_STILL_STYLE_PROSE, channelRow);
      paletteProse = injectChannelMetadataIntoPrompt(customPalette || VIS_STILL_PALETTE_PROSE, channelRow);
      noTextProse = injectChannelMetadataIntoPrompt(customNoText || VIS_STILL_NO_TEXT_PROSE, channelRow);
      console.info(`[prompts] Fully compiled parametric image prompt for channel: ${channelId}`);
    }
  }

  const host = proseForImagen(hostProse);

  return [
    `Draw a single widescreen cartoon illustration filling the entire frame edge to edge.`,
    `Scene: ${visual}`,
    styleProse,
    `When the mentor appears: ${host}`,
    paletteProse,
    noTextProse,
  ].join(" ");
}
