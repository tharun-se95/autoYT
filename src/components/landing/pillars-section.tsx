import {
  Activity,
  Brain,
  HeartHandshake,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { GlassPanel } from "./glass-panel";
import { SectionContainer } from "./section-container";
import { SectionHeader } from "./section-header";

const pillars = [
  {
    title: "A clear mind",
    description:
      "Psychology and focus so people feel less overwhelmed by the noise of daily life.",
    icon: Brain,
    tag: "Mind",
  },
  {
    title: "Financial peace",
    description:
      "Practical money guidance to ease stress and build a steadier, more secure future.",
    icon: Wallet,
    tag: "Money",
  },
  {
    title: "Personal habits",
    description:
      "Simple routines that help body and mind feel energized and sorted again.",
    icon: Activity,
    tag: "Habits",
  },
  {
    title: "Human connections",
    description:
      "Relationships built on intentional, personal gestures—not generic check-ins.",
    icon: HeartHandshake,
    tag: "Love & friendship",
  },
] as const;

export function PillarsSection() {
  return (
    <section
      id="pillars"
      className="scroll-mt-24 border-t border-white/5 py-20 sm:py-28"
    >
      <SectionContainer className="flex flex-col gap-12">
        <SectionHeader
          eyebrow="Four foundations"
          title="Channel DNA — what Upgrade Life stands on"
          description="Relatable struggles and gentle blueprints: mind, money, habits, and heart—plain human language, Chibi-Lite infographic comic on screen."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {pillars.map((pillar) => (
            <Card
              key={pillar.title}
              className="border-white/10 bg-white/[0.04] shadow-none ring-1 ring-white/10 backdrop-blur-xl"
            >
              <CardHeader className="flex flex-row items-start gap-4">
                <GlassPanel className="flex size-11 shrink-0 items-center justify-center rounded-xl p-0">
                  <pillar.icon
                    aria-hidden
                    className="size-5 text-primary"
                    strokeWidth={1.75}
                  />
                </GlassPanel>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{pillar.title}</CardTitle>
                    <Badge variant="secondary" className="font-normal">
                      {pillar.tag}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm leading-relaxed">
                    {pillar.description}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
