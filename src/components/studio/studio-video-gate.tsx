"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";

import { SectionContainer } from "@/components/landing/section-container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCommissionedVideo } from "@/lib/home/commissioned-videos-storage";
import {
  CHANNEL_DESK_UPCOMING_HREF,
  CHANNEL_DESK_VIDEOS_HREF,
} from "@/lib/nav/channel-desk";

type GateState = "loading" | "missing" | "ok";

export function StudioVideoGate({
  videoId,
  children,
}: {
  videoId: string;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<GateState>("loading");

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const row = getCommissionedVideo(videoId);
      setState(row ? "ok" : "missing");
    });
    return () => cancelAnimationFrame(id);
  }, [videoId]);

  if (state === "loading") {
    return (
      <SectionContainer className="max-w-3xl">
        <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Opening production…
          </div>
          <div className="h-8 w-48 animate-pulse rounded-md bg-white/10" />
          <div className="flex gap-2">
            <div className="h-8 w-20 animate-pulse rounded-md bg-white/10" />
            <div className="h-8 w-20 animate-pulse rounded-md bg-white/10" />
            <div className="h-8 w-24 animate-pulse rounded-md bg-white/10" />
          </div>
          <div className="h-24 animate-pulse rounded-lg bg-white/10" />
        </div>
      </SectionContainer>
    );
  }

  if (state === "missing") {
    return (
      <SectionContainer className="max-w-3xl">
        <div
          role="alert"
          className="flex flex-col gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6 sm:p-8"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                This production was not found
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                The link may be wrong, or this browser no longer has that commission
                (for example after clearing site data). Productions are stored locally
                until you connect a backend.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={CHANNEL_DESK_VIDEOS_HREF}
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              Back to Videos desk
            </Link>
            <Link
              href={CHANNEL_DESK_UPCOMING_HREF}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Brainstorm ideas
            </Link>
            <Link
              href="/studio"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Production home
            </Link>
          </div>
        </div>
      </SectionContainer>
    );
  }

  return <>{children}</>;
}
