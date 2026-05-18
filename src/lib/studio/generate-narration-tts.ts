import "server-only";

import { Buffer } from "node:buffer";

import { ApiError, GoogleGenAI, Modality } from "@google/genai";

import {
  parsePcmChannelsFromMime,
  parsePcmSampleRateFromMime,
  pcm16leToWav,
} from "@/lib/audio/pcm16le-to-wav";
import { NARRATION_TTS_MAX_CHARS } from "@/lib/script-writer/narration-for-tts";
import { VOCAL_DNA_TTS_SYSTEM_INSTRUCTION } from "@/prompts/vocal-dna";

export type GenerateNarrationTtsOptions = {
  /** Appended to the vocal DNA system instruction for this chunk only. */
  directorAddendum?: string;
  /** Defaults to {@link NARRATION_TTS_MAX_CHARS} (single-shot). Use block cap for per-block TTS. */
  maxInputChars?: number;
};

/**
 * Documented Gemini-TTS model IDs (Google Cloud Gemini-TTS / AI Studio).
 * Avoid undocumented `*-preview-tts` slugs — they can return HTTP 500 INTERNAL.
 */
const TTS_MODEL_FALLBACKS = [
  "gemini-2.5-flash-tts",
  "gemini-2.5-flash-lite-preview-tts",
  "gemini-3.1-flash-tts-preview",
] as const;

function ttsModelTryOrder(): string[] {
  const pinned = process.env.GEMINI_TTS_MODEL?.trim();
  if (!pinned) return [...TTS_MODEL_FALLBACKS];
  const rest = TTS_MODEL_FALLBACKS.filter((m) => m !== pinned);
  return [pinned, ...rest];
}

export type GenerateNarrationTtsResult =
  | { ok: true; mimeType: string; base64: string }
  | { ok: false; error: string };

function decodeGeminiBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64.replace(/\s/g, ""), "base64"));
}

function mimePrimary(m: string): string {
  return m.split(";")[0].trim().toLowerCase();
}

function isRawPcmMime(m: string): boolean {
  const p = mimePrimary(m);
  return (
    p === "audio/l16" ||
    p === "audio/pcm" ||
    p === "audio/raw" ||
    p === "audio/x-raw"
  );
}

/**
 * Combine audio inline parts.
 *
 * **Raw PCM** (`audio/l16`, etc.): sequential chunks are concatenated — valid PCM stream.
 *
 * **MP3, WAV, etc.**: **do not** concatenate bytes; that corrupts the container and the decoder
 * often sounds fine at first then degrades (dull / quiet / "filtered" tail). Use the **largest**
 * single part (usually the main synthesis).
 */
function collectInlineAudio(response: {
  candidates?: Array<{
    content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
  }>;
}): { mimeType: string; base64: string } | null {
  type Seg = { mimeType: string; bytes: Uint8Array };
  const segments: Seg[] = [];

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    const data = p.inlineData?.data;
    const m = p.inlineData?.mimeType;
    if (!data?.trim() || !m) continue;
    if (!m.toLowerCase().startsWith("audio/")) continue;
    segments.push({ mimeType: m, bytes: decodeGeminiBase64(data) });
  }

  if (segments.length === 0) return null;
  if (segments.length === 1) {
    const s = segments[0];
    return {
      mimeType: s.mimeType,
      base64: Buffer.from(s.bytes).toString("base64"),
    };
  }

  const firstMime = segments[0].mimeType;
  const allSameMime = segments.every((s) => mimePrimary(s.mimeType) === mimePrimary(firstMime));
  const allPcm = segments.every((s) => isRawPcmMime(s.mimeType));

  if (allSameMime && allPcm) {
    const total = segments.reduce((a, s) => a + s.bytes.length, 0);
    const merged = new Uint8Array(total);
    let o = 0;
    for (const s of segments) {
      merged.set(s.bytes, o);
      o += s.bytes.length;
    }
    return {
      mimeType: firstMime,
      base64: Buffer.from(merged).toString("base64"),
    };
  }

  const best = segments.reduce((a, s) =>
    s.bytes.length > a.bytes.length ? s : a,
  );
  return {
    mimeType: best.mimeType,
    base64: Buffer.from(best.bytes).toString("base64"),
  };
}

