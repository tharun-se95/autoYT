import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CHANNEL_DESK_PATH, CHANNEL_DESK_UPCOMING_HREF } from "@/lib/nav/channel-desk";

import { GlassPanel } from "./glass-panel";
import { SectionContainer } from "./section-container";

const cuttingEdgeFeatures = [
  "Imagen 4.0 Widescreen Previews",
  "Self-Healing Multimodal Vision Auditor",
  "Local Speech-Pause Aligner",
  "Branded Kinetic Subtitles",
] as const;

export function HeroSection() {
  return (
    <section className="relative py-16 sm:py-24 lg:py-32">
      <SectionContainer className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex flex-1 flex-col gap-6">
          <div className="inline-flex w-fit items-center gap-2">
            <span className="text-xs font-medium tracking-[0.28em] text-primary uppercase">
              autoYT · multi-channel studio
            </span>
          </div>
          <h1 className="font-heading max-w-xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-[1.08]">
            Your fully autonomous multi-channel creator studio.
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
            autoYT runs end-to-end video production across seeded channels — from
            brand-matched ideation and dynamic scripts to offline speech alignment,
            vision-audited storyboards, and kinetic subtitle hardburns.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href={CHANNEL_DESK_PATH}
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "h-11 gap-2 px-6 text-sm"
              )}
            >
              Open channel desk
              <ArrowRight data-icon="inline-end" />
            </Link>
            <Link
              href={CHANNEL_DESK_UPCOMING_HREF}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 gap-2 px-6 text-sm"
              )}
            >
              <BookOpen data-icon="inline-start" />
              Brainstorm ideas
            </Link>
            <Link
              href="/studio"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 gap-2 px-6 text-sm"
              )}
            >
              Production
            </Link>
          </div>
        </div>
        <div className="flex flex-1 justify-center lg:justify-end">
          <GlassPanel className="relative w-full max-w-md overflow-hidden p-8 sm:p-10">
            <div className="pointer-events-none absolute -top-24 -right-16 size-56 rounded-full bg-primary/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative flex flex-col gap-4">
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Cutting-edge stack
              </p>
              <p className="font-heading text-xl font-medium text-foreground">
                autoYT production engine
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Every render ships with premium visuals, on-device timing
                analysis, and channel-branded motion typography — no cloud
                alignment fees, no generic captions.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {cuttingEdgeFeatures.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </GlassPanel>
        </div>
      </SectionContainer>
    </section>
  );
}
