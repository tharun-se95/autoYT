"use server";

import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
  type Schema,
} from "@google/generative-ai";

import "@/prompts/init";
import {
  DEFAULT_PROMPT_VERSIONS,
  getPrompt,
  getPromptWithFallback,
} from "@/prompts/registry";
import { persistScriptDocument } from "@/lib/studio-db/persist";
import { createServiceSupabase } from "@/lib/supabase/admin-client";
import {
  isScriptBlockOpeningsValid,
  repairScriptBlockOpenings,
} from "@/lib/script-writer/validate-block-openings";
import { normalizeScript } from "@/lib/script-writer/normalize-script-document";
import type { GenerateScriptResult, ScriptAct, ScriptActId } from "@/lib/script-writer/types";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const AUDIT_PASS_THRESHOLD = 8;
const MAX_ACT_AUDIT_ATTEMPTS = 3;

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
        "Widescreen visual b-roll still description: minimum 35 words. Must name shot type/angle, environment layers (foreground/midground/background), presence setup (co-populated, environment-only, or mentor-only). Use simplified visual styles (metaphors, typography concept cards, symbolic items) to keep character outfits and look identical.",
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

const OUTLINE_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    workingTitle: { type: SchemaType.STRING },
    narrativeArchetype: { type: SchemaType.STRING },
    acts: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          actId: { type: SchemaType.STRING },
          displayTitle: { type: SchemaType.STRING },
          theme: { type: SchemaType.STRING },
          miniExamples: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          targetWordCount: { type: SchemaType.INTEGER },
        },
        required: ["actId", "displayTitle", "theme", "miniExamples", "targetWordCount"],
      },
    },
  },
  required: ["workingTitle", "narrativeArchetype", "acts"],
};

const ACT_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    actId: { type: SchemaType.STRING },
    displayTitle: { type: SchemaType.STRING },
    narrationBlocks: {
      type: SchemaType.ARRAY,
      items: NARRATION_BLOCK_SCHEMA,
    },
    curiosityBridge: { type: SchemaType.STRING },
  },
  required: ["actId", "displayTitle", "narrationBlocks", "curiosityBridge"],
};

/** Pre-flight audit response from the Hook Architect & Pacing Evaluator consultant. */
const AUDIT_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    passed: {
      type: SchemaType.BOOLEAN,
      description:
        "True only when hook, pacing, and visualComposition scores are all >= 8.",
    },
    scores: {
      type: SchemaType.OBJECT,
      properties: {
        hook: {
          type: SchemaType.INTEGER,
          description: "Verbal hook retention score 0–10.",
        },
        pacing: {
          type: SchemaType.INTEGER,
          description: "Dynamic visual beat pacing score 0–10.",
        },
        visualComposition: {
          type: SchemaType.INTEGER,
          description: "Visual still composition and medium discipline score 0–10.",
        },
      },
      required: ["hook", "pacing", "visualComposition"],
    },
    critiques: {
      type: SchemaType.OBJECT,
      properties: {
        hook: {
          type: SchemaType.STRING,
          description: "Blunt critique of verbal hook quality.",
        },
        pacing: {
          type: SchemaType.STRING,
          description: "Blunt critique of trigger phrase intervals and beat density.",
        },
        visualComposition: {
          type: SchemaType.STRING,
          description:
            "Blunt critique of foreground/midground/background layers, lighting, and medium discipline.",
        },
      },
      required: ["hook", "pacing", "visualComposition"],
    },
    directorsInstruction: {
      type: SchemaType.STRING,
      description:
        "Single imperative paragraph of numbered action items for the scriptwriter rewrite.",
    },
  },
  required: ["passed", "scores", "critiques", "directorsInstruction"],
};

type AuditScores = {
  hook: number;
  pacing: number;
  visualComposition: number;
};

type ConsultantAuditResult = {
  passed: boolean;
  scores: AuditScores;
  critiques: {
    hook: string;
    pacing: string;
    visualComposition: string;
  };
  directorsInstruction: string;
};

function auditScoresPass(scores: AuditScores): boolean {
  return (
    scores.hook >= AUDIT_PASS_THRESHOLD &&
    scores.pacing >= AUDIT_PASS_THRESHOLD &&
    scores.visualComposition >= AUDIT_PASS_THRESHOLD
  );
}

const MIN_BRIEF = 24;
const MAX_BRIEF = 8000;

