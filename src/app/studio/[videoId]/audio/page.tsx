import { StageAccessGate } from "@/components/studio/stage-access-gate";
import { StudioAudioWorkspace } from "@/components/studio/studio-audio-workspace";

export default async function StudioAudioPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  return (
    <StageAccessGate videoId={videoId} gate="audio">
      <StudioAudioWorkspace videoId={videoId} />
    </StageAccessGate>
  );
}
