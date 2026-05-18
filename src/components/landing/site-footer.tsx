import { SectionContainer } from "./section-container";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 py-10">
      <SectionContainer className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-center text-xs text-muted-foreground sm:text-left">
          Upgrade Life © {new Date().getFullYear()} · The Human Sanctuary blueprint
        </p>
        <p className="text-xs text-muted-foreground">
          Psychology · finance · fitness · relationships
        </p>
      </SectionContainer>
    </footer>
  );
}
