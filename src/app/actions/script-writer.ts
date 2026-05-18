"use server";

import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
  type Schema,
} from "@google/generative-ai";

import { LEAD_SCRIPTWRITER_SYSTEM } from "@/prompts/script-writer/build-system-instruction";
import { persistScriptDocument } from "@/lib/studio-db/persist";
import type {
  ScriptAct,
  ScriptActId,
  ScriptDocument,
  GenerateScriptResult,
} from "@/lib/script-writer/types";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

const ACT_IDS: ScriptActId[] = [
  "mess",
  "deep_dive",
  "mirror",
  "way_forward",
];

const NARRATION_BLOCK_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    narration: {
      type: SchemaType.STRING,
      description:
        "Exactly two spoken sentences (phrase-to-frame unit). Second person you. Semantic rules: system instruction only.",
    },
    visualDescription: {
      type: SchemaType.STRING,
      description:
        "One 16:9 Visualist / Chibi-Lite narrative explainer panel for Ken Burns after the narration above (Daily Chaos vs Sorted Peace, palette + CHARACTER LOCK in system).",
    },
  },
  required: ["narration", "visualDescription"],
} satisfies Schema;

const ACT_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    actId: {
      type: SchemaType.STRING,
      format: "enum" as const,
      enum: ACT_IDS,
      description: "Act key; must appear once each across the four acts.",
    },
    displayTitle: {
      type: SchemaType.STRING,
      description: "Human title for the act (e.g. The Mess).",
    },
    narrationBlocks: {
      type: SchemaType.ARRAY,
      items: NARRATION_BLOCK_SCHEMA,
      description:
        "Ordered narration+visual pairs. Enough blocks that narration in this act reaches ~500+ words total.",
    },
    curiosityBridge: {
      type: SchemaType.STRING,
      description: "End-of-act binge hook. Semantic rules: system instruction.",
    },
  },
  required: ["actId", "displayTitle", "narrationBlocks", "curiosityBridge"],
} satisfies Schema;

const SCRIPT_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    workingTitle: { type: SchemaType.STRING },
    acts: {
      type: SchemaType.ARRAY,
      items: ACT_SCHEMA,
    },
  },
  required: ["workingTitle", "acts"],
};

const MIN_BRIEF = 24;
const MAX_BRIEF = 8000;

function isScriptActId(s: string): s is ScriptActId {
  return (
    s === "mess" ||
    s === "deep_dive" ||
    s === "mirror" ||
    s === "way_forward"
  );
}

function normalizeScript(raw: unknown): ScriptDocument | null {
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
      if (
        typeof nb.visualDescription !== "string" ||
        !nb.visualDescription.trim()
      )
        return null;
      narrationBlocks.push({
        narration: nb.narration.trim(),
        visualDescription: nb.visualDescription.trim(),
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

/**
 * Generates a full four-act narration script with paired comic stills (JSON),
 * then the UI can export [NAR]/[VIS] tags.
 */
export async function generateScript(
  episodeBrief: string
): Promise<GenerateScriptResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key?.trim()) {
    return {
      ok: false,
      error:
        "Missing GEMINI_API_KEY. Add it to .env.local and restart the dev server.",
    };
  }

  const trimmed = episodeBrief.trim();
  if (trimmed.length < MIN_BRIEF) {
    return {
      ok: false,
      error: `Add more context for the episode (at least ${MIN_BRIEF} characters).`,
    };
  }
  if (trimmed.length > MAX_BRIEF) {
    return {
      ok: false,
      error: `Brief is too long (max ${MAX_BRIEF} characters).`,
    };
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: LEAD_SCRIPTWRITER_SYSTEM,
  });

  const userText = `Write the full script from this producer brief. Obey the **entire** system instruction (do not restate rules here).

---
${trimmed}
---

Return JSON matching the schema: workingTitle, exactly four acts (mess, deep_dive, mirror, way_forward), each with enough narrationBlocks that **narration** in that act totals **~500+ words**, each block = two sentences narration + one visualDescription, plus curiosityBridge per act.`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: SCRIPT_RESPONSE_SCHEMA,
      },
    });

    const text = result.response.text();
    const parsed: unknown = JSON.parse(text);
    const script = normalizeScript(parsed);
    if (!script) {
      return {
        ok: false,
        error:
          "Could not parse the script from the model. Try a shorter brief or run again.",
      };
    }
    void persistScriptDocument(trimmed, script).catch((err) => {
      console.error("[script-writer] Supabase persist:", err);
    });
    return { ok: true, script };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return {
      ok: false,
      error: message.includes("API key")
        ? "Gemini rejected the API key. Check GEMINI_API_KEY in .env.local."
        : `Generation failed: ${message}`,
    };
  }
}
