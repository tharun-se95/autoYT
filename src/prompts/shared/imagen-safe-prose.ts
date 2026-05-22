/**
 * Helpers for Imagen prompts — structured labels and markdown often render as on-image text.
 */

/** Remove markdown and collapse whitespace for model consumption (not for human docs). */
export function proseForImagen(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/\[cite:[^\]]*\]/gi, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\n-\s+/g, ". ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ken Burns still — style as flowing prose (no section headers or ALL CAPS labels). */
export const VIS_STILL_STYLE_PROSE = proseForImagen(
  [
    "Flat two-dimensional modern educational webcomic panel, thick clean black outlines, solid flat vector colors, minimal smooth cel shading, chibi-lite characters about two and a half heads tall with dot eyes and simple mouths.",
    "Draw like a cartoon illustration only — never photorealistic, never three-dimensional CGI, never sketchy pencil roughs.",
    "Each frame shows direct human experience shifting between messy daily chaos (clutter, warm red-orange stress accents, asymmetric layout, hunched secondary figures) and sorted peace (open negative space, balanced layout, warm amber glow, upright calm posture, one organized focal object).",
    "The recurring mentor host stays the same person every time: calm sage-green zip hoodie over brown plaid collar, khaki pants, dark shoes, light beard, pleasant or knowing expression — never panicking, sweating, tied up, or inside the chaos; he observes from outside or adjacent to the mess.",
    "Rich environment storytelling: clear foreground, midground subject, and background world — never a soft empty gradient as the whole scene.",
    "Artwork bleeds to all four edges of the widescreen frame with no outer comic panel border or black mat around the entire picture.",
  ].join(" "),
);

export const VIS_STILL_PALETTE_PROSE = proseForImagen(
  [
    "Deep navy and slate foundations, sage green on the mentor hoodie, neon cyan only for small clarity accents, warm amber for wins and sunset warmth, red and orange isolated to stress objects in the mess zone.",
  ].join(" "),
);

export const VIS_STILL_NO_TEXT_PROSE = proseForImagen(
  [
    "The picture must contain zero readable text anywhere: no words, letters, numbers, labels, captions, watermarks, speech bubbles, signs, product names, channel names, or technical metadata painted into the artwork.",
    "Screens, books, mugs, and signs stay blank or use simple abstract icons only.",
  ].join(" "),
);
