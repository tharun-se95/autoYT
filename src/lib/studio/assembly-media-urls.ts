/** Same-origin URL for a block narration WAV/MP3. */
export function narrationAudioUrl(localRelativePath: string, updatedAt: string): string {
  return `/api/studio/audio/file?rel=${encodeURIComponent(localRelativePath)}&v=${encodeURIComponent(updatedAt)}`;
}

/** Same-origin URL for a [VIS] still PNG. */
export function visStillPreviewUrl(localRelativePath: string, updatedAt: string): string {
  return `/api/studio/visuals/file?rel=${encodeURIComponent(localRelativePath)}&v=${encodeURIComponent(updatedAt)}`;
}
