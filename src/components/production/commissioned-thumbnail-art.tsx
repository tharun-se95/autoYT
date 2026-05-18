"use client";

import { useState } from "react";

import type { CommissionedVideo } from "@/lib/home/commissioned-videos-storage";
import { commissionedVideoThumbnailUrl } from "@/lib/studio/commissioned-video-thumbnail-url";
import { cn } from "@/lib/utils";

type CommissionedThumbnailArtProps = {
  video: CommissionedVideo;
  /** Faux frame when no URL or image load fails. */
  fallback: React.ReactNode;
  className?: string;
  imgClassName?: string;
  /** Optional gradient overlay (Videos grid). */
  withBottomGradient?: boolean;
};

export function CommissionedThumbnailArt({
  video,
  fallback,
  className,
  imgClassName,
  withBottomGradient = false,
}: CommissionedThumbnailArtProps) {
  const [failed, setFailed] = useState(false);
  const src = commissionedVideoThumbnailUrl(video);

  if (!src || failed) {
    return <>{fallback}</>;
  }

  const img = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL or same-origin API */}
      <img
        src={src}
        alt=""
        className={cn(
          "pointer-events-none absolute inset-0 size-full object-cover",
          imgClassName
        )}
        onError={() => setFailed(true)}
      />
      {withBottomGradient ? (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
      ) : null}
    </>
  );

  if (!className) return img;
  return <div className={cn("relative", className)}>{img}</div>;
}
