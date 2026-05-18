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
  title: "Upgrade Life — Human Sanctuary (long-form YouTube)",
  description:
    "Calm, binge-worthy stories on mind, money, habits, and heart — Chibi-Lite educational webcomic visuals and Channel DNA v4.",
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
