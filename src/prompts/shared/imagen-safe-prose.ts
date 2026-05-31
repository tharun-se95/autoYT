/**
 * Helpers for Imagen prompts — structured labels and markdown often render as on-image text.
 */

/** Remove markdown and collapse whitespace for model consumption. */
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

/**
 * Soften script [VIS] lines that often trip Imagen RAI (readable text, horror, violence).
 * Keeps scene intent; does not change style/palette blocks.
 */
export function sanitizeSceneForImagen(scene: string): string {
  let s = proseForImagen(scene);

  s = s.replace(
    /\b(displaying|display|reads?|reading|labeled|labelled|notification:?|message:?|says?)\s+['"][^'"]+['"]/gi,
    "showing a blank glowing notification shape with no letters",
  );
  s = s.replace(/\bcircles labeled\b/gi, "overlapping abstract color-coded circles");
  s = s.replace(/\blabeled\s+['"][^'"]+['"]/gi, "with simple abstract color zones");
  s = s.replace(/['"][A-Za-z][^'"]{2,48}['"]/g, "abstract symbolic marks");

  const replacements: [RegExp, string][] = [
    [/\bvampire[- ]like\b/gi, "cartoonishly energy-draining"],
    [/\bdemons\b/gi, "soft gray doubt silhouettes"],
    [/\bfight(ing)? back\b/gi, "standing calmly among"],
    [/\bhammered forcefully\b/gi, "pressed awkwardly"],
    [/\bfetal position\b/gi, "curled up resting"],
    [/\bmiserable\b/gi, "tired"],
    [/\bGhosted\b/gi, "a faded connection"],
    [/\btortured\b/gi, "melodramatic"],
    [/\bbrutally honest\b/gi, "direct"],
    [/\bscared\b/gi, "uncertain"],
    [/\bmistreatment\b/gi, "disrespect"],
    [/\btaking out money\b/gi, "emptying a wallet symbolically"],
  ];
  for (const [pattern, replacement] of replacements) {
    s = s.replace(pattern, replacement);
  }

  return s;
}

/** Still style — style as flowing prose (no section headers or ALL CAPS labels). */
export const VIS_STILL_STYLE_PROSE = proseForImagen(
  [
    "Flat two-dimensional cartoon vector webcomic style illustration, thick clean digital outlines, solid flat vector color values, soft single-layer cel-shading.",
    "Draw as cartoon digital art only — strictly avoid 3D renders, CGI effects, fuzzy textures, sketchy pencil lines, or textured highlights.",
    "Compositions must bleed fully to the edge of the widescreen 16:9 canvas with no panel borders, black frames, or mat borders.",
  ].join(" "),
);

export const VIS_STILL_PALETTE_PROSE = proseForImagen(
  [
    "Use a professional, clean, dynamic color palette centered on high-contrast foundations, primary accent highlights, neutral character garment colors, and friction stress colors.",
  ].join(" "),
);

export const VIS_STILL_NO_TEXT_PROSE = proseForImagen(
  [
    "The image must contain absolutely zero readable text: no words, letters, numbers, watermarks, tags, speech bubbles, captions, signs, or label tags inside the artwork.",
    "Do not paint or write any characters, alphabet letters, words, quotes, numbers, symbols, labels, or captions of any kind.",
    "Every whiteboard, paper, device screen, sign, computer monitor, tablet, or book page must be completely clean, blank, and empty of any written or drawn letters.",
    "If any object would normally have writing on it, paint it as a pure solid color or an abstract blank form with absolutely no readable letters.",
    "There are no letters, words, or text characters anywhere in this entire picture.",
  ].join(" "),
);
