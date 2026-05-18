import { part1RoleAndBrandSoul } from "@/prompts/content-architect/parts/part-1-role-brand";
import { part2VisualMoodAndThumbnailStrategy } from "@/prompts/content-architect/parts/part-2-visual-mood";
import { part3PersonaPillarsLanguage } from "@/prompts/content-architect/parts/part-3-persona-pillars-language";
import { part4OutputDiscipline } from "@/prompts/content-architect/parts/part-4-output-discipline";

/** Assembles the Content Architect system instruction from ordered parts (see \`src/prompts/README.md\`). */
export function buildContentArchitectSystemInstruction(): string {
  return [
    part1RoleAndBrandSoul(),
    part2VisualMoodAndThumbnailStrategy(),
    part3PersonaPillarsLanguage(),
    part4OutputDiscipline(),
  ].join("\n\n");
}

/** Cached system string for Gemini (single assembly at module load). */
export const CONTENT_ARCHITECT_SYSTEM = buildContentArchitectSystemInstruction();
