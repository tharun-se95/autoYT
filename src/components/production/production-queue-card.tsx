"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Clapperboard, Copy, MoreVertical, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommissionedThumbnailArt } from "@/components/production/commissioned-thumbnail-art";
import { cn } from "@/lib/utils";
import {
  isAudioComplete,
  isScriptComplete,
  removeCommissionedVideo,
  resumeHrefForVideo,
  type CommissionedVideo,
} from "@/lib/home/commissioned-videos-storage";

function formatRelativeUpdated(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.round((now - then) / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function stageCornerLabel(v: CommissionedVideo): string {
  if (!isScriptComplete(v)) return "Script";
  if (!isAudioComplete(v)) return "Audio";
  return "Visuals";
}

function GridFauxThumb({ idea }: { idea: CommissionedVideo["idea"] }) {
  const glow =
    idea.thumbnailTextGlow === "amber"
      ? "shadow-[0_0_20px_rgba(245,158,11,0.3)] border-amber-400/50"
      : "shadow-[0_0_20px_rgba(34,211,238,0.3)] border-cyan-400/40";
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative z-[1] flex h-full w-full items-center justify-center px-2">
        <p
          className={cn(
            "max-w-[92%] rounded-lg border bg-black/45 px-2 py-1.5 text-center font-mono text-[10px] font-semibold uppercase leading-tight tracking-wide text-white sm:text-xs",
            glow
          )}
        >
          {idea.thumbnailTextOverlay}
        </p>
      </div>
    </>
  );
}

function ProgressChips({ v }: { v: CommissionedVideo }) {
  const s = isScriptComplete(v);
  const a = isAudioComplete(v);
  const visualsOpen = a;
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge
        variant={s ? "default" : "outline"}
        className="text-xs font-normal capitalize"
      >
        Script {s ? "done" : "todo"}
      </Badge>
      <Badge
        variant={a ? "default" : "outline"}
        className="text-xs font-normal capitalize"
      >
        Audio {a ? "done" : "todo"}
      </Badge>
      <Badge
        variant={visualsOpen ? "default" : "outline"}
        className="text-xs font-normal capitalize"
      >
        Visuals {visualsOpen ? "open" : "locked"}
      </Badge>
    </div>
  );
}

function MiniFauxThumb({ idea }: { idea: CommissionedVideo["idea"] }) {
  const glow =
    idea.thumbnailTextGlow === "amber"
      ? "shadow-[0_0_12px_rgba(245,158,11,0.25)] border-amber-400/40"
      : "shadow-[0_0_12px_rgba(34,211,238,0.25)] border-cyan-400/40";
  return (
    <div
      className="relative flex aspect-video w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-[#070714] via-[#0f1024] to-[#0a1628] sm:w-40"
      aria-hidden
    >
      <p
        className={cn(
          "mx-1 max-w-[92%] rounded border bg-black/50 px-1 py-0.5 text-center font-mono text-[8px] font-semibold uppercase leading-tight text-white sm:text-[9px]",
          glow
        )}
      >
        {idea.thumbnailTextOverlay}
      </p>
    </div>
  );
}

function QueueArtOrGridFauxThumb({ v }: { v: CommissionedVideo }) {
  return (
    <CommissionedThumbnailArt
      video={v}
      withBottomGradient
      fallback={<GridFauxThumb idea={v.idea} />}
    />
  );
}

function QueueArtOrMiniFauxThumb({ v }: { v: CommissionedVideo }) {
  return (
    <CommissionedThumbnailArt
      video={v}
      className="flex aspect-video w-32 shrink-0 overflow-hidden rounded-lg border border-white/10 sm:w-40"
      fallback={<MiniFauxThumb idea={v.idea} />}
    />
  );
}

function RemoveProductionDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this production?</AlertDialogTitle>
          <AlertDialogDescription>
            This clears the commission from this browser. You will lose studio
            access for this ID unless you commission again from Ideas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ProductionQueueCard({
  video: v,
  variant,
  onRemoved,
}: {
  video: CommissionedVideo;
  variant: "compact" | "dashboard" | "grid";
  onRemoved?: () => void;
}) {
  const router = useRouter();
  const [removeOpen, setRemoveOpen] = useState(false);
  const href = resumeHrefForVideo(v);
  const continueLabel =
    !isScriptComplete(v) ? "Continue" : !isAudioComplete(v) ? "Continue" : "Open visuals";

  async function copyId() {
    try {
      await navigator.clipboard.writeText(v.id);
    } catch {
      /* ignore */
    }
  }

  function confirmRemove() {
    removeCommissionedVideo(v.id);
    setRemoveOpen(false);
    onRemoved?.();
  }

  if (variant === "grid") {
    const corner = stageCornerLabel(v);
    return (
      <li className="min-w-0">
        <div className="flex flex-col gap-2">
          <Link
            href={href}
            className="relative flex aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#070714] via-[#0f1024] to-[#0a1628] outline-none ring-offset-background transition-[box-shadow,border-color] hover:border-white/20 focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <QueueArtOrGridFauxThumb v={v} />
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-black/85 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
              {corner}
            </span>
          </Link>

          <div className="flex min-w-0 items-start gap-1 pr-0.5">
            <Link
              href={href}
              className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                {v.workingTitle}
              </h3>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "-mr-1 size-8 shrink-0 text-muted-foreground hover:text-foreground"
                )}
                aria-label={`More actions for ${v.workingTitle}`}
              >
                <MoreVertical className="size-4" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push(href)}
                >
                  Open workspace
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => void copyId()}
                >
                  <Copy className="size-3.5" aria-hidden />
                  Copy production ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={() => setRemoveOpen(true)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="line-clamp-2 text-xs text-muted-foreground">
            In production · Updated {formatRelativeUpdated(v.updatedAt)}
          </p>
        </div>

        <RemoveProductionDialog
          open={removeOpen}
          onOpenChange={setRemoveOpen}
          onConfirm={confirmRemove}
        />
      </li>
    );
  }

  if (variant === "compact") {
    return (
      <li>
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex min-w-0 flex-1 gap-3">
            <QueueArtOrMiniFauxThumb v={v} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Updated {formatRelativeUpdated(v.updatedAt)}
              </p>
              <p className="font-heading text-base font-semibold text-foreground">
                {v.workingTitle}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {v.idea.hook}
              </p>
              <div className="mt-2">
                <ProgressChips v={v} />
              </div>
            </div>
          </div>
          <Link
            href={href}
            className={cn(
              buttonVariants({ size: "sm" }),
              "inline-flex shrink-0 gap-1.5 self-start sm:self-center"
            )}
          >
            <Clapperboard className="size-4" aria-hidden />
            {continueLabel}
          </Link>
        </div>
      </li>
    );
  }

  return (
    <li>
      <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 flex-1 gap-3">
          <QueueArtOrMiniFauxThumb v={v} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">
              Production ID ·{" "}
              <code className="rounded bg-muted/50 px-1 font-mono text-[10px]">
                {v.id.slice(0, 8)}…
              </code>
            </p>
            <p className="mt-1 font-heading text-lg font-semibold text-foreground">
              {v.workingTitle}
            </p>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
              {v.idea.hook}
            </p>
            <div className="mt-3">
              <ProgressChips v={v} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Deep work opens in the episode workspace. Last activity{" "}
              {formatRelativeUpdated(v.updatedAt)}.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link
            href={href}
            className={cn(buttonVariants({ size: "sm" }), "inline-flex gap-1.5")}
          >
            <Clapperboard className="size-4" aria-hidden />
            {continueLabel}
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => void copyId()}
            >
              <Copy className="size-3.5" aria-hidden />
              Copy ID
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => setRemoveOpen(true)}
            >
              <Trash2 className="size-3.5" aria-hidden />
              Remove
            </Button>
          </div>
        </div>
      </div>

      <RemoveProductionDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        onConfirm={confirmRemove}
      />
    </li>
  );
}
