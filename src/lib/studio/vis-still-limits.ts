/** Minimum scene prose length before calling Imagen for a [VIS] still. */
export const VIS_STILL_MIN_CHARS = 40;

/** Scriptwriter contract: rich cinematic scene descriptions (see build-system-instruction). */
export const VIS_STILL_MIN_WORDS = 35;

/** Guardrail for extremely long [VIS] strings in the API body. */
export const VIS_STILL_MAX_CHARS = 8000;

export function countVisStillWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function isVisStillDescriptionEligible(visualDescription: string): boolean {
  const t = visualDescription.trim();
  if (t.length < VIS_STILL_MIN_CHARS) return false;
  if (countVisStillWords(t) < VIS_STILL_MIN_WORDS) return false;
  return true;
}

export function visStillDescriptionShortfall(
  visualDescription: string,
  options?: { requireMinWords?: boolean },
): "chars" | "words" | null {
  const t = visualDescription.trim();
  const requireMinWords = options?.requireMinWords !== false;
  if (t.length === 0) return "chars";
  if (t.length < VIS_STILL_MIN_CHARS) return "chars";
  if (requireMinWords && countVisStillWords(t) < VIS_STILL_MIN_WORDS) return "words";
  return null;
}

export function isVisStillDescriptionEligibleForForce(
  visualDescription: string,
): boolean {
  return visStillDescriptionShortfall(visualDescription, {
    requireMinWords: false,
  }) === null;
}
