import "server-only";

import { readFile } from "node:fs/promises";

import type { VisualBeat } from "@/lib/script-writer/types";
import type { AlignedWord, BeatAlignment } from "@/lib/studio/audio-alignment-types";

// ---------------------------------------------------------------------------
// ElevenLabs Scribe v2 — raw API response shapes (minimal, only what we use)
// ---------------------------------------------------------------------------

type ScribeWord = {
  text: string;
  start?: number | null;
  end?: number | null;
  type: "word" | "spacing" | "audio_event";
};

type ScribeResponse = {
  words: ScribeWord[];
};

// ---------------------------------------------------------------------------
// API call
// ---------------------------------------------------------------------------

/**
 * Calls ElevenLabs Scribe v2 to transcribe the audio file at `audioAbsPath`
 * and returns word-level timestamps.
 *
 * Throws on network / auth / API error so the caller can fall back to Tier 2.
 */
export async function transcribeWordTimestamps(
  audioAbsPath: string,
): Promise<AlignedWord[]> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "ELEVENLABS_API_KEY is not set — cannot run Tier 3 forced alignment.",
    );
  }

  const audioBuffer = await readFile(audioAbsPath);

  // Build multipart/form-data manually via FormData (available in Node 18+)
  const form = new FormData();
  form.append("model_id", "scribe_v2");
  form.append("timestamps_granularity", "word");
  form.append("tag_audio_events", "false"); // skip [laughter] etc.
  form.append("language_code", "en");        // our content is always English
  form.append(
    "file",
    new Blob([audioBuffer], { type: "audio/wav" }),
    "audio.wav",
  );

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": key },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `ElevenLabs Scribe v2 failed (HTTP ${res.status}): ${body.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as ScribeResponse;

  // Filter to real spoken words only and normalise
  const words: AlignedWord[] = [];
  for (const w of data.words ?? []) {
    if (w.type !== "word") continue;
    const start = w.start ?? 0;
    const end = w.end ?? start;
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    words.push({
      word: normalizeToken(w.text),
      start,
      end,
    });
  }

  return words;
}

// ---------------------------------------------------------------------------
// Phrase-to-word alignment
// ---------------------------------------------------------------------------

/** Strip punctuation and lowercase a token for matching. */
function normalizeToken(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
] as const;

const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
] as const;

/** TTS often says "eight hundred" while the script phrase uses "800". */
function spellOutNumberToken(token: string): string[] | null {
  if (!/^\d+$/.test(token)) return null;
  const n = Number.parseInt(token, 10);
  if (!Number.isFinite(n) || n < 0 || n > 9999) return null;

  if (n < 20) return [ONES[n]!];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return ones === 0 ? [TENS[tens]!] : [TENS[tens]!, ONES[ones]!];
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    const out: string[] = [
      ONES[hundreds]!,
      hundreds === 1 ? "hundred" : "hundred",
    ];
    if (rest > 0) out.push(...(spellOutNumberToken(String(rest)) ?? []));
    return out;
  }

  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const out: string[] = [
    ...(spellOutNumberToken(String(thousands)) ?? []),
    thousands === 1 ? "thousand" : "thousand",
  ];
  if (rest > 0) out.push(...(spellOutNumberToken(String(rest)) ?? []));
  return out;
}

function expandPhraseTokens(tokens: string[]): string[] {
  const out: string[] = [];
  for (const t of tokens) {
    const spelled = spellOutNumberToken(t);
    if (spelled) out.push(...spelled);
    else out.push(t);
  }
  return out;
}

/** Token sequences to try, longest / most specific first. */
function phraseMatchVariants(phrase: string): string[][] {
  const raw = phrase
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);
  if (raw.length === 0) return [];

  const expanded = expandPhraseTokens(raw);
  const variants: string[][] = [];
  const seen = new Set<string>();

  const push = (seq: string[]) => {
    if (seq.length === 0) return;
    const key = seq.join("|");
    if (seen.has(key)) return;
    seen.add(key);
    variants.push(seq);
  };

  push(expanded);
  push(raw);
  for (let drop = 1; drop < raw.length; drop++) {
    push(expanded.slice(drop));
    push(raw.slice(drop));
  }

  return variants;
}

type PhraseHit = { startSec: number; cursorAfter: number };

