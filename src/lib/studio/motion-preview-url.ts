/** Same-origin URL for a cached Ken Burns + narration MP4 block clip. */
export function motionPreviewUrl(params: {
  videoId: string;
  actId: string;
  blockIndex: number;
  stillUpdatedAt: string;
  segmentUpdatedAt: string;
  clipsVersion?: number;
}): string {
  const v = `${params.stillUpdatedAt}|${params.segmentUpdatedAt}|${params.clipsVersion ?? 0}`;
  const q = new URLSearchParams({
    videoId: params.videoId,
    actId: params.actId,
    blockIndex: String(params.blockIndex),
  });
  return `/api/studio/visuals/motion?${q.toString()}&v=${encodeURIComponent(v)}`;
}
