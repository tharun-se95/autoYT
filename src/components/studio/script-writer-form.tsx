"use client";

/**
 * @deprecated Episode script editing is implemented in
 * {@link StudioEpisodeWatchShell} using {@link useScriptDraft} from
 * `@/components/studio/script-draft-context`. This export is retained only to
 * avoid accidental imports from breaking; it renders nothing.
 */
export function ScriptWriterForm(props: {
  videoId?: string;
  defaultBrief?: string;
  onScriptGenerated?: () => void;
}) {
  void props;
  return null;
}
