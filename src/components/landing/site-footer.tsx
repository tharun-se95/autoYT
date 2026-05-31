import { SectionContainer } from "./section-container";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 py-10">
      <SectionContainer className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-center text-xs text-muted-foreground sm:text-left">
          Creator Studio © {new Date().getFullYear()} · Autonomous Video Production Hub
        </p>
        <p className="text-xs text-muted-foreground">
          Scriptwriting · Audio Synthesis · Turnaround Sheet Reference · Imagen Stills
        </p>
      </SectionContainer>
    </footer>
  );
}
