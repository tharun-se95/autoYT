"use client";

import { ScriptDraftProvider } from "@/components/studio/script-draft-context";
import { StudioEpisodeWatchShell } from "@/components/studio/studio-episode-watch-shell";
import { getCommissionedVideo } from "@/lib/home/commissioned-videos-storage";

export function StudioEpisodeLayoutClient({
  videoId,
  children,
}: {
  videoId: string;
  children: React.ReactNode;
}) {
  const video = getCommissionedVideo(videoId);
  const defaultBrief = video
    ? [
        `Working title: ${video.idea.title}`,
        "",
        video.idea.hook,
        "",
        "Thumbnail direction (for host + b-roll planning):",
        video.idea.thumbnailVisualDescription,
      ].join("\n")
    : undefined;

  return (
    <ScriptDraftProvider videoId={videoId} defaultBrief={defaultBrief}>
      <StudioEpisodeWatchShell videoId={videoId}>
        {children}
      </StudioEpisodeWatchShell>
    </ScriptDraftProvider>
  );
}
