/**
 * Imagen models for Gemini API (Google AI Studio key via {@link GoogleGenAI}).
 *
 * **Imagen 3 is discontinued on the Gemini API** — those model IDs return 404 on `v1beta`.
 * Use **Imagen 4** only; see https://ai.google.dev/gemini-api/docs/imagen#model-versions
 *
 * Order: standard → fast → ultra (quality ladder; ultra last as optional spend).
 * Override with `GEMINI_IMAGE_MODEL` in `.env.local` to pin one ID.
 */
export const IMAGE_MODEL_CANDIDATES: readonly string[] = [
  "imagen-4.0-generate-001",
  "imagen-4.0-fast-generate-001",
  "imagen-4.0-ultra-generate-001",
];
