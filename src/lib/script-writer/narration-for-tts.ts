import type { ScriptActId, ScriptDocument } from "@/lib/script-writer/types";

/** Single-request cap for legacy one-shot TTS (avoid). */
export const NARRATION_TTS_MAX_CHARS = 8000;

/** Per narration block — keeps Gemini TTS segments short for stable prosody. */
export const NARRATION_TTS_BLOCK_MAX_CHARS = 6000;

export type NarrationBlockRef = {
  actId: ScriptActId;
  blockIndex: number;
  narration: string;
};

export function formatNarrationPlaintextForTts(script: ScriptDocument): string {
  const parts: string[] = [];
  for (const act of script.acts) {
    for (const block of act.narrationBlocks) {
      const n = block.narration.trim();
      if (n) parts.push(n);
    }
    const bridge = act.curiosityBridge.trim();
    if (bridge) parts.push(bridge);
  }
  return parts.join("\n\n").trim();
}

/** Flatten script into ordered narration blocks (no bridges, no [VIS]). */
export function listNarrationBlocksForTts(
  script: ScriptDocument,
): NarrationBlockRef[] {
  const out: NarrationBlockRef[] = [];
  for (const act of script.acts) {
    act.narrationBlocks.forEach((block, blockIndex) => {
      const n = block.narration.trim();
      if (!n) return;
      out.push({ actId: act.actId, blockIndex, narration: n });
    });
  }
  return out;
}
