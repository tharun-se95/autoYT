import type { ScriptAct, ScriptActId, ScriptDocument } from "@/lib/script-writer/types";

const ACT_IDS: ScriptActId[] = [
  "mess",
  "deep_dive",
  "mirror",
  "way_forward",
];

function isScriptActId(s: string): s is ScriptActId {
  return (
    s === "mess" ||
    s === "deep_dive" ||
    s === "mirror" ||
    s === "way_forward"
  );
}

export function normalizeScript(raw: unknown): ScriptDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const workingTitle = o.workingTitle;
  const acts = o.acts;
  if (typeof workingTitle !== "string" || !workingTitle.trim()) return null;
  if (!Array.isArray(acts) || acts.length !== 4) return null;

  const parsed: ScriptAct[] = [];
  for (const item of acts) {
    if (!item || typeof item !== "object") return null;
    const a = item as Record<string, unknown>;
    if (typeof a.actId !== "string" || !isScriptActId(a.actId)) return null;
    if (typeof a.displayTitle !== "string" || !a.displayTitle.trim())
      return null;
    if (typeof a.curiosityBridge !== "string" || !a.curiosityBridge.trim())
      return null;
    const blocks = a.narrationBlocks;
    if (!Array.isArray(blocks) || blocks.length < 1) return null;
    const narrationBlocks: ScriptAct["narrationBlocks"] = [];
    for (const b of blocks) {
      if (!b || typeof b !== "object") return null;
      const nb = b as Record<string, unknown>;
      if (typeof nb.narration !== "string" || !nb.narration.trim())
        return null;

      const visualBeats: { phrase: string; visualDescription: string }[] = [];
      if (Array.isArray(nb.visualBeats)) {
        for (const beat of nb.visualBeats) {
          if (!beat || typeof beat !== "object") return null;
          const vBeat = beat as Record<string, unknown>;
          if (typeof vBeat.phrase !== "string" || typeof vBeat.visualDescription !== "string")
            return null;
          visualBeats.push({
            phrase: vBeat.phrase.trim(),
            visualDescription: vBeat.visualDescription.trim(),
          });
        }
      }

      if (visualBeats.length === 0 && typeof nb.visualDescription === "string" && nb.visualDescription.trim()) {
        visualBeats.push({
          phrase: nb.narration.trim().split(" ").slice(0, 4).join(" ") + "...",
          visualDescription: nb.visualDescription.trim(),
        });
      }

      if (visualBeats.length === 0) return null;

      narrationBlocks.push({
        narration: nb.narration.trim(),
        ...(typeof nb.visualDescription === "string" ? { visualDescription: nb.visualDescription.trim() } : {}),
        visualBeats,
      });
    }
    parsed.push({
      actId: a.actId,
      displayTitle: a.displayTitle.trim(),
      narrationBlocks,
      curiosityBridge: a.curiosityBridge.trim(),
    });
  }

  const ids = new Set(parsed.map((p) => p.actId));
  if (ids.size !== 4) return null;
  for (const id of ACT_IDS) {
    if (!ids.has(id)) return null;
  }

  parsed.sort(
    (x, y) => ACT_IDS.indexOf(x.actId) - ACT_IDS.indexOf(y.actId)
  );

  return { workingTitle: workingTitle.trim(), acts: parsed };
}
