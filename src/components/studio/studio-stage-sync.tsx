"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import {
  getCommissionedVideo,
  isAudioComplete,
  isScriptComplete,
  updateCommissionedVideoStage,
  type ProductionStage,
} from "@/lib/home/commissioned-videos-storage";

function stageFromPath(pathname: string, videoId: string): ProductionStage | null {
  const prefix = `/studio/${videoId}/`;
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length).split("/")[0];
  if (rest === "script") return "script";
  if (rest === "audio") return "audio";
  if (rest === "visuals") return "visuals";
  return null;
}

export function StudioStageSync({ videoId }: { videoId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const stage = stageFromPath(pathname, videoId);
    if (!stage) return;
    const row = getCommissionedVideo(videoId);
    if (!row) return;
    if (stage === "audio" && !isScriptComplete(row)) return;
    if (stage === "visuals" && !isAudioComplete(row)) return;
    updateCommissionedVideoStage(videoId, stage);
  }, [pathname, videoId]);

  return null;
}
