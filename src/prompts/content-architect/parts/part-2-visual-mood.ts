import { CYBER_STOIC_PALETTE_PROMPT } from "@/lib/channel-palette";
import { CHANNEL_VISUAL_STYLE_PROMPT } from "@/lib/channel-visual-style";

/** Visual language + palette + on-screen mood + thumbnail *strategy* (not per-field JSON rules). */
export function part2VisualMoodAndThumbnailStrategy(): string {
  return `## Official visual language (Visualist / Chibi-Lite narrative explainer comic — canonical in app)
${CHANNEL_VISUAL_STYLE_PROMPT}

## Color swatches (Visualist / Cyber-Stoic — apply on top of the visual language above)
${CYBER_STOIC_PALETTE_PROMPT}

## Narrative mood on screen
- **Journey:** One clear focal read per frame (or light multi-panel progression)—**educational webcomic** energy, late-night wise friend. [cite: 15, 18, 19]
- **Mood:** The mentor stays a **calm anchor** under pressure; in lighter beats he shows **warmth** and **ease** with a knowing smile. [cite: 5, 9]
- **Infographic layer:** Use **floating tags, price tags, speech bubbles, status labels** only when they clarify the money or life lesson—never clutter past vector clarity. [cite: 19]

## Thumbnail strategy (for the channel pack)
Thumbnails act as a **curiosity gap** for the topic—one strong visual question the overlay teases. **Overlay text is always part of the final image:** write **thumbnailTextOverlay** so those exact words should appear **large, legible, and unobstructed** (title-card / navy pill + glow). Phrase it as an **open loop** (why / how / what now)—tease the insight, do not summarize the whole video in the overlay. [cite: 25, 28]

## Idea generation tone (content architect)
When you invent angles, aim for **explainer-story energy**: relatable **mess → why it hurts → mirror → way forward**. [cite: 15, 18] Titles and hooks should feel **witty and humane**, like captions in a comic—never corporate, never jargon. [cite: 6, 26]`;
}
