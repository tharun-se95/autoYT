"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";

import { SectionContainer } from "@/components/landing/section-container";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  getCommissionedVideo,
  upsertCommissionedVideo,
} from "@/lib/home/commissioned-videos-storage";
import type { CommissionedVideo } from "@/lib/home/commissioned-videos-storage";
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
    let cancelled = false;

    const finish = (row: CommissionedVideo | null) => {
      if (cancelled) return;
      setState(row ? "ok" : "missing");
    };

    const local = getCommissionedVideo(videoId);
    if (local) {
      finish(local);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const res = await fetch(
          `/api/studio/episodes/${encodeURIComponent(videoId)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          ok?: boolean;
          video?: CommissionedVideo;
        };
        if (res.ok && data.ok && data.video) {
          upsertCommissionedVideo(data.video);
          finish(data.video);
          return;
        }
      } catch {
        /* local assets API unavailable */
      }
      finish(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  if (state === "loading") {
    return (
      <SectionContainer className="max-w-3xl">
        <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Opening production…
          </div>
          <Skeleton className="h-8 w-48 bg-white/10" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 bg-white/10" />
            <Skeleton className="h-8 w-20 bg-white/10" />
            <Skeleton className="h-8 w-24 bg-white/10" />
          </div>
          <Skeleton className="h-24 rounded-lg bg-white/10" />
        </div>
      </SectionContainer>
    );
  }

  if (state === "missing") {
    return (
      <SectionContainer className="max-w-3xl">
        <Alert variant="destructive" className="rounded-xl p-6 sm:p-8">
          <AlertTriangle aria-hidden />
          <AlertTitle className="font-heading text-lg font-semibold">
            This production was not found
          </AlertTitle>
          <AlertDescription className="mt-2 leading-relaxed">
            The link may be wrong, or this browser no longer has that commission
            (for example after clearing site data). If assets exist on disk, ensure
            the dev server has{" "}
            <code className="rounded bg-muted/50 px-1 text-[11px]">
              UPGRADE_LIFE_LOCAL_ASSETS_ROOT
            </code>{" "}
            set and refresh this page.
          </AlertDescription>
          <div className="col-span-2 mt-4 flex flex-wrap gap-2">
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
        </Alert>
      </SectionContainer>
    );
  }

  return <>{children}</>;
}
