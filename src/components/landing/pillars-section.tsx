import {
  Brain,
  HeartHandshake,
  Search,
  Shield,
  Workflow,
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
    title: "Overthinking",
    description:
      "Decision paralysis, rumination loops, analysis spirals — why your brain won't shut up and how to quiet it.",
    icon: Brain,
    tag: "Mind",
  },
  {
    title: "Emotional armor",
    description:
      "Anxiety, anger, emotional regulation — building resilience without suppressing what you actually feel.",
    icon: Shield,
    tag: "Resilience",
  },
  {
    title: "Identity clarity",
    description:
      "Self-knowledge, values, purpose — cutting through the noise of who you think you should be.",
    icon: Search,
    tag: "Purpose",
  },
  {
    title: "Social dynamics",
    description:
      "Relationships and connection through a psychology lens — why you attract chaos and how to build intentional bonds.",
    icon: HeartHandshake,
    tag: "Connection",
  },
  {
    title: "Habit architecture",
    description:
      "Building and breaking habits via behavioral psychology — the science of why willpower fails and systems work.",
    icon: Workflow,
    tag: "Systems",
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
          eyebrow="One focus, five angles"
          title="Psychology & mindset — the only lens that matters"
          description="Every video traces back to how the mind works. Five angles, one mission: help you feel sorted."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
