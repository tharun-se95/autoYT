import type { PersistedThumbnailMeta } from "@/lib/studio/persisted-thumbnail-meta";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Same-origin URL for a saved thumbnail (event id → file path → latest-by-idea). */
export function persistedThumbnailImageUrl(
  meta: PersistedThumbnailMeta | null | undefined
): string | null {
  if (!meta) return null;
  const id = meta.thumbnailDbEventId?.trim();
  if (id) {
    return `/api/studio/thumbnails/by-id/${encodeURIComponent(id)}`;
  }
  const rel = meta.thumbnailLocalRelativePath?.trim();
  if (rel) {
    return `/api/studio/thumbnails/file?rel=${encodeURIComponent(rel)}`;
  }
  const idea = meta.generatedIdeaId?.trim();
  if (idea && UUID_RE.test(idea)) {
    return `/api/studio/thumbnails/for-idea/${encodeURIComponent(idea)}`;
  }
  return null;
}
