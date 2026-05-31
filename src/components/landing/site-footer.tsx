import { SectionContainer } from "./section-container";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 py-10">
      <SectionContainer className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-center text-xs text-muted-foreground sm:text-left">
          autoYT © {new Date().getFullYear()} · Enterprise-Grade Multi-Channel Video Production Studio
        </p>
        <p className="text-xs text-muted-foreground">
          Ideation · Scriptwriting · Speech Alignment · Vision-Audited Storyboards · Kinetic Subtitles
        </p>
      </SectionContainer>
    </footer>
  );
}
