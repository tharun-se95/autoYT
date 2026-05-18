import { AmbientBackground } from "./ambient-background";
import { CtaSection } from "./cta-section";
import { HeroSection } from "./hero-section";
import { NarrativeActsSection } from "./narrative-acts-section";
import { PillarsSection } from "./pillars-section";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function LandingPage() {
  return (
    <>
      <AmbientBackground />
      <SiteHeader />
      <main id="main-content" className="flex flex-1 flex-col" tabIndex={-1}>
        <HeroSection />
        <PillarsSection />
        <NarrativeActsSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