/**
 * Gemini often returns raw `audio/l16` PCM — browsers won't play that in `<audio>`.
 * Prefer MP3 via `responseMimeType`; otherwise wrap PCM as WAV (default 24 kHz mono).
 */
function normalizeGeminiAudioForBrowser(
  mimeType: string,
  base64: string,
): { mimeType: string; base64: string } {
  const primary = mimeType.split(";")[0].trim().toLowerCase();
  const bytes = decodeGeminiBase64(base64);
  if (bytes.length === 0) {
    return { mimeType: primary || "audio/wav", base64 };
  }

  const looksLikeWav =
    bytes.length > 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46;
  if (looksLikeWav) {
    return { mimeType: "audio/wav", base64 };
  }

  if (primary === "audio/wav" || primary === "audio/x-wav") {
    return { mimeType: "audio/wav", base64 };
  }

  if (primary === "audio/mpeg" || primary === "audio/mp3") {
    return { mimeType: "audio/mpeg", base64 };
  }

  const pcmish =
    primary === "audio/l16" ||
    primary === "audio/pcm" ||
    primary === "audio/raw" ||
    primary === "audio/x-raw";

  if (pcmish) {
    const fromMime = parsePcmSampleRateFromMime(mimeType);
    const rate =
      fromMime ??
      parseInt(process.env.GEMINI_TTS_PCM_SAMPLE_RATE || "24000", 10);
    const channels = pcmChannelsFromEnvOrMime(mimeType);
    const wav = wrapPcmWithChannelFallback(bytes, rate, channels);
    return {
      mimeType: "audio/wav",
      base64: Buffer.from(wav).toString("base64"),
    };
  }

  return { mimeType: primary || mimeType, base64 };
}

function shouldRetryDifferentResponseMime(e: unknown): boolean {
  if (!(e instanceof ApiError)) return false;
  if (e.status !== 400) return false;
  return /mime|mimetype|responseMimeType|invalid argument|INVALID_ARGUMENT/i.test(
    e.message,
  );
}

/** Prefer MP3 from the API so the browser decodes with its own codec (skips our PCM→WAV path). */
function responseMimeTypeAttempts(): (string | undefined)[] {
  const raw = process.env.GEMINI_TTS_RESPONSE_MIME?.trim().toLowerCase();
  if (raw === "" || raw === "off" || raw === "pcm" || raw === "l16") {
    return [undefined];
  }
  if (raw) return [raw];
  return ["audio/mp3", undefined];
}

function pcmChannelsFromEnvOrMime(mimeType: string): 1 | 2 {
  const env = process.env.GEMINI_TTS_PCM_CHANNELS?.trim();
  if (env === "2") return 2;
  if (env === "1") return 1;
  const fromMime = parsePcmChannelsFromMime(mimeType);
  if (fromMime) return fromMime;
  return 1;
}

function wrapPcmWithChannelFallback(
  bytes: Uint8Array,
  rate: number,
  preferred: 1 | 2,
): Uint8Array {
  const alt: 1 | 2 = preferred === 1 ? 2 : 1;
  try {
    return pcm16leToWav(bytes, rate, preferred);
  } catch (e1) {
    try {
      return pcm16leToWav(bytes, rate, alt);
    } catch {
      throw e1;
    }
  }
}

function isRetryableTtsFailure(e: unknown): boolean {
  if (!(e instanceof ApiError)) return false;
  if (e.status === 500) return true;
  return /INTERNAL|500/i.test(e.message);
}

/**
 * Gemini TTS: speaks `text` using Upgrade Life vocal DNA as system instruction.
 */
