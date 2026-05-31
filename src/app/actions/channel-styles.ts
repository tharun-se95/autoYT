"use server";

import { createServiceSupabase } from "@/lib/supabase/admin-client";
import { revalidatePath } from "next/cache";

export interface ChannelSimple {
  id: string;
  name: string;
  palette_hex: string[];
}

export async function getChannelsList(): Promise<ChannelSimple[]> {
  const supabase = createServiceSupabase();
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from("channels")
    .select("id, name, palette_hex")
    .order("name", { ascending: true });
    
  if (error || !data) {
    console.error("[actions/channel-styles] failed to list channels:", error);
    return [];
  }
  return data as ChannelSimple[];
}

export interface VisualStyleInput {
  colors: string[];
  styleProse: string;
  paletteProse: string;
  noTextProse: string;
  keywords: string[];
}

export async function applyStyleToChannel(params: {
  channelId: string;
  styleName: string;
  styleInput: VisualStyleInput;
}): Promise<{ ok: boolean; error?: string }> {
  const { channelId, styleName, styleInput } = params;
  
  const supabase = createServiceSupabase();
  if (!supabase) {
    return { ok: false, error: "Supabase client not configured." };
  }
  
  try {
    // 1. Update the channels table row
    const { error: channelErr } = await supabase
      .from("channels")
      .update({
        palette_hex: styleInput.colors,
        visual_style_notes: styleInput.styleProse,
        style_keywords: styleInput.keywords,
      })
      .eq("id", channelId);
      
    if (channelErr) {
      console.error("[actions/channel-styles] error updating channel:", channelErr);
      return { ok: false, error: `Failed to update channel row: ${channelErr.message}` };
    }
    
    // 2. Delete existing prompts to overwrite cleanly
    await supabase
      .from("channel_prompts")
      .delete()
      .eq("channel_id", channelId)
      .in("prompt_key", [
        "IMAGEN_VIS_STILL_PROSE_STYLE",
        "IMAGEN_VIS_STILL_PROSE_PALETTE",
        "IMAGEN_VIS_STILL_PROSE_NOTEXT"
      ]);
      
    // 3. Insert fresh prompt overrides
    const promptsToInsert = [
      {
        channel_id: channelId,
        prompt_key: "IMAGEN_VIS_STILL_PROSE_STYLE",
        version: "v1.0",
        prompt_text: styleInput.styleProse,
        is_active: true
      },
      {
        channel_id: channelId,
        prompt_key: "IMAGEN_VIS_STILL_PROSE_PALETTE",
        version: "v1.0",
        prompt_text: styleInput.paletteProse,
        is_active: true
      },
      {
        channel_id: channelId,
        prompt_key: "IMAGEN_VIS_STILL_PROSE_NOTEXT",
        version: "v1.0",
        prompt_text: styleInput.noTextProse,
        is_active: true
      }
    ];
    
    const { error: promptErr } = await supabase
      .from("channel_prompts")
      .insert(promptsToInsert);
      
    if (promptErr) {
      console.error("[actions/channel-styles] error seeding prompts:", promptErr);
      return { ok: false, error: `Failed to seed prompts in DB: ${promptErr.message}` };
    }
    
    console.info(`[actions/channel-styles] successfully applied style "${styleName}" to channel "${channelId}"`);
    revalidatePath("/studio/visual-library");
    revalidatePath("/channel-desk");
    return { ok: true };
    
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
