import { registerPrompt } from "@/prompts/registry";
import { VOCAL_DNA_TTS_SYSTEM_INSTRUCTION } from "@/prompts/vocal-dna";

registerPrompt(
  "VOCAL_DNA_TTS_SYSTEM_INSTRUCTION",
  "v1.0",
  () => VOCAL_DNA_TTS_SYSTEM_INSTRUCTION,
);
