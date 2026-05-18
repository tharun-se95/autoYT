import { StudioEpisodeLayoutClient } from "@/components/studio/studio-episode-layout-client";
import { StudioStageSync } from "@/components/studio/studio-stage-sync";
import { StudioVideoGate } from "@/components/studio/studio-video-gate";

export default async function StudioVideoLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ videoId: string }>;
}>) {
  const { videoId } = await params;
  return (
    <StudioVideoGate videoId={videoId}>
      <StudioStageSync videoId={videoId} />
      <StudioEpisodeLayoutClient videoId={videoId}>
        {children}
      </StudioEpisodeLayoutClient>
    </StudioVideoGate>
  );
}
