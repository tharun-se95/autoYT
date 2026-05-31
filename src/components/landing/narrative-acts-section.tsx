import { GlassPanel } from "./glass-panel";
import { SectionContainer } from "./section-container";
import { SectionHeader } from "./section-header";

const pipelinePhases = [
  {
    phase: "1",
    title: "Dynamic Brainstorming & Seeding",
    detail: "Channel DNA",
    body: "Custom ideas generated matching the active channel's brand soul — tone, art style, and vocal identity baked in from the first prompt.",
  },
  {
    phase: "2",
    title: "Context-Aware Outline & Scripts",
    detail: "Narrative structure",
    body: "AI structures narrative acts and timing maps on the fly — retention hooks, act breaks, and storyboard beats aligned to each seeded channel.",
  },
  {
    phase: "3",
    title: "100% Offline Speech-Pause Aligner",
    detail: "On-device · under 0.05s",
    body: "On-device RMS analyzer detects silence gaps in under 0.05s — zero cloud cost, frame-accurate cuts without external alignment APIs.",
  },
  {
    phase: "4",
    title: "Word-by-Word Kinetic Subtitles",
    detail: "Whisper + libass",
    body: "Whisper transcription plus libass custom hardburned styled captions — channel-branded kinetic typography synced word by word.",
  },
] as const;

export function NarrativeActsSection() {
  return (
    <section
      id="narrative"
      className="scroll-mt-24 border-t border-white/5 py-20 sm:py-28"
    >
      <SectionContainer className="flex flex-col gap-12">
        <SectionHeader
          eyebrow="End-to-end automation"
          title="The autoYT Automation Pipeline"
          description="Four stages from seeded idea to publish-ready long-form — each phase runs autonomously with channel-aware context and zero manual handoffs."
        />
        <GlassPanel className="p-6 sm:p-8">
          <ol className="flex flex-col">
            {pipelinePhases.map((item) => (
              <li
                key={item.phase}
                className="flex flex-col gap-4 border-border/60 border-b py-8 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:gap-10"
              >
                <div className="flex shrink-0 flex-row items-start gap-4 sm:w-44 sm:flex-col sm:gap-1">
                  <span className="font-mono text-xs font-medium tracking-widest text-primary">
                    PHASE {item.phase}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.detail}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <h3 className="font-heading text-base font-medium text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </GlassPanel>
      </SectionContainer>
    </section>
  );
}
