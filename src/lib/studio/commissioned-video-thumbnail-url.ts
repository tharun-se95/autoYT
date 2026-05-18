import type { CommissionedVideo } from "@/lib/home/commissioned-videos-storage";
import { persistedThumbnailImageUrl } from "@/lib/studio/persisted-thumbnail-url";

/** Same-origin URL for a commissioned row (inline data URL → DB id → disk path → latest by idea). */
export function commissionedVideoThumbnailUrl(
  video: CommissionedVideo
): string | null {
  const inline = video.thumbnailInlineDataUrl?.trim();
  if (inline?.startsWith("data:")) return inline;

  const fromSnapshot = persistedThumbnailImageUrl({
    thumbnailDbEventId: video.thumbnailDbEventId ?? null,
    thumbnailLocalRelativePath: video.thumbnailLocalRelativePath ?? null,
  });
  if (fromSnapshot) return fromSnapshot;

  const ideaId = video.sourceGeneratedIdeaId?.trim();
  if (ideaId) {
    return `/api/studio/thumbnails/for-idea/${encodeURIComponent(ideaId)}`;
  }

  return null;
}
