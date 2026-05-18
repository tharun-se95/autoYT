import type { Metadata } from "next";

import { ChannelHubSuspense } from "@/components/home/channel-hub-suspense";
import { AmbientBackground } from "@/components/landing/ambient-background";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export const metadata: Metadata = {
  title: "Channel desk",
  description:
    "Upgrade Life channel desk — videos in production, upcoming brainstorms, and thumbnails.",
};

export default function ChannelDeskPage() {
  return (
    <>
      <AmbientBackground />
      <SiteHeader />
      <main id="main-content" className="flex flex-1 flex-col" tabIndex={-1}>
        <ChannelHubSuspense />
      </main>
      <SiteFooter />
    </>
  );
}
