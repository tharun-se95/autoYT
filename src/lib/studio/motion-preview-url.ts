/** Same-origin URL for a cached Ken Burns + narration MP4 beat clip. */
export function motionPreviewUrl(params: {
  videoId: string;
  actId: string;
  /** Motion storage index (baseBlock×100+beat). */
  motionStorageIndex: number;
  stillUpdatedAt: string;
  segmentUpdatedAt: string;
  clipsVersion?: number;
  motionMtimeMs?: number;
}): string {
  const v = `${params.motionStorageIndex}|${params.stillUpdatedAt}|${params.segmentUpdatedAt}|${params.clipsVersion ?? 0}|${params.motionMtimeMs ?? 0}`;
  const q = new URLSearchParams({
    videoId: params.videoId,
    actId: params.actId,
    blockIndex: String(params.motionStorageIndex),
  });
  return `/api/studio/visuals/motion?${q.toString()}&v=${encodeURIComponent(v)}`;
}
