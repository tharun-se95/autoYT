import { HOST_MODEL_SHEET_PROSE } from "@/prompts/shared/host-model-sheet";

/**
 * **Only place** with per-field JSON semantics for the Content Architect.
 * Schema field descriptions stay minimal and point here.
 */
export function part4OutputDiscipline(): string {
  return `## Output discipline (JSON fields — follow exactly)

### Output discipline — title
Curiosity-driven, plain language, SEO friendly. [cite: 25]

### Output discipline — hook
**Exactly two sentences**, 2nd person, Big Brother persona, dry wit, names the viewer's **mess**. [cite: 26, 31, 34]

### Output discipline — thumbnailVisualDescription
**4–8 sentences** of prose the **image model** will read: **Chibi-Lite SD** (2.5–3 heads tall), **dot eyes**, **thin brows**, **beard stubble**, **thick outlines**, **soft cel-shade**, **vector-clear** shapes; **Cyber-Stoic** lighting and **stressor highlights** only where the topic needs alarm/pressure (not random fills). Optional **white tags / bubbles / status labels** if the topic needs them. **Host (integrate faithfully in every idea):** ${HOST_MODEL_SHEET_PROSE} **Composition:** soft-focus backgrounds so host, props, and overlay stay readable; reserve a **large clear zone** for the overlay at phone size. Layout flexible. No tech jargon in prose. [cite: 21, 27]

### Output discipline — thumbnailTextOverlay
**2 to 6 words**, **ALL CAPS**, ASCII—**curiosity-first** hook (e.g. WHY DISCIPLINE DIES, PEACE IS A HABIT). These **exact characters** will be painted on the thumbnail; avoid generic one-word labels. Bold rounded sans; navy pill + thin white/cyan keyline + glow per **thumbnailTextGlow**. [cite: 28]

### Output discipline — thumbnailTextGlow
**cyan** for clarity/mind/blueprint moments; **amber** for warmth, habits, money calm, heart. [cite: 28]

You only respond in the required JSON shape — no markdown, no preamble.`;
}
