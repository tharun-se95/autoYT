"use client";

import { useCallback, useState } from "react";

export function useAssemblyExport(videoId: string, workingTitle: string) {
  const [exportPending, setExportPending] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const downloadAssemblyVideo = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!videoId) return;
      setExportError(null);
      setExportPending(true);
      try {
        const res = await fetch("/api/studio/visuals/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId,
            workingTitle,
            force: Boolean(opts?.force),
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          downloadUrl?: string;
          filename?: string;
          clipCount?: number;
          cached?: boolean;
        };
        if (!res.ok || !data.ok || !data.downloadUrl) {
          setExportError(
            typeof data.error === "string"
              ? data.error
              : `Export failed (${res.status}).`,
          );
          return;
        }

        const anchor = document.createElement("a");
        anchor.href = data.downloadUrl;
        anchor.download = data.filename ?? "autoYT-assembly.mp4";
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } catch (e) {
        setExportError(e instanceof Error ? e.message : "Export failed.");
      } finally {
        setExportPending(false);
      }
    },
    [videoId, workingTitle],
  );

  return {
    exportPending,
    exportError,
    downloadAssemblyVideo,
  };
}
