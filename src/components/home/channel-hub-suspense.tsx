import { Suspense } from "react";

import { ChannelHub } from "@/components/home/channel-hub";
import { SectionContainer } from "@/components/landing/section-container";

export function ChannelHubSuspense() {
  return (
    <Suspense
      fallback={
        <section
          id="channel-hub"
          className="scroll-mt-20 border-t border-white/5 py-10 sm:py-12"
        >
          <SectionContainer className="max-w-7xl">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-muted-foreground">
              Loading channel desk…
            </div>
          </SectionContainer>
        </section>
      }
    >
      <ChannelHub />
    </Suspense>
  );
}
