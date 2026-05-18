/** Thumbnail refs returned after Imagen + disk / Supabase persist. */
export type PersistedThumbnailMeta = {
  thumbnailDbEventId?: string | null;
  thumbnailLocalRelativePath?: string | null;
  /**
   * When set (UUID), image can still load via `/api/studio/thumbnails/for-idea/...`
   * using the latest `thumbnail_generation_events` row for this idea — fixes stale
   * or missing cached event ids in the client.
   */
  generatedIdeaId?: string | null;
};
