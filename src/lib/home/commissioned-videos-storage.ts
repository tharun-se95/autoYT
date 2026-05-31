import {
  parseSuggestedTone,
  parseSuggestedVisualStyle,
  type VideoIdea,
} from "@/lib/content-architect/types";

/** localStorage key for the in-browser production queue (Videos tab + studio). */
export const COMMISSIONED_VIDEOS_STORAGE_KEY = "upgrade-life:commissioned-videos";

/** Fired on this window after a successful write (same-tab listeners). */
export const COMMISSIONED_VIDEOS_CHANGED_EVENT = "upgrade-life:commissioned-videos-changed";

export type ProductionStage = "script" | "audio" | "visuals";

export type CommissionedVideo = {
  id: string;
  workingTitle: string;
  idea: VideoIdea;
  currentStage: ProductionStage;
  createdAt: string;
  updatedAt: string;
  /** ISO timestamp when user marked Script stage complete (unlocks Audio). */
  scriptCompletedAt?: string | null;
  /** ISO timestamp when user marked Audio stage complete (unlocks Visuals). */
  audioCompletedAt?: string | null;
  /** When set, Videos grid resolves the latest thumbnail from DB for this idea. */
  sourceGeneratedIdeaId?: string | null;
  /** When set, Videos grid can load the real thumbnail via API. */
  thumbnailDbEventId?: string | null;
  /** Disk path under local assets root (served via `/api/studio/thumbnails/file`). */
  thumbnailLocalRelativePath?: string | null;
  /**
   * Data URL fallback when commissioning without disk/DB (capped on write).
   * Prefer disk + DB ids when available.
   */
  thumbnailInlineDataUrl?: string | null;
};

/** Payload when starting production from the Channel desk Upcoming grid. */
export type DeskCommissionPayload = {
  idea: VideoIdea;
  /** `generated_ideas.id` from the studio database. */
  generatedIdeaId: string;
  thumbnailDbEventId?: string | null;
  thumbnailLocalRelativePath?: string | null;
};

function normalizeVideoIdea(raw: unknown): VideoIdea | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const pillars = new Set([
    "overthinking",
    "emotional_armor",
    "identity_clarity",
    "social_dynamics",
    "habit_architecture",
  ]);
  if (
    typeof o.title !== "string" ||
    typeof o.hook !== "string" ||
    typeof o.thumbnailVisualDescription !== "string" ||
    typeof o.thumbnailTextOverlay !== "string" ||
    (o.thumbnailTextGlow !== "cyan" && o.thumbnailTextGlow !== "amber") ||
    typeof o.pillar !== "string" ||
    !pillars.has(o.pillar)
  ) {
    return null;
  }
  return {
    title: o.title,
    hook: o.hook,
    thumbnailVisualDescription: o.thumbnailVisualDescription,
    thumbnailTextOverlay: o.thumbnailTextOverlay,
    thumbnailTextGlow: o.thumbnailTextGlow,
    pillar: o.pillar as VideoIdea["pillar"],
    suggestedTone: parseSuggestedTone(o.suggestedTone),
    suggestedVisualStyle: parseSuggestedVisualStyle(o.suggestedVisualStyle),
  };
}

function isOptionalNullableString(x: unknown): boolean {
  return x == null || typeof x === "string";
}

function isOptionalIso(x: unknown): x is string | null | undefined {
  return x == null || typeof x === "string";
}

function isCommissionedVideo(x: unknown): x is CommissionedVideo {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.workingTitle !== "string" ||
    typeof o.createdAt !== "string" ||
    typeof o.updatedAt !== "string"
  ) {
    return false;
  }
  const stage = o.currentStage;
  if (stage !== "script" && stage !== "audio" && stage !== "visuals") {
    return false;
  }
  const idea = normalizeVideoIdea(o.idea);
  if (!idea) return false;
  if (!isOptionalIso(o.scriptCompletedAt) || !isOptionalIso(o.audioCompletedAt)) {
    return false;
  }
  if (!isOptionalNullableString(o.thumbnailDbEventId)) return false;
  if (!isOptionalNullableString(o.thumbnailLocalRelativePath)) return false;
  if (!isOptionalNullableString(o.thumbnailInlineDataUrl)) return false;
  if (!isOptionalNullableString(o.sourceGeneratedIdeaId)) return false;
  return true;
}

function normalizeRow(raw: CommissionedVideo): CommissionedVideo {
  const idea = normalizeVideoIdea(raw.idea) ?? raw.idea;
  return {
    ...raw,
    idea,
    scriptCompletedAt: raw.scriptCompletedAt ?? null,
    audioCompletedAt: raw.audioCompletedAt ?? null,
    sourceGeneratedIdeaId: raw.sourceGeneratedIdeaId ?? null,
    thumbnailDbEventId: raw.thumbnailDbEventId ?? null,
    thumbnailLocalRelativePath: raw.thumbnailLocalRelativePath ?? null,
    thumbnailInlineDataUrl: raw.thumbnailInlineDataUrl ?? null,
  };
}

export function isScriptComplete(v: CommissionedVideo): boolean {
  return !!v.scriptCompletedAt?.trim();
}

