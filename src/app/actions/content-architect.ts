"use server";

import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
  type Schema,
} from "@google/generative-ai";

import { CONTENT_ARCHITECT_SYSTEM } from "@/lib/content-architect/system-prompt";
import { persistIdeaBatch } from "@/lib/studio-db/persist";
import { generateThumbnailImageCore } from "@/lib/thumbnail/generate-thumbnail-image-core";
import type {
  ContentPillar,
  GenerateIdeasResult,
  SavedStudioIdea,
  ThumbnailTextGlow,
  VideoIdea,
} from "@/lib/content-architect/types";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

const PILLAR_VALUES: ContentPillar[] = [
  "modern_mind",
  "sorted_finance",
  "biological_reset",
  "relationship_engineering",
];

const THUMBNAIL_GLOW_VALUES: ThumbnailTextGlow[] = ["cyan", "amber"];

const IDEA_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description:
        "YouTube title. Semantic rules live only in the system instruction — **Output discipline — title**.",
    },
    hook: {
      type: SchemaType.STRING,
      description:
        "Exactly 2 sentences, second person. Semantic rules: system **Output discipline — hook** and **Language rules** (no tech jargon).",
    },
    thumbnailVisualDescription: {
      type: SchemaType.STRING,
      description:
        "4–8 sentences of scene prose for Imagen (Visualist / Chibi-Lite 16:9 panel). Art, host, layout, bans: system **Output discipline — thumbnailVisualDescription** plus **Official visual language** and **Color swatches** (do not restate them here).",
    },
    thumbnailTextOverlay: {
      type: SchemaType.STRING,
      description:
        "2–6 words, ALL CAPS, ASCII. Semantic rules: system **Output discipline — thumbnailTextOverlay** only.",
    },
    thumbnailTextGlow: {
      type: SchemaType.STRING,
      format: "enum" as const,
      enum: THUMBNAIL_GLOW_VALUES,
      description:
        "Enum only. Meaning: system **Output discipline — thumbnailTextGlow**.",
    },
    pillar: {
      type: SchemaType.STRING,
      format: "enum" as const,
      enum: PILLAR_VALUES,
    },
  },
  required: [
    "title",
    "hook",
    "thumbnailVisualDescription",
    "thumbnailTextOverlay",
    "thumbnailTextGlow",
    "pillar",
  ],
} satisfies Schema;

const RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    ideas: {
      type: SchemaType.ARRAY,
      items: IDEA_SCHEMA,
    },
  },
  required: ["ideas"],
};

const MIN_TOPICS_LEN = 8;
const MAX_TOPICS_LEN = 8000;
const DEFAULT_COUNT = 6;
const MIN_COUNT = 3;
const MAX_COUNT = 12;

function isContentPillar(s: string): s is ContentPillar {
  return (
    s === "modern_mind" ||
    s === "sorted_finance" ||
    s === "biological_reset" ||
    s === "relationship_engineering"
  );
}

function isThumbnailTextGlow(s: string): s is ThumbnailTextGlow {
  return s === "cyan" || s === "amber";
}

function normalizeIdeas(raw: unknown): VideoIdea[] | null {
  if (!raw || typeof raw !== "object" || !("ideas" in raw)) return null;
  const ideas = (raw as { ideas: unknown }).ideas;
  if (!Array.isArray(ideas)) return null;
  const out: VideoIdea[] = [];
  for (const item of ideas) {
    if (!item || typeof item !== "object") return null;
    const o = item as Record<string, unknown>;
    const title = o.title;
    const hook = o.hook;
    const thumbnailVisualDescription = o.thumbnailVisualDescription;
    const thumbnailTextOverlay = o.thumbnailTextOverlay;
    const thumbnailTextGlow = o.thumbnailTextGlow;
    const pillar = o.pillar;
    if (typeof title !== "string" || typeof hook !== "string") return null;
    if (
      typeof thumbnailVisualDescription !== "string" ||
      !thumbnailVisualDescription.trim()
    )
      return null;
    if (
      typeof thumbnailTextOverlay !== "string" ||
      !thumbnailTextOverlay.trim()
    )
      return null;
    if (
      typeof thumbnailTextGlow !== "string" ||
      !isThumbnailTextGlow(thumbnailTextGlow)
    )
      return null;
    if (typeof pillar !== "string" || !isContentPillar(pillar)) return null;
    out.push({
      title: title.trim(),
      hook: hook.trim(),
      thumbnailVisualDescription: thumbnailVisualDescription.trim(),
      thumbnailTextOverlay: thumbnailTextOverlay.trim(),
      thumbnailTextGlow,
      pillar,
    });
  }
  return out;
}

/**
 * Calls Gemini with the Content Architect system prompt and returns structured video ideas.
 */
export async function generateVideoIdeas(
  topics: string,
  ideaCount: number = DEFAULT_COUNT
): Promise<GenerateIdeasResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key?.trim()) {
    return {
      ok: false,
      error:
        "Missing GEMINI_API_KEY. Add it to .env.local and restart the dev server.",
    };
  }

  const trimmed = topics.trim();
  if (trimmed.length < MIN_TOPICS_LEN) {
    return {
      ok: false,
      error: `Add a bit more context (at least ${MIN_TOPICS_LEN} characters).`,
    };
  }
  if (trimmed.length > MAX_TOPICS_LEN) {
    return {
      ok: false,
      error: `Topics are too long (max ${MAX_TOPICS_LEN} characters).`,
    };
  }

  const count = Math.min(
    MAX_COUNT,
    Math.max(MIN_COUNT, Math.floor(ideaCount) || DEFAULT_COUNT)
  );

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: CONTENT_ARCHITECT_SYSTEM,
  });

  const userText = `The viewer / producer listed these topics, themes, or seeds for upcoming videos. Turn them into ${count} strong, distinct video ideas.

---
${trimmed}
---

Return exactly ${count} ideas as JSON matching the response schema. Follow the **entire** system instruction (do not restate those rules here). Vary pillars when it fits the topics.`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 0.9,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = result.response.text();
    const parsed: unknown = JSON.parse(text);
    const ideas = normalizeIdeas(parsed);
    if (!ideas?.length) {
      return {
        ok: false,
        error: "Could not parse ideas from the model. Try again.",
      };
    }
    const persisted = await persistIdeaBatch(trimmed, ideas.length, ideas);
    if (!persisted) {
      return {
        ok: false,
        error:
          "Ideas were generated but could not be saved to the studio database. " +
          "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, apply migrations, and restart the dev server.",
      };
    }

    const ideasWithThumbnails: SavedStudioIdea[] = [];
    for (const row of persisted.ideas) {
      const thumb = await generateThumbnailImageCore(
        {
          visualDescription: row.thumbnailVisualDescription,
          textOverlay: row.thumbnailTextOverlay,
          textGlow: row.thumbnailTextGlow,
        },
        { generatedIdeaId: row.id }
      );
      if (!thumb.ok) {
        console.error(
          `[content-architect] Thumbnail for idea ${row.id}:`,
          thumb.error
        );
        ideasWithThumbnails.push({
          ...row,
          thumbnailDbEventId: null,
          thumbnailLocalRelativePath: null,
        });
      } else {
        ideasWithThumbnails.push({
          ...row,
          thumbnailDbEventId: thumb.dbEventId ?? null,
          thumbnailLocalRelativePath: thumb.localRelativePath ?? null,
        });
      }
    }

    return { ok: true, runId: persisted.runId, ideas: ideasWithThumbnails };
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
