import type { ScriptActId, ScriptDocument } from "@/lib/script-writer/types";

export type BlockOpeningValidationIssue = {
  actId: ScriptActId;
  actTitle: string;
  blockIndex: number;
  phrase: string;
  message: string;
};

/** Lowercase, collapse whitespace, strip punctuation for prefix checks. */
export function normalizePhraseForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2014\u2013]/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when `narration` opens with `phrase` at a word boundary. */
export function narrationStartsWithPhrase(
  narration: string,
  phrase: string,
): boolean {
  const n = normalizePhraseForMatch(narration);
  const p = normalizePhraseForMatch(phrase);
  if (!p) return false;
  if (!n.startsWith(p)) return false;
  if (n.length === p.length) return true;
  return n[p.length] === " ";
}

function findPhraseInNarration(
  narration: string,
  phrase: string,
  searchFrom: number,
): number {
  const normNarration = normalizePhraseForMatch(narration);
  const normPhrase = normalizePhraseForMatch(phrase);
  if (!normPhrase) return -1;

  let idx = normNarration.indexOf(normPhrase, searchFrom);
  while (idx >= 0) {
    const after = idx + normPhrase.length;
    if (after === normNarration.length || normNarration[after] === " ") {
      return idx;
    }
    idx = normNarration.indexOf(normPhrase, idx + 1);
  }
  return -1;
}

export function validateScriptBlockOpenings(
  script: ScriptDocument,
): BlockOpeningValidationIssue[] {
  const issues: BlockOpeningValidationIssue[] = [];

  for (const act of script.acts) {
    act.narrationBlocks.forEach((block, blockIndex) => {
      const beats = block.visualBeats;
      if (beats.length === 0) return;

      const firstPhrase = beats[0]!.phrase;
      if (!narrationStartsWithPhrase(block.narration, firstPhrase)) {
        issues.push({
          actId: act.actId,
          actTitle: act.displayTitle,
          blockIndex,
          phrase: firstPhrase,
          message: `First visual beat phrase must be the opening words of the block narration (got phrase "${firstPhrase}").`,
        });
      }

      let cursor = 0;
      for (let bi = 0; bi < beats.length; bi++) {
        const phrase = beats[bi]!.phrase;
        const pos = findPhraseInNarration(block.narration, phrase, cursor);
        if (pos < 0) {
          issues.push({
            actId: act.actId,
            actTitle: act.displayTitle,
            blockIndex,
            phrase,
            message: `Beat ${bi + 1} phrase must appear verbatim in narration (in order): "${phrase}".`,
          });
          break;
        }
        cursor = pos + normalizePhraseForMatch(phrase).length;
      }
    });
  }

  return issues;
}

export function isScriptBlockOpeningsValid(script: ScriptDocument): boolean {
  return validateScriptBlockOpenings(script).length === 0;
}

export function formatValidationIssuesForModel(
  issues: BlockOpeningValidationIssue[],
  limit = 12,
): string {
  return issues
    .slice(0, limit)
    .map(
      (i) =>
        `- ${i.actTitle} (${i.actId}), block ${i.blockIndex + 1}: ${i.message}`,
    )
    .join("\n");
}

/** First 1–5 words of narration (for auto-repair when the model mis-anchors beat 0). */
export function openingPhraseFromNarration(
  narration: string,
  preferredWordCount = 4,
): string {
  const words = narration.trim().split(/\s+/).filter(Boolean);
  const n = Math.min(5, Math.max(1, preferredWordCount), words.length);
  return words.slice(0, n).join(" ");
}

/** Force each block's first beat phrase to the narration opening (phrase stays verbatim). */
export function repairScriptBlockOpenings(script: ScriptDocument): ScriptDocument {
  return {
    ...script,
    acts: script.acts.map((act) => ({
      ...act,
      narrationBlocks: act.narrationBlocks.map((block) => {
        const beats = block.visualBeats;
        if (beats.length === 0) return block;
        const preferred = beats[0]!.phrase.split(/\s+/).filter(Boolean).length;
        const phrase = openingPhraseFromNarration(block.narration, preferred);
        const next = [...beats];
        next[0] = { ...next[0]!, phrase };
        return { ...block, visualBeats: next };
      }),
    })),
  };
}

export function formatValidationIssuesForUser(
  issues: BlockOpeningValidationIssue[],
  limit = 3,
): string {
  const sample = issues.slice(0, limit);
  const lines = sample.map(
    (i) =>
      `${i.actTitle}, block ${i.blockIndex + 1}: narration must start with "${i.phrase}"`,
  );
  const extra =
    issues.length > limit
      ? ` (+${issues.length - limit} more blocks)`
      : "";
  return lines.join("; ") + extra;
}
