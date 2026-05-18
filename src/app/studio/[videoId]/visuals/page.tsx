import { StageAccessGate } from "@/components/studio/stage-access-gate";
import { StudioVisualsWorkspace } from "@/components/studio/studio-visuals-workspace";

export default async function StudioVisualsPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  return (
    <StageAccessGate videoId={videoId} gate="visuals">
      <StudioVisualsWorkspace videoId={videoId} />
    </StageAccessGate>
  );
}