function sequenceMatchesAt(
  words: AlignedWord[],
  startIndex: number,
  tokens: string[],
): boolean {
  if (tokens.length === 0) return false;
  let mismatches = 0;
  const maxMismatches =
    tokens.length <= 2 ? 0 : tokens.length <= 4 ? 1 : 2;

  for (let j = 0; j < tokens.length; j++) {
    const w = words[startIndex + j];
    if (!w) return false;
    if (w.word !== tokens[j]) {
      mismatches++;
      if (mismatches > maxMismatches) return false;
    }
  }
  return true;
}

function findPhraseInWords(
  words: AlignedWord[],
  cursor: number,
  variants: string[][],
): PhraseHit | null {
  for (const tokens of variants) {
    for (let i = cursor; i < words.length; i++) {
      if (!sequenceMatchesAt(words, i, tokens)) continue;
      return {
        startSec: words[i]!.start,
        cursorAfter: i + tokens.length,
      };
    }
  }
  return null;
}

/**
 * Maps each visualBeat's phrase to a time window in the word-level transcript.
 *
 * Sequential cursor — never backtracks. Tries full phrase sequences (with spoken-number
 * expansion) before falling back to Tier-2-style gaps for unmatched beats.
 */
export function alignBeatsToWords(
  words: AlignedWord[],
  visualBeats: VisualBeat[],
  totalAudioSec: number,
): BeatAlignment[] {
  if (visualBeats.length === 0) return [];
  if (words.length === 0) {
    const dur = totalAudioSec / visualBeats.length;
    return visualBeats.map((b, i) => ({
      beatIndex: i,
      phrase: b.phrase,
      startSec: i * dur,
      durationSec: dur,
    }));
  }

  type MatchResult =
    | { matched: true; startSec: number; cursorAfter: number }
    | { matched: false };

  const results: MatchResult[] = [];
  let cursor = 0;

  for (const beat of visualBeats) {
    const variants = phraseMatchVariants(beat.phrase);
    if (variants.length === 0) {
      results.push({ matched: false });
      continue;
    }

    const hit = findPhraseInWords(words, cursor, variants);
    if (hit) {
      results.push({
        matched: true,
        startSec: hit.startSec,
        cursorAfter: hit.cursorAfter,
      });
      cursor = hit.cursorAfter;
    } else {
      results.push({ matched: false });
    }
  }

  const starts: (number | null)[] = results.map((r) =>
    r.matched ? r.startSec : null,
  );

  const firstMatchedIndex = starts.findIndex((s) => s !== null);
  const firstMatchedStart =
    firstMatchedIndex >= 0 ? starts[firstMatchedIndex]! : totalAudioSec;

  const alignments: BeatAlignment[] = [];

  for (let i = 0; i < visualBeats.length; i++) {
    if (starts[i] !== null) {
      let nextStart = totalAudioSec;
      for (let j = i + 1; j < visualBeats.length; j++) {
        if (starts[j] !== null) {
          nextStart = starts[j]!;
          break;
        }
      }
      alignments.push({
        beatIndex: i,
        phrase: visualBeats[i].phrase,
        startSec: starts[i]!,
        durationSec: Math.max(0.5, nextStart - starts[i]!),
      });
      continue;
    }

    // Leading unmatched beats: share the gap before the first matched phrase
    if (firstMatchedIndex >= 0 && i < firstMatchedIndex) {
      const leadingUnmatched = firstMatchedIndex;
      const slot = Math.max(0.5, firstMatchedStart / leadingUnmatched);
      alignments.push({
        beatIndex: i,
        phrase: visualBeats[i].phrase,
        startSec: i * slot,
        durationSec: slot,
      });
      continue;
    }

    alignments.push({
      beatIndex: i,
      phrase: visualBeats[i].phrase,
      startSec: -1,
      durationSec: -1,
    });
  }

  // Trailing / sandwiched unmatched beats: equal slices in remaining gaps
  let i = 0;
  while (i < alignments.length) {
    if (alignments[i].durationSec >= 0) {
      i++;
      continue;
    }

    let j = i;
    while (j < alignments.length && alignments[j].durationSec < 0) j++;

    const gapStart =
      i > 0
        ? alignments[i - 1]!.startSec + alignments[i - 1]!.durationSec
        : 0;
    const gapEnd =
      j < alignments.length ? alignments[j]!.startSec : totalAudioSec;
    const gapLen = Math.max(0.5, gapEnd - gapStart);
    const slice = gapLen / (j - i);

    for (let k = i; k < j; k++) {
      alignments[k].startSec = gapStart + (k - i) * slice;
      alignments[k].durationSec = slice;
    }
    i = j;
  }

  return alignments;
}
