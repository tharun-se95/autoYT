import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function GlassPanel({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.02] shadow-[0_12px_48px_rgba(0,0,0,0.35)] backdrop-blur-2xl",
        className
      )}
      {...props}
    />
  );
}
