import type { ScriptDocument } from "@/lib/script-writer/types";

/** Studio / editor export: [NAR] / [VIS] pairs, acts separated by a rule line. */
export function formatScriptAsNarVis(script: ScriptDocument): string {
  const lines: string[] = [`# ${script.workingTitle}`, ""];
  for (const act of script.acts) {
    lines.push(`## ${act.displayTitle} (${act.actId})`, "");
    for (const block of act.narrationBlocks) {
      lines.push(`[NAR]: ${block.narration.trim()}`, "");
      lines.push(`[VIS]: ${block.visualDescription.trim()}`, "");
    }
    lines.push(`[BRIDGE]: ${act.curiosityBridge.trim()}`, "");
    lines.push("---", "");
  }
  return lines.join("\n").trimEnd();
}

export function countNarrationWords(script: ScriptDocument): {
  perAct: Record<string, number>;
  total: number;
} {
  const perAct: Record<string, number> = {};
  let total = 0;
  for (const act of script.acts) {
    const words = act.narrationBlocks
      .map((b) => b.narration.trim().split(/\s+/).filter(Boolean).length)
      .reduce((a, b) => a + b, 0);
    perAct[act.actId] = words;
    total += words;
  }
  return { perAct, total };
}
