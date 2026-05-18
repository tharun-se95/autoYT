"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lightbulb } from "lucide-react";

import { ProductionQueueCard } from "@/components/production/production-queue-card";
import { SectionContainer } from "@/components/landing/section-container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  readCommissionedVideos,
  subscribeCommissionedVideos,
  type CommissionedVideo,
} from "@/lib/home/commissioned-videos-storage";
import { CHANNEL_DESK_UPCOMING_HREF } from "@/lib/nav/channel-desk";

export function StudioDashboard() {
  const [rows, setRows] = useState<CommissionedVideo[]>([]);
  const [ready, setReady] = useState(false);

  function refresh() {
    setRows(readCommissionedVideos());
  }

  useEffect(() => {
    return subscribeCommissionedVideos((rows) => {
      setRows(rows);
      setReady(true);
    });
  }, []);

  return (
    <>
      <SectionContainer className="max-w-3xl">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase sm:tracking-[0.24em]">
            Upgrade Life studio
          </p>
          <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
            Production command center
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
            Manage commissions: continue in the episode workspace, copy IDs, or
            remove a row. New ideas and thumbnails live on the{" "}
            <strong className="font-medium text-foreground">Channel desk</strong>{" "}
            —{" "}
            <strong className="font-medium text-foreground">Start in production</strong>{" "}
            there to unlock Script, then Audio, then Visuals (in order).
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Back to home
            </Link>
            <Link
              href={CHANNEL_DESK_UPCOMING_HREF}
              className={cn(buttonVariants({ size: "sm" }), "inline-flex gap-1.5")}
            >
              <Lightbulb className="size-4" aria-hidden />
              Brainstorm ideas
            </Link>
          </div>
        </div>
      </SectionContainer>

      <SectionContainer className="max-w-3xl">
        <h2 className="font-heading text-base font-semibold text-foreground">
          Active commissions
        </h2>
        {!ready ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
            <p className="text-sm text-muted-foreground leading-relaxed">
              No commissioned videos yet. Open{" "}
              <Link
                href={CHANNEL_DESK_UPCOMING_HREF}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Channel desk (Upcoming)
              </Link>{" "}
              to generate ideas, then use{" "}
              <strong className="text-foreground">Start in production</strong> on a
              card.
            </p>
            <Link
              href={CHANNEL_DESK_UPCOMING_HREF}
              className={cn(buttonVariants({ variant: "default" }), "w-fit")}
            >
              Go brainstorm ideas
            </Link>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {rows.map((v) => (
              <ProductionQueueCard
                key={v.id}
                video={v}
                variant="dashboard"
                onRemoved={refresh}
              />
            ))}
          </ul>
        )}
      </SectionContainer>
    </>
  );
}
