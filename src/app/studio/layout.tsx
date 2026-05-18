import { AmbientBackground } from "@/components/landing/ambient-background";
import { SiteHeader } from "@/components/landing/site-header";

export default function StudioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AmbientBackground />
      <SiteHeader />
      <main id="main-content" className="flex flex-1 flex-col gap-8 py-8 sm:gap-10 sm:py-10" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
