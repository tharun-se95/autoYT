import Link from "next/link";
import { Wand2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CHANNEL_DESK_PATH, CHANNEL_DESK_UPCOMING_HREF } from "@/lib/nav/channel-desk";

import { GlassPanel } from "./glass-panel";
import { SectionContainer } from "./section-container";
import { SectionHeader } from "./section-header";

const blurb =
  "Brainstorm on the Channel desk. When you start an idea in production, you move through Script, then Audio, then Visuals — each step unlocks the next, grounded in Channel DNA v4.";

export function CtaSection() {
  return (
    <section
      id="cta"
      className="scroll-mt-24 border-t border-white/5 py-20 sm:py-28"
    >
      <SectionContainer>
        <GlassPanel className="flex flex-col gap-10 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12">
          <SectionHeader
            align="left"
            className="max-w-lg sm:max-w-xl"
            eyebrow="Channel desk & production"
            title="Videos at home — production when you start an episode"
            description={blurb}
          />
          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <Link
              href={CHANNEL_DESK_UPCOMING_HREF}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 gap-2 px-6 text-sm"
              )}
            >
              <Wand2 data-icon="inline-start" />
              Brainstorm ideas
            </Link>
            <Link
              href={CHANNEL_DESK_PATH}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 gap-2 px-6 text-sm"
              )}
            >
              Videos in progress
            </Link>
            <Link
              href="/studio"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 gap-2 px-6 text-sm"
              )}
            >
              Open production
            </Link>
            <p className="max-w-xs text-center text-xs text-muted-foreground sm:text-right">
              Chibi-Lite webcomic look, Cyber-Stoic palette, Big Brother voice,
              four acts: mess → deep dive → mirror → way forward.
            </p>
          </div>
        </GlassPanel>
      </SectionContainer>
    </section>
  );
}
