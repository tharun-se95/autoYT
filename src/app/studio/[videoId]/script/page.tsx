import { StudioScriptWorkspace } from "@/components/studio/studio-script-workspace";

export default async function StudioScriptPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  return <StudioScriptWorkspace videoId={videoId} />;
}
