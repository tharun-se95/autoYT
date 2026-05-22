/**
 * Shared types for Tier 3 Forced Alignment (ElevenLabs Scribe v2).
 * No runtime imports — safe to use in any module.
 */

/** A single word returned by ElevenLabs Scribe v2, normalized for matching. */
export type AlignedWord = {
  /** Lowercase, punctuation-stripped text of the word. */
  word: string;
  /** Start time in seconds from the beginning of the audio. */
  start: number;
  /** End time in seconds from the beginning of the audio. */
  end: number;
};

/** The resolved timing for one visual beat, after aligning its phrase to the transcript. */
export type BeatAlignment = {
  beatIndex: number;
  /** The original phrase from the script's visualBeats[]. */
  phrase: string;
  /** Exact second in the audio where this beat's phrase begins. */
  startSec: number;
  /** Duration in seconds — spans from this beat's start to the next beat's start (or audio end). */
  durationSec: number;
};

/**
 * On-disk sidecar JSON file stored alongside the audio as `{audio}.alignment.json`.
 * Cached to avoid repeated Scribe v2 API calls on every render.
 */
export type AlignmentSidecar = {
  /** Schema version — bump if the structure changes. */
  version: 1;
  /** mtimeMs of the audio file at the time this sidecar was generated. Used for invalidation. */
  audioMtimeMs: number;
  /** Full word list from Scribe v2. */
  words: AlignedWord[];
  /** Resolved per-beat timings. */
  beats: BeatAlignment[];
};
