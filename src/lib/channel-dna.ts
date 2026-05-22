/**
 * Upgrade Life — **Channel DNA** anchor.
 *
 * Canonical reference: `Upgrade_Life_Final_DNA_v4.txt` in the project root.
 * Chibi-Lite / Visualist narrative explainer comic rules: `src/lib/channel-visual-style.ts` (keep in sync with DNA §4).
 * AI prompt layering (system vs schema vs user vs Imagen): `src/prompts/README.md`.
 * All agent prompts and marketing copy should align with that document.
 * Spoken / TTS performance layer: `src/prompts/vocal-dna.ts` (injected for Gemini TTS).
 */
export const CHANNEL_DNA_VERSION = "v5.0";
export const CHANNEL_DNA_SOURCE_FILE = "Upgrade_Life_DNA_v5.txt";
/** The thesis every video argues from — injected into agent prompts. */
export const CHANNEL_THESIS =
  "Your life isn't complicated — you are.";
/** In-repo reference still; style follows Chibi-Lite infographic comic + Cyber-Stoic (see channel-visual-style). */
export const CHANNEL_COMIC_REFERENCE_IMAGE = "/upgrade-life-comic-reference.png";