export async function generateNarrationTts(
  text: string,
  options?: GenerateNarrationTtsOptions,
): Promise<GenerateNarrationTtsResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "Narration text is empty." };
  }
  const maxLen = options?.maxInputChars ?? NARRATION_TTS_MAX_CHARS;
  if (trimmed.length > maxLen) {
    return {
      ok: false,
      error: `Narration is ${trimmed.length} characters; max per request is ${maxLen}.`,
    };
  }

  const systemInstructionBody =
    options?.directorAddendum?.trim()
      ? `${VOCAL_DNA_TTS_SYSTEM_INSTRUCTION}\n\n---\nBlock direction:\n${options.directorAddendum.trim()}`
      : VOCAL_DNA_TTS_SYSTEM_INSTRUCTION;

  const key = process.env.GEMINI_API_KEY;
  if (!key?.trim()) {
    return {
      ok: false,
      error:
        "Missing GEMINI_API_KEY. Add it to .env.local and restart the dev server.",
    };
  }

  const voiceName =
    process.env.GEMINI_TTS_VOICE?.trim() || "Charon";

  const ai = new GoogleGenAI({ apiKey: key });

  const attempts: string[] = [];
  const models = ttsModelTryOrder();

  const foldedLead = options?.directorAddendum?.trim()
    ? `Block direction: ${options.directorAddendum.trim()}\n\n`
    : "";
  /** If the API rejects `systemInstruction`, fold a short director cue into the user turn (still one `parts` text). */
  const userTextWithFoldedStyle = `${foldedLead}Read the following narration verbatim as a YouTube voice-over: calm, grounded, dry wit, second person, neutral international English, expressive pacing (not monotone). Keep presence through phrase endings — no heavy fade or dulling on the last words. Output only the spoken narration — do not add commentary.\n\n${trimmed}`;

  for (const model of models) {
    for (const useSystem of [true, false]) {
      try {
        const baseConfig = {
          ...(useSystem
            ? {
                systemInstruction: {
                  role: "system",
                  parts: [{ text: systemInstructionBody }],
                },
              }
            : {}),
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        };

        let response:
          | Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>
          | undefined;
        let lastMimeAttemptError: unknown;
        for (const responseMimeType of responseMimeTypeAttempts()) {
          try {
            response = await ai.models.generateContent({
              model,
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: useSystem ? trimmed : userTextWithFoldedStyle,
                    },
                  ],
                },
              ],
              config: {
                ...baseConfig,
                ...(responseMimeType
                  ? { responseMimeType }
                  : {}),
              },
            });
            lastMimeAttemptError = undefined;
            break;
          } catch (inner) {
            lastMimeAttemptError = inner;
            if (
              responseMimeType &&
              shouldRetryDifferentResponseMime(inner)
            ) {
              continue;
            }
            throw inner;
          }
        }
        if (response === undefined) {
          throw lastMimeAttemptError ?? new Error("TTS request produced no response");
        }

        const audio = collectInlineAudio(response);
        if (!audio) {
          attempts.push(
            `${model}${useSystem ? "" : " (no system)"}: no inline audio parts (empty or blocked response).`,
          );
          continue;
        }

        const playable = normalizeGeminiAudioForBrowser(
          audio.mimeType,
          audio.base64,
        );

        return {
          ok: true,
          mimeType: playable.mimeType,
          base64: playable.base64,
        };
      } catch (e) {
        const bit =
          e instanceof ApiError
            ? `${model}${useSystem ? "" : " (no system)"}: HTTP ${e.status} ${e.message}`
            : e instanceof Error
              ? `${model}${useSystem ? "" : " (no system)"}: ${e.message}`
              : `${model}${useSystem ? "" : " (no system)"}: ${String(e)}`;
        attempts.push(bit);

        if (useSystem && isRetryableTtsFailure(e)) {
          continue;
        }
        if (!useSystem) break;
      }
    }
  }

  return {
    ok: false,
    error: `All TTS attempts failed (${models.join(", ")}). ${attempts.join(" | ")}`,
  };
}