/**
 * Orchestrates an act-by-act script generation pipeline using Gemini 2.0.
 * Eliminates context drift and output token limitation bugs.
 */
export async function generateScript(
  episodeBrief: string,
  mode: "long" | "short" | "test" = "long",
  channelId?: string | null
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
    const genAI = new GoogleGenerativeAI(key);

    // Fetch channel details if channelId is provided to make outline and script domain-agnostic
    let channelName = "Minimalist Video Explainer";
    let channelBrief = "Minimalist philosophy, intentional living, and subtraction.";
    let channelVisualNotes = "Clean, high-contrast flat graphic minimal illustration style.";
    let hostProse = "A friendly, calm, and highly expressive animated character who guides the viewer.";

    if (channelId) {
      const supabase = createServiceSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from("channels")
          .select("*")
          .eq("id", channelId)
          .maybeSingle();
        if (!error && data) {
          channelName = data.name || channelName;
          channelBrief = data.generation_brief || channelBrief;
          channelVisualNotes = data.visual_style_notes || channelVisualNotes;
        }
      }
      
      const customHost = await getPromptWithFallback(
        "HOST_MODEL_SHEET_PROSE",
        "v1.0",
        channelId
      );
      if (customHost && customHost.trim()) {
        hostProse = customHost;
      }
    }
    
    // CRITICAL FIX: Add channelId to cache key hashing to prevent different channels from bleeding scripts!
    const episodeHash = crypto.createHash("sha256").update(trimmed + "_" + mode + "_" + (channelId || "default")).digest("hex");
    const cacheDir = path.join(process.cwd(), ".cache/episodes", episodeHash);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Step 1: Generate Episode Outline
    let outlineJson;
    const outlinePath = path.join(cacheDir, "outline.json");
    
    if (fs.existsSync(outlinePath)) {
      console.info("[script-writer] Pipeline Step 1: Loading cached structural outline...");
      outlineJson = JSON.parse(fs.readFileSync(outlinePath, "utf-8"));
    } else {
      console.info("[script-writer] Pipeline Step 1: Compiling structural outline...");
      
      const rawOutlinePrompt = await getPromptWithFallback(
        "OUTLINE_WRITER_SYSTEM",
        DEFAULT_PROMPT_VERSIONS.OUTLINE_WRITER_SYSTEM,
        channelId
      );
      
      const compiledOutlinePrompt = rawOutlinePrompt
        .replace(/{CHANNEL_NAME}/g, channelName)
        .replace(/{CHANNEL_BRIEF}/g, channelBrief)
        .replace(/{CHANNEL_VISUAL_STYLE}/g, channelVisualNotes);
      
      const outlineConstraint = 
        mode === "short" ? "\n\nCRITICAL CONSTRAINTS FOR SHORT-FORM VIDEO (9:16):\n- Generate an outline with exactly 1 or 2 acts total. Design the act names and IDs dynamically to fit the topic and channel focus perfectly (do not force 'mess' or 'way_forward').\n- Specify a target word count of 100-120 words total across the whole script." :
        mode === "test" ? "\n\nCRITICAL CONSTRAINTS FOR RAPID PIPELINE TEST VIDEO:\n- Generate an outline with exactly 2 acts total. Design the act names and IDs dynamically to fit the topic and channel focus perfectly (do not force 'mess' or 'way_forward').\n- Specify a target word count of 60-80 words total across the whole script (30-40 words per act)." : "";
        
      const outlineModel = genAI.getGenerativeModel({
        model: MODEL,
        systemInstruction: compiledOutlinePrompt + outlineConstraint,
      });
      
      const outlineUserText = `Create a robust structured outline for this episode brief:\n\n${trimmed}`;
      const outlineResponse = await outlineModel.generateContent({
        contents: [{ role: "user", parts: [{ text: outlineUserText }] }],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: "application/json",
          responseSchema: OUTLINE_RESPONSE_SCHEMA,
        },
      });
      
      outlineJson = JSON.parse(outlineResponse.response.text());
      const tmpPath = `${outlinePath}.${crypto.randomUUID()}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(outlineJson, null, 2), "utf-8");
      fs.renameSync(tmpPath, outlinePath);
      console.info(`[script-writer] Outline completed. Archetype selected: ${outlineJson.narrativeArchetype}`);
    }

    // Step 2: Act-by-Act Sequential Loop
    const generatedActs: ScriptAct[] = [];
    
    const rawActPrompt = await getPromptWithFallback(
      "ACT_WRITER_SYSTEM",
      DEFAULT_PROMPT_VERSIONS.ACT_WRITER_SYSTEM,
      channelId
    );
    
    const compiledActPrompt = rawActPrompt
      .replace(/{CHANNEL_NAME}/g, channelName)
      .replace(/{CHANNEL_BRIEF}/g, channelBrief)
      .replace(/{CHANNEL_VISUAL_STYLE}/g, channelVisualNotes)
      .replace(/{HOST_PROSE}/g, hostProse);
    
    const actConstraint = 
      mode === "short" ? "\n\nCRITICAL CONSTRAINTS FOR SHORT-FORM VIDEO (9:16):\n- Keep narration extremely punchy, rhythmic, and conversational. Limit the entire act to exactly 1 narration block.\n- The narration block should contain no more than 4-5 short sentences (max 50 words total for the block).\n- Include exactly 3 to 4 rapid, high-retention visual beats for the block. Each beat maps to a specific short phrase (2-3 words) of the narration, triggering a new visual cut every 2 to 3 seconds to keep pacing fast and engaging." :
      mode === "test" ? "\n\nCRITICAL CONSTRAINTS FOR RAPID PIPELINE TEST VIDEO:\n- Keep narration extremely brief and direct. Limit the entire act to exactly 1 narration block.\n- The narration block should contain no more than 3 short sentences (max 30-40 words total for the block).\n- Include exactly 3 to 4 rapid, high-retention visual beats for the block. Each beat maps to a specific short phrase (2-3 words) of the narration, triggering a new visual cut every 2 to 3 seconds to keep pacing fast and engaging." : "";
      
    const actModel = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: compiledActPrompt + actConstraint,
    });

    const rawConsultantPrompt = await getPromptWithFallback(
      "CONSULTANT_AUDIT_SYSTEM",
      DEFAULT_PROMPT_VERSIONS.CONSULTANT_AUDIT_SYSTEM,
      channelId
    );

    const totalActs = outlineJson.acts.length;

    for (let i = 0; i < totalActs; i++) {
      const actOutline = outlineJson.acts[i];
      const actPath = path.join(cacheDir, `act_${actOutline.actId}.json`);

      if (fs.existsSync(actPath)) {
        console.info(`[script-writer] Pipeline Step 2.${i + 1}: Loading cached Act "${actOutline.actId}" (${actOutline.displayTitle})...`);
        const actJson = JSON.parse(fs.readFileSync(actPath, "utf-8")) as ScriptAct;
        generatedActs.push(actJson);
        continue;
      }

      console.info(`[script-writer] Pipeline Step 2.${i + 1}: Writing Act "${actOutline.actId}" (${actOutline.displayTitle})...`);

      const isOpeningAct = i === 0;
      const compiledConsultantPrompt = rawConsultantPrompt
        .replace(/{CHANNEL_NAME}/g, channelName)
        .replace(/{CHANNEL_BRIEF}/g, channelBrief)
        .replace(/{CHANNEL_VISUAL_STYLE}/g, channelVisualNotes)
        .replace(/{ACT_POSITION}/g, isOpeningAct ? "Opening Act (Hook Zone)" : `Middle/Closing Act ${i + 1}`)
        .replace(/{ACT_NUMBER}/g, String(i + 1))
        .replace(/{TOTAL_ACTS}/g, String(totalActs))
        .replace(/{IS_OPENING_ACT}/g, isOpeningAct ? "YES" : "NO");

      const consultantModel = genAI.getGenerativeModel({
        model: MODEL,
        systemInstruction: compiledConsultantPrompt,
      });

      // Inject preceding generated narration context for seamless continuity
      const historyContext = generatedActs
        .map((act, idx) => {
          return `### Previously Generated Act ${idx + 1}: ${act.displayTitle}\n${act.narrationBlocks.map((b) => b.narration).join("\n")}`;
        })
        .join("\n\n");

      const directorInstructions: string[] = [];
      let actJson: ScriptAct | null = null;

      for (let attempt = 1; attempt <= MAX_ACT_AUDIT_ATTEMPTS; attempt++) {
        const actUserText = [
          `Write Act ${i + 1} of the script based on this blueprint:`,
          `Episode Brief: ${trimmed}`,
          `Narrative Archetype: ${outlineJson.narrativeArchetype}`,
          `Act Blueprint:`,
          `- Act ID: ${actOutline.actId}`,
          `- Title: ${actOutline.displayTitle}`,
          `- Core Focus: ${actOutline.theme}`,
          `- Concrete Examples to weave in: ${actOutline.miniExamples.join(", ")}`,
          `- Word Target: ~${actOutline.targetWordCount} words`,
          historyContext
            ? `\n--- PRECEDING SCRIPT HISTORY (maintain absolute character tone & context flow): ---\n${historyContext}\n--- END PRECEDING HISTORY ---`
            : "",
          `\nProvide narrationBlocks containing 3-6 sentences per block and detailed visual beats supporting dynamic scene-to-scene pacing (no still runs >5s).`,
          ...directorInstructions.map(
            (instruction) =>
              `\n--- DIRECTOR'S INSTRUCTION (mandatory rewrite fixes from Executive Consultant): ---\n${instruction}\n--- END DIRECTOR'S INSTRUCTION ---`
          ),
        ].join("\n");

        const actResponse = await actModel.generateContent({
          contents: [{ role: "user", parts: [{ text: actUserText }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseSchema: ACT_RESPONSE_SCHEMA,
          },
        });

        actJson = JSON.parse(actResponse.response.text()) as ScriptAct;

        console.info(
          `[script-writer] Hook Architect audit for Act "${actOutline.actId}" (attempt ${attempt}/${MAX_ACT_AUDIT_ATTEMPTS})...`
        );

        const auditUserText = [
          `Audit this act JSON for pre-flight approval. Episode brief for context:\n${trimmed}`,
          `\nAct JSON to audit:\n${JSON.stringify(actJson, null, 2)}`,
        ].join("\n");

        const auditResponse = await consultantModel.generateContent({
          contents: [{ role: "user", parts: [{ text: auditUserText }] }],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            responseSchema: AUDIT_RESPONSE_SCHEMA,
          },
        });

        const audit = JSON.parse(
          auditResponse.response.text()
        ) as ConsultantAuditResult;

        if (auditScoresPass(audit.scores)) {
          console.info(
            `[script-writer] Act "${actOutline.actId}" passed audit (hook=${audit.scores.hook}, pacing=${audit.scores.pacing}, visual=${audit.scores.visualComposition})`
          );
          break;
        }

        console.warn(
          `[script-writer] Act "${actOutline.actId}" failed audit (attempt ${attempt}/${MAX_ACT_AUDIT_ATTEMPTS}):`
        );
        console.warn(`  Hook (${audit.scores.hook}/10): ${audit.critiques.hook}`);
        console.warn(`  Pacing (${audit.scores.pacing}/10): ${audit.critiques.pacing}`);
        console.warn(
          `  Visual (${audit.scores.visualComposition}/10): ${audit.critiques.visualComposition}`
        );

        if (attempt < MAX_ACT_AUDIT_ATTEMPTS) {
          directorInstructions.push(audit.directorsInstruction);
          console.info(
            `[script-writer] Appending Director's Instruction and triggering rewrite...`
          );
        } else {
          console.warn(
            `[script-writer] Max audit attempts reached for Act "${actOutline.actId}" — proceeding with best effort.`
          );
        }
      }

      if (!actJson) {
        throw new Error(`Act "${actOutline.actId}" generation produced no output.`);
      }

      const tmpActPath = `${actPath}.${crypto.randomUUID()}.tmp`;
      fs.writeFileSync(tmpActPath, JSON.stringify(actJson, null, 2), "utf-8");
      fs.renameSync(tmpActPath, actPath);

      generatedActs.push(actJson);
    }

    // Combine and normalize full ScriptDocument
    let script = {
      workingTitle: outlineJson.workingTitle,
      acts: generatedActs,
    };

    // Run synchronization repairs
    if (!isScriptBlockOpeningsValid(script)) {
      console.info("[script-writer] Synchronizing beat openings...");
      script = repairScriptBlockOpenings(script);
    }

    // Persist output
    void persistScriptDocument(trimmed, script).catch((err) => {
      console.error("[script-writer] Supabase persist:", err);
    });

    return { ok: true, script };
  } catch (e) {
    console.error("[script-writer] Pipeline failed:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return {
      ok: false,
      error: message.includes("API key")
        ? "Gemini rejected the API key. Check GEMINI_API_KEY in .env.local."
        : `Sequential pipeline failed: ${message}`,
    };
  }
}
