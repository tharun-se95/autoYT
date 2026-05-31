import { registerPrompt } from "@/prompts/registry";
import { buildContentArchitectSystemInstruction } from "@/prompts/content-architect/build-system-instruction";

registerPrompt(
  "CONTENT_ARCHITECT_SYSTEM",
  "v1.0",
  buildContentArchitectSystemInstruction,
);
