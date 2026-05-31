import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SkipLinks } from "@/components/skip-links";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "autoYT — Enterprise-Grade Multi-Channel Video Production Studio",
  description:
    "autoYT runs end-to-end video production across seeded channels — from brand-matched ideation and dynamic scripts to offline speech alignment, vision-audited storyboards, and kinetic subtitle hardburns.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SkipLinks />
        {children}
      </body>
    </html>
  );
}
