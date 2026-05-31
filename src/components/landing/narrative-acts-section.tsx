import { GlassPanel } from "./glass-panel";
import { SectionContainer } from "./section-container";
import { SectionHeader } from "./section-header";

const acts = [
  {
    act: "1",
    title: "The mess",
    timing: "0–2 min",
    body: "A relatable, witty opening that names a common life struggle—the moment viewers think, “that’s me.”",
  },
  {
    act: "2",
    title: "The deep dive",
    timing: "2–8 min",
    body: "Why it hurts: human psychology and life patterns—clear, grounded, and honest.",
  },
  {
    act: "3",
    title: "The mirror",
    timing: "8–15 min",
    body: "Brutal honesty: reflects the patterns, habits, and stories you’ve been telling yourself.",
  },
  {
    act: "4",
    title: "The way forward",
    timing: "15–20 min",
    body: "Practical upgrades that help the viewer feel sorted, secure, and ready for what’s next.",
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
          eyebrow="Channel DNA Storytelling"
          title="The four-act loop every script follows"
          description="A structured narrative arc built for high-retention long-form bingeing, visual storyboard stills, and a professional, cohesive presentation."
        />
        <GlassPanel className="p-6 sm:p-8">
          <ol className="flex flex-col">
            {acts.map((item) => (
              <li
                key={item.act}
                className="flex flex-col gap-4 border-border/60 border-b py-8 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:gap-10"
              >
                <div className="flex shrink-0 flex-row items-start gap-4 sm:w-44 sm:flex-col sm:gap-1">
                  <span className="font-mono text-xs font-medium tracking-widest text-primary">
                    ACT {item.act}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.timing}
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
