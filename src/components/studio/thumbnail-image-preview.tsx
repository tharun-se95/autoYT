"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ThumbnailImagePreviewProps = {
  src: string;
  alt: string;
  title: string;
  description?: string;
  /** Outer frame: aspect ratio, width, border, rounding (matches inline thumbnail). */
  frameClassName: string;
  /** Called when the image fails to load (e.g. missing file or API error). */
  onImageError?: () => void;
};

/**
 * Clickable thumbnail that opens a full-size preview dialog (16:9 image or data URL).
 */
export function ThumbnailImagePreview({
  src,
  alt,
  title,
  description = "Full-size preview of the generated thumbnail.",
  frameClassName,
  onImageError,
}: ThumbnailImagePreviewProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          frameClassName,
          "group relative block overflow-hidden border-0 bg-transparent p-0 text-left outline-none",
          "cursor-zoom-in transition-[box-shadow] focus-visible:ring-2 focus-visible:ring-ring/50",
          "hover:shadow-[0_0_0_2px_hsl(var(--primary)/0.35)]"
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Open full-size thumbnail preview: ${title}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL or same-origin API */}
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden
          decoding="async"
          loading="lazy"
          className="size-full object-cover"
          onError={() => onImageError?.()}
        />
      </button>
      <DialogContent
        showCloseButton
        className="max-h-[95vh] w-[min(96vw,1200px)] max-w-[min(96vw,1200px)] gap-3 overflow-y-auto border border-white/10 bg-popover p-3 sm:max-w-[min(96vw,1200px)]"
      >
        <DialogHeader className="text-left">
          <DialogTitle className="line-clamp-2 pr-8">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 items-center justify-center rounded-lg bg-black/40 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={src}
            src={src}
            alt={alt}
            decoding="async"
            loading="lazy"
            className="max-h-[min(85vh,880px)] w-full max-w-full object-contain"
            onError={() => onImageError?.()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
