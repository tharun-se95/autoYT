"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getCommissionedVideo } from "@/lib/home/commissioned-videos-storage";

function stageFromPath(pathname: string): string {
  if (pathname.includes("/script")) return "Script";
  if (pathname.includes("/audio")) return "Audio";
  if (pathname.includes("/visuals")) return "Visuals";
  return "Episode";
}

export function StudioEpisodeHeader({ videoId }: { videoId: string }) {
  const pathname = usePathname();
  const video = getCommissionedVideo(videoId);
  if (!video) return null;

  const stage = stageFromPath(pathname);

  return (
    <div className="pb-0.5">
      <nav aria-label="Breadcrumb" className="text-[10px] text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/studio" className="hover:text-foreground">
              Production
            </Link>
          </li>
          <li aria-hidden className="text-muted-foreground/60">
            /
          </li>
          <li className="max-w-[min(100%,12rem)] truncate font-medium text-foreground">
            {video.workingTitle}
          </li>
          <li aria-hidden className="text-muted-foreground/60">
            /
          </li>
          <li className="text-foreground">{stage}</li>
        </ol>
      </nav>
      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
        {video.idea.hook}
      </p>
    </div>
  );
}
