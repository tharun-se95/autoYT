"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CHANNEL_DESK_PATH } from "@/lib/nav/channel-desk";

import { GlassPanel } from "./glass-panel";
import { SectionContainer } from "./section-container";

const nav = [
  { href: CHANNEL_DESK_PATH, label: "Videos" },
  { href: "/studio", label: "Production" },
] as const;

function MobileNavList({ onNavigate }: { onNavigate: () => void }) {
  return (
    <ul className="flex flex-col gap-1 px-2 pb-4">
      {nav.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={onNavigate}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "w-full justify-start"
            )}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/60 backdrop-blur-xl">
      <SectionContainer className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="font-heading text-sm font-semibold tracking-tight text-foreground"
        >
          Upgrade Life
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 md:flex"
        >
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <GlassPanel className="hidden px-3 py-1.5 lg:block">
            <span className="text-xs text-muted-foreground">
              Human Sanctuary · Chibi-Lite + DNA
            </span>
          </GlassPanel>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={cn(
                buttonVariants({ variant: "outline", size: "icon-sm" }),
                "md:hidden"
              )}
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </button>
            <SheetContent side="right" className="w-[min(100%,20rem)]">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <MobileNavList onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>

          <Link
            href={CHANNEL_DESK_PATH}
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            Channel desk
          </Link>
        </div>
      </SectionContainer>
    </header>
  );
}
