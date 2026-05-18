"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getCommissionedVideo,
  isAudioComplete,
  isScriptComplete,
} from "@/lib/home/commissioned-videos-storage";

export function StudioProductionNav({ videoId }: { videoId: string }) {
  const pathname = usePathname();
  const base = `/studio/${videoId}`;
  const video = getCommissionedVideo(videoId);
  const scriptDone = video ? isScriptComplete(video) : false;
  const audioDone = video ? isAudioComplete(video) : false;

  const stages = [
    { suffix: "script" as const, label: "Script", locked: false },
    { suffix: "audio" as const, label: "Audio", locked: !scriptDone },
    { suffix: "visuals" as const, label: "Visuals", locked: !audioDone },
  ];

  return (
    <nav
      aria-label="Production stages"
      className="-mx-1 flex flex-wrap gap-0.5 border-b border-white/5 pb-2 sm:gap-1"
    >
      {stages.map(({ suffix, label, locked }) => {
        const href = `${base}/${suffix}`;
        const active =
          pathname === href || pathname.startsWith(`${href}/`);
        const cls = cn(
          buttonVariants({
            variant: active ? "secondary" : "ghost",
            size: "sm",
          }),
          "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] sm:h-8 sm:px-2.5 sm:text-xs",
          locked && "pointer-events-none opacity-45"
        );

        if (locked) {
          return (
            <span
              key={suffix}
              className={cls}
              aria-disabled
              title={
                suffix === "audio"
                  ? "Complete Script first"
                  : "Complete Audio first"
              }
            >
              <Lock className="size-3 shrink-0 opacity-70" aria-hidden />
              {label}
            </span>
          );
        }

        return (
          <Link
            key={suffix}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cls}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
