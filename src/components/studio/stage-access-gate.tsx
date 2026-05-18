"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

import { SectionContainer } from "@/components/landing/section-container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getCommissionedVideo,
  isAudioComplete,
  isScriptComplete,
} from "@/lib/home/commissioned-videos-storage";
import { CHANNEL_DESK_VIDEOS_HREF } from "@/lib/nav/channel-desk";

function LockedPanel({
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <SectionContainer className="max-w-3xl">
      <div
        role="region"
        aria-label="Stage locked"
        className="flex flex-col gap-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-6 sm:p-8"
      >
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 size-5 shrink-0 text-amber-400" aria-hidden />
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              {title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {body}
            </p>
          </div>
        </div>
        <Link
          href={ctaHref}
          className={cn(buttonVariants({ size: "sm" }), "w-fit")}
        >
          {ctaLabel}
        </Link>
      </div>
    </SectionContainer>
  );
}

export function StageAccessGate({
  videoId,
  gate,
  children,
}: {
  videoId: string;
  gate: "audio" | "visuals";
  children: React.ReactNode;
}) {
  const v = getCommissionedVideo(videoId);

  if (!v) {
    return (
      <LockedPanel
        title="Production not found"
        body="This episode is not in local storage. Use the Videos desk or Production home to open a valid commission."
        ctaHref={CHANNEL_DESK_VIDEOS_HREF}
        ctaLabel="Back to Videos desk"
      />
    );
  }

  if (gate === "audio" && !isScriptComplete(v)) {
    return (
      <LockedPanel
        title="Audio is locked"
        body="Mark the script complete in the Script stage first. That keeps audio tied to a locked four-act structure."
        ctaHref={`/studio/${videoId}/script`}
        ctaLabel="Go to Script"
      />
    );
  }

  if (gate === "visuals" && !isAudioComplete(v)) {
    return (
      <LockedPanel
        title="Visuals are locked"
        body="Mark audio complete first so visuals can reference a finished sound pass (even if it is still lightweight for now)."
        ctaHref={`/studio/${videoId}/audio`}
        ctaLabel="Go to Audio"
      />
    );
  }

  return <>{children}</>;
}
