"use server";

import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
  type Schema,
} from "@google/generative-ai";

import { LEAD_SCRIPTWRITER_SYSTEM } from "@/prompts/script-writer/build-system-instruction";
import { persistScriptDocument } from "@/lib/studio-db/persist";
import {
  formatValidationIssuesForModel,
  formatValidationIssuesForUser,
  isScriptBlockOpeningsValid,
  repairScriptBlockOpenings,
  validateScriptBlockOpenings,
} from "@/lib/script-writer/validate-block-openings";
import { normalizeScript } from "@/lib/script-writer/normalize-script-document";
import type { GenerateScriptResult, ScriptActId } from "@/lib/script-writer/types";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

const ACT_IDS: ScriptActId[] = [
  "mess",
  "deep_dive",
  "mirror",
  "way_forward",
];

const VISUAL_BEAT_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    phrase: {
      type: SchemaType.STRING,
      description:
        "Verbatim 1–5 words from the block narration where this visual triggers. For the FIRST beat in each block, this MUST be the opening words of that block's narration (no spoken setup before it).",
    },
    visualDescription: {
      type: SchemaType.STRING,
      description:
        "Ken Burns b-roll still: minimum 35 words. Must name shot type/angle, foreground/midground/background, presence setup (co-populated, environment-only, or mentor-only), and Daily Chaos vs Sorted Peace. Full environment — no gradient-only backgrounds. System visual-direction rules apply.",
    },
  },
  required: ["phrase", "visualDescription"],
} satisfies Schema;

const NARRATION_BLOCK_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    narration: {
      type: SchemaType.STRING,
      description:
        "Three to six spoken sentences (second person you). Longer blocks OK when the act needs depth. Use ... and — for TTS pause timing. MUST begin with visualBeats[0].phrase. Include every visualBeats phrase verbatim.",
    },
    visualBeats: {
      type: SchemaType.ARRAY,
      items: VISUAL_BEAT_SCHEMA,
      description:
        "Visual beats for this block: enough phrases that no beat covers more than ~5s of spoken narration (~3–5s target between cuts). Typically 2–4 beats on short blocks; 5–10+ on longer blocks. Each beat: phrase (1–5 words from narration) + visualDescription.",
    },
  },
  required: ["narration", "visualBeats"],
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
        "Ordered narration blocks. Enough blocks that narration in this act reaches ~500+ words total.",
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

function buildInitialUserText(trimmedBrief: string): string {
  return `Write the full script from this producer brief. Obey the **entire** system instruction (do not restate rules here).

---
${trimmedBrief}
---

Return JSON matching the schema: workingTitle, exactly four acts (mess, deep_dive, mirror, way_forward), each with enough narrationBlocks that **narration** in that act totals **~500+ words**, each block = **3–6 sentences** narration + enough **visualBeats** that no beat covers more than ~5s spoken (typically 2–4 beats on short blocks, more on long blocks), plus curiosityBridge per act. Use ... and — for pause timing in the narration.

**Block opening:** In every block, visualBeats[0].phrase must be the opening words of that block's narration (no spoken lines before the first visual).`;
}

function buildRetryUserText(trimmedBrief: string, issues: ReturnType<typeof validateScriptBlockOpenings>): string {
  return `Your previous JSON failed validation. Fix every block below and return the **complete** script JSON again.

Validation failures:
${formatValidationIssuesForModel(issues)}

Rules to fix:
- Each block's visualBeats[0].phrase must be the **first 1–5 words** of that block's narration.
- Every visualBeats phrase must appear verbatim in narration, in beat order.

Original producer brief:
---
${trimmedBrief}
---`;
}

async function requestScriptJson(
  trimmedBrief: string,
  userText: string,
  temperature: number,
): Promise<{ script: import("@/lib/script-writer/types").ScriptDocument | null; parseError: string | null }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key?.trim()) {
    return { script: null, parseError: "Missing GEMINI_API_KEY." };
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: LEAD_SCRIPTWRITER_SYSTEM,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userText }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseSchema: SCRIPT_RESPONSE_SCHEMA,
    },
  });

  const text = result.response.text();
  try {
    const parsed: unknown = JSON.parse(text);
    const script = normalizeScript(parsed);
    if (!script) {
      return {
        script: null,
        parseError:
          "Could not parse the script from the model. Try a shorter brief or run again.",
      };
    }
    return { script, parseError: null };
  } catch {
    return { script: null, parseError: "Model returned invalid JSON." };
  }
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

  try {
    let { script, parseError } = await requestScriptJson(
      trimmed,
      buildInitialUserText(trimmed),
      0.85,
    );

    if (!script) {
      return { ok: false, error: parseError ?? "Generation failed." };
    }

    if (!isScriptBlockOpeningsValid(script)) {
      const issues = validateScriptBlockOpenings(script);
      const retry = await requestScriptJson(
        trimmed,
        buildRetryUserText(trimmed, issues),
        0.5,
      );
      script = retry.script;
      parseError = retry.parseError;

      if (!script) {
        return { ok: false, error: parseError ?? "Retry generation failed." };
      }

      if (!isScriptBlockOpeningsValid(script)) {
        script = repairScriptBlockOpenings(script);
      }

      if (!isScriptBlockOpeningsValid(script)) {
        const retryIssues = validateScriptBlockOpenings(script);
        return {
          ok: false,
          error: `Script validation failed after retry. ${formatValidationIssuesForUser(retryIssues)}`,
        };
      }
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