export function isAudioComplete(v: CommissionedVideo): boolean {
  return !!v.audioCompletedAt?.trim();
}

/** First stage that still needs work (honest progress for CTAs). */
export function resumePathForVideo(v: CommissionedVideo): `/${ProductionStage}` {
  if (!isScriptComplete(v)) return "/script";
  if (!isAudioComplete(v)) return "/audio";
  return "/visuals";
}

export function resumeHrefForVideo(v: CommissionedVideo): string {
  return `/studio/${v.id}${resumePathForVideo(v)}`;
}

export function readCommissionedVideos(): CommissionedVideo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMMISSIONED_VIDEOS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCommissionedVideo).map(normalizeRow);
  } catch {
    return [];
  }
}

export function writeCommissionedVideos(rows: CommissionedVideo[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      COMMISSIONED_VIDEOS_STORAGE_KEY,
      JSON.stringify(rows)
    );
    window.dispatchEvent(new CustomEvent(COMMISSIONED_VIDEOS_CHANGED_EVENT));
  } catch (e) {
    console.error("[commissioned-videos] write failed:", e);
  }
}

/**
 * Subscribe to commissioned-video list changes (initial read on next frame, then
 * same-tab writes, other-tab storage updates, focus, and tab visibility).
 */
export function subscribeCommissionedVideos(
  callback: (rows: CommissionedVideo[]) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const reload = () => callback(readCommissionedVideos());

  const id = requestAnimationFrame(() => {
    reload();
  });

  const onCustom = () => reload();
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === COMMISSIONED_VIDEOS_STORAGE_KEY ||
      e.key === null
    ) {
      reload();
    }
  };
  const onFocus = () => reload();
  const onVisibility = () => {
    if (document.visibilityState === "visible") reload();
  };

  window.addEventListener(COMMISSIONED_VIDEOS_CHANGED_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    cancelAnimationFrame(id);
    window.removeEventListener(COMMISSIONED_VIDEOS_CHANGED_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

export function getCommissionedVideo(id: string): CommissionedVideo | null {
  const row = readCommissionedVideos().find((v) => v.id === id);
  return row ? normalizeRow(row) : null;
}

/** Insert or replace a commissioned row (e.g. after importing from disk). */
export function upsertCommissionedVideo(row: CommissionedVideo): void {
  const normalized = normalizeRow(row);
  const prev = readCommissionedVideos().filter((v) => v.id !== normalized.id);
  writeCommissionedVideos([normalized, ...prev]);
}

/** Cap for data URLs stored on commissioned rows (localStorage size). */
export const MAX_THUMBNAIL_INLINE_CHARS = 450_000;

export function addCommissionedVideo(
  idea: VideoIdea,
  thumbnailExtras?: {
    sourceGeneratedIdeaId?: string | null;
    thumbnailDbEventId?: string | null;
    thumbnailLocalRelativePath?: string | null;
    thumbnailInlineDataUrl?: string | null;
  }
): CommissionedVideo {
  const now = new Date().toISOString();
  const inline = thumbnailExtras?.thumbnailInlineDataUrl?.trim();
  const row: CommissionedVideo = {
    id: crypto.randomUUID(),
    workingTitle: idea.title.trim(),
    idea,
    currentStage: "script",
    createdAt: now,
    updatedAt: now,
    scriptCompletedAt: null,
    audioCompletedAt: null,
    sourceGeneratedIdeaId: thumbnailExtras?.sourceGeneratedIdeaId ?? null,
    thumbnailDbEventId: thumbnailExtras?.thumbnailDbEventId ?? null,
    thumbnailLocalRelativePath: thumbnailExtras?.thumbnailLocalRelativePath ?? null,
    thumbnailInlineDataUrl:
      inline && inline.length <= MAX_THUMBNAIL_INLINE_CHARS ? inline : null,
  };
  const prev = readCommissionedVideos();
  writeCommissionedVideos([row, ...prev]);
  return row;
}

export function updateCommissionedVideoStage(
  id: string,
  stage: ProductionStage
): void {
  const rows = readCommissionedVideos();
  const next = rows.map((v) =>
    v.id === id
      ? { ...v, currentStage: stage, updatedAt: new Date().toISOString() }
      : v
  );
  writeCommissionedVideos(next);
}

export function markScriptComplete(id: string): void {
  const now = new Date().toISOString();
  const rows = readCommissionedVideos();
  writeCommissionedVideos(
    rows.map((v) =>
      v.id === id
        ? {
            ...v,
            scriptCompletedAt: now,
            updatedAt: now,
            currentStage: "audio",
          }
        : v
    )
  );
}

export function markAudioComplete(id: string): void {
  const now = new Date().toISOString();
  const rows = readCommissionedVideos();
  writeCommissionedVideos(
    rows.map((v) =>
      v.id === id
        ? {
            ...v,
            audioCompletedAt: now,
            updatedAt: now,
            currentStage: "visuals",
          }
        : v
    )
  );
}

export function removeCommissionedVideo(id: string): void {
  writeCommissionedVideos(readCommissionedVideos().filter((v) => v.id !== id));
}
