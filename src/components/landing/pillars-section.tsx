import {
  Cpu,
  Ghost,
  Grid3x3,
  Orbit,
  ScrollText,
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

const seededChannels = [
  {
    title: "The Cosmic Archive",
    description:
      "Moebius Line-Ink aesthetic — surreal sci-fi lore and cosmic wonder. Voice: Charon @0.92x.",
    icon: Orbit,
    tag: "Charon · 0.92x",
  },
  {
    title: "Existential Whispers",
    description:
      "Academia Oil Paintings — literary philosophy and quiet introspection. Voice: Kore @0.95x.",
    icon: ScrollText,
    tag: "Kore · 0.95x",
  },
  {
    title: "Techno-Bytes",
    description:
      "Cyberpunk Vector Flat — fast tech explainers and neon-drenched futures. Voice: Aoede @1.10x.",
    icon: Cpu,
    tag: "Aoede · 1.10x",
  },
  {
    title: "The Wealth Blueprint",
    description:
      "Isometric Blueprint Grids — finance, systems, and wealth architecture. Voice: Fenrir @0.96x.",
    icon: Grid3x3,
    tag: "Fenrir · 0.96x",
  },
  {
    title: "Uncanny Valley",
    description:
      "1950s Mid-Century Pop-Art — highly energetic, sarcastic delivery with retro bite.",
    icon: Ghost,
    tag: "Sarcastic · high energy",
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
          eyebrow="Five channels, five art souls"
          title="Seeded Channels & High-Retention Art Styles"
          description="Each autoYT channel ships with a locked visual language, vocal identity, and retention-tuned tone — ready to produce binge-worthy long-form without manual re-branding."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seededChannels.map((channel) => (
            <Card
              key={channel.title}
              className="border-white/10 bg-white/[0.04] shadow-none ring-1 ring-white/10 backdrop-blur-xl"
            >
              <CardHeader className="flex flex-row items-start gap-4">
                <GlassPanel className="flex size-11 shrink-0 items-center justify-center rounded-xl p-0">
                  <channel.icon
                    aria-hidden
                    className="size-5 text-primary"
                    strokeWidth={1.75}
                  />
                </GlassPanel>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{channel.title}</CardTitle>
                    <Badge variant="secondary" className="font-normal">
                      {channel.tag}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm leading-relaxed">
                    {channel.description}
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
