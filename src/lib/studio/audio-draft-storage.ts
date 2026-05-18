/** localStorage key for stub audio queue rows (episode workspace). */
export const AUDIO_DRAFT_STORAGE_KEY_PREFIX = "upgrade-life:audio-draft:";

export type AudioDraftRow = {
  id: string;
  label: string;
  createdAt: string;
};

export function audioDraftStorageKey(videoId: string): string {
  return `${AUDIO_DRAFT_STORAGE_KEY_PREFIX}${videoId}`;
}

function isRow(x: unknown): x is AudioDraftRow {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.label === "string" &&
    typeof o.createdAt === "string"
  );
}

export function readAudioDraftRows(videoId: string): AudioDraftRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(audioDraftStorageKey(videoId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRow);
  } catch {
    return [];
  }
}

export function writeAudioDraftRows(videoId: string, rows: AudioDraftRow[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(audioDraftStorageKey(videoId), JSON.stringify(rows));
    window.dispatchEvent(new CustomEvent("upgrade-life:audio-draft-updated"));
  } catch {
    /* ignore */
  }
}

export const AUDIO_DRAFT_UPDATED_EVENT = "upgrade-life:audio-draft-updated";
