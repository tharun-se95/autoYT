// src/prompts/registry.ts

export type PromptName = string;
export type PromptVersion = string;
type PromptBuilder = (...args: any[]) => string;

// Map<PromptName, Map<PromptVersion, builder>>
const promptRegistry = new Map<PromptName, Map<PromptVersion, PromptBuilder>>();

/**
 * Registers a prompt function with a given name and version.
 * The function should return the fully assembled prompt string.
 * Zero-arg builders are used for system instructions; pass args for parameterized prompts (e.g. Imagen).
 */
export function registerPrompt(
  name: PromptName,
  version: PromptVersion,
  builder: PromptBuilder,
) {
  if (!promptRegistry.has(name)) {
    promptRegistry.set(name, new Map<PromptVersion, PromptBuilder>());
  }
  promptRegistry.get(name)?.set(version, builder);
}

/**
 * Retrieves a prompt string for a given name and version.
 * Throws an error if the prompt is not found.
 */
export function getPrompt(name: PromptName, version: PromptVersion): string;
export function getPrompt<T extends unknown[]>(
  name: PromptName,
  version: PromptVersion,
  ...args: T
): string;
export function getPrompt(
  name: PromptName,
  version: PromptVersion,
  ...args: unknown[]
): string {
  const versions = promptRegistry.get(name);
  if (!versions) {
    throw new Error(`Prompt '${name}' not found in registry.`);
  }
  const builder = versions.get(version);
  if (!builder) {
    throw new Error(`Prompt '${name}' version '${version}' not found in registry.`);
  }
  return builder(...args);
}

// Default prompt versions (can be overridden via environment variables or config)
export const DEFAULT_PROMPT_VERSIONS = {
  CONTENT_ARCHITECT_SYSTEM: "v1.0",
  OUTLINE_WRITER_SYSTEM: "v1.0",
  ACT_WRITER_SYSTEM: "v1.0",
  CONSULTANT_AUDIT_SYSTEM: "v1.0",
  VOCAL_DNA_TTS_SYSTEM_INSTRUCTION: "v1.0",
  THUMBNAIL_IMAGE_PROMPT: "v1.0",
};

import { createServiceSupabase } from "@/lib/supabase/admin-client";

// Update getPrompt to be channel-aware with in-memory caching
const promptCache = new Map<string, string>();

export async function getPromptWithFallback(
  key: string,
  version: string,
  channelId?: string | null,
  ...args: unknown[]
): Promise<string> {
  if (channelId) {
    const cacheKey = `${channelId}:${key}:${version}`;
    if (promptCache.has(cacheKey)) {
      return promptCache.get(cacheKey)!;
    }

    const supabase = createServiceSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from("channel_prompts")
        .select("prompt_text")
        .eq("channel_id", channelId)
        .eq("prompt_key", key)
        .eq("version", version)
        .eq("is_active", true)
        .maybeSingle();

      if (!error && data?.prompt_text) {
        console.info(`[prompts] Custom override resolved for key: ${key} (Channel: ${channelId})`);
        promptCache.set(cacheKey, data.prompt_text);
        return data.prompt_text;
      }
    }
  }

  // Fall back to local file registry with args
  return getPrompt(key, version, ...args);
}
