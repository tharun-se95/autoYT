"use client";

import { ChevronDown, Loader2Icon, Sparkles } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { generateThumbnailImage } from "@/app/actions/thumbnail-image";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ContentPillar, VideoIdea } from "@/lib/content-architect/types";
import type { PersistedThumbnailMeta } from "@/lib/studio/persisted-thumbnail-meta";
import { persistedThumbnailImageUrl } from "@/lib/studio/persisted-thumbnail-url";
import { ThumbnailImagePreview } from "@/components/studio/thumbnail-image-preview";

const PILLAR_LABEL: Record<ContentPillar, string> = {
  overthinking: "Overthinking",
  emotional_armor: "Emotional armor",
  identity_clarity: "Identity clarity",
  social_dynamics: "Social dynamics",
  habit_architecture: "Habit architecture",
};

type IdeaResultCardProps = {
  idea: VideoIdea;
  /** When set, thumbnail disk/DB rows link to `generated_ideas.id`. */
  generatedIdeaId?: string | null;
  /** `list` — compact row. `grid` — YouTube-style tile (thumb on top). `card` — large 16:9 preview. */
  variant?: "list" | "grid" | "card";
  /** When set, show a primary action to commission this idea for the studio pipeline. */
  onCommission?: () => void;
  /** When a thumbnail was saved to disk / DB, reload uses this URL. */
  persistedThumbnail?: PersistedThumbnailMeta | null;
  /** Called after a successful generate so the parent can refresh persisted rows. */
  onThumbnailSaved?: (
    meta: PersistedThumbnailMeta,
    extras?: { inlineDataUrl: string | null }
  ) => void;
};

function FauxThumbnailFrame({
  overlay,
  glow,
  compact,
  tileTop,
}: {
  overlay: string;
  glow: VideoIdea["thumbnailTextGlow"];
  compact?: boolean;
  tileTop?: boolean;
}) {
  const glowRing =
    glow === "amber"
      ? "shadow-[0_0_20px_rgba(245,158,11,0.3)] border-amber-400/50"
      : "shadow-[0_0_20px_rgba(34,211,238,0.3)] border-cyan-400/50";

  return (
    <div
      className={cn(
        "relative flex aspect-video w-full items-center justify-center overflow-hidden border border-white/10 bg-gradient-to-br from-[#070714] via-[#0f1024] to-[#0a1628]",
        tileTop
          ? "rounded-t-xl rounded-b-none border-b-0"
          : compact
            ? "rounded-lg"
            : "rounded-xl"
      )}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        className={cn(
          "relative z-[1] flex max-h-[78%] flex-col items-center justify-center px-2",
          compact ? "w-[92%] gap-1" : "w-[88%] gap-3 px-3"
        )}
      >
        <p
          className={cn(
            "max-w-full rounded-lg border bg-black/45 text-center font-mono font-semibold uppercase leading-tight tracking-wide text-white",
            glowRing,
            compact
              ? "px-1.5 py-1 text-[9px] sm:text-[10px]"
              : "rounded-xl px-4 py-3 text-sm sm:text-base"
          )}
        >
          {overlay}
        </p>
        {!compact ? (
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            Preview — not generated art
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ThumbnailBlock({
  idea,
  dataUrl,
  persistedImageUrl,
  compact,
  tileTop,
}: {
  idea: VideoIdea;
  dataUrl: string | null;
  persistedImageUrl: string | null;
  compact?: boolean;
  /** Full-width thumbnail with top-only rounding (grid tiles). */
  tileTop?: boolean;
}) {
  const [persistedLoadFailed, setPersistedLoadFailed] = useState(false);

  const persistedLive =
    persistedImageUrl && !persistedLoadFailed ? persistedImageUrl : null;
  const src = dataUrl ?? persistedLive ?? null;
  if (src) {
    return (
      <ThumbnailImagePreview
        src={src}
        alt={`Thumbnail for ${idea.title}`}
        title={idea.title}
        frameClassName={cn(
          "relative aspect-video shrink-0 overflow-hidden border border-white/10 bg-muted/20",
          tileTop
            ? "w-full rounded-t-xl rounded-b-none border-b-0"
            : compact
              ? "w-40 rounded-lg sm:w-52"
              : "w-full rounded-xl"
        )}
        onImageError={() => {
          if (persistedImageUrl && src === persistedImageUrl) {
            setPersistedLoadFailed(true);
          }
        }}
      />
    );
  }
  return (
    <FauxThumbnailFrame
      overlay={idea.thumbnailTextOverlay}
      glow={idea.thumbnailTextGlow}
      compact={compact || tileTop}
      tileTop={tileTop}
    />
  );
}

function BriefPanel({ idea }: { idea: VideoIdea }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] font-medium tracking-wide text-primary uppercase">
        Thumbnail brief
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {idea.thumbnailVisualDescription}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className="max-w-full font-mono text-[10px] uppercase tracking-wide"
        >
          {idea.thumbnailTextOverlay}
        </Badge>
        <Badge variant="secondary" className="text-[10px] capitalize">
          Glow: {idea.thumbnailTextGlow}
        </Badge>
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug">
        Chibi-Lite mentor · curiosity line painted large · navy pill + glow · same
        anatomy and outfit every time
      </p>
    </div>
  );
}

export function IdeaResultCard({
  idea,
  generatedIdeaId,
  variant = "list",
  onCommission,
  persistedThumbnail,
  onThumbnailSaved,
}: IdeaResultCardProps) {
  const titleId = useId();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showBrief, setShowBrief] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const persistedImageUrl = persistedThumbnailImageUrl({
    thumbnailDbEventId: persistedThumbnail?.thumbnailDbEventId,
    thumbnailLocalRelativePath: persistedThumbnail?.thumbnailLocalRelativePath,
  });
  const hasGeneratedImage = !!(dataUrl || persistedImageUrl);

  function onGenerateThumbnail() {
    setLocalError(null);
    startTransition(async () => {
      const out = await generateThumbnailImage(
        {
          visualDescription: idea.thumbnailVisualDescription,
          textOverlay: idea.thumbnailTextOverlay,
          textGlow: idea.thumbnailTextGlow,
        },
        generatedIdeaId?.trim()
          ? { generatedIdeaId: generatedIdeaId.trim() }
          : undefined
      );
      if (out.ok) {
        const dataUrlStr = `data:${out.mimeType};base64,${out.base64}`;
        setDataUrl(dataUrlStr);
        onThumbnailSaved?.(
          {
            thumbnailDbEventId: out.dbEventId ?? null,
            thumbnailLocalRelativePath: out.localRelativePath ?? null,
          },
          { inlineDataUrl: dataUrlStr }
        );
      } else {
        setLocalError(out.error);
      }
    });
  }

  if (variant === "grid") {
    return (
      <>
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0f0f0f]/90 shadow-sm ring-1 ring-white/5">
          <div className="relative aspect-video w-full shrink-0">
            <ThumbnailBlock
              key={`${persistedImageUrl ?? ""}|${dataUrl ? "data" : ""}`}
              idea={idea}
              dataUrl={dataUrl}
              persistedImageUrl={persistedImageUrl}
              tileTop
            />
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 max-w-[70%] truncate rounded bg-black/85 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {PILLAR_LABEL[idea.pillar]}
            </span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
            <h3
              id={titleId}
              className="line-clamp-2 font-heading text-sm font-semibold leading-snug tracking-tight text-foreground"
            >
              {idea.title}
            </h3>
            <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
              {idea.hook}
            </p>
            <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 flex-1 text-xs sm:flex-none"
                disabled={pending}
                onClick={onGenerateThumbnail}
              >
                {pending ? (
                  <>
                    <Loader2Icon
                      className="size-3.5 animate-spin"
                      data-icon="inline-start"
                    />
                    …
                  </>
                ) : hasGeneratedImage ? (
                  "Regenerate"
                ) : (
                  "Thumbnail"
                )}
              </Button>
              <button
                type="button"
                onClick={() => setShowBrief((v) => !v)}
                className="flex h-8 shrink-0 items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-expanded={showBrief}
              >
                Brief
                <ChevronDown
                  className={cn(
                    "size-3.5 opacity-70 transition-transform",
                    showBrief && "rotate-180"
                  )}
                  aria-hidden
                />
              </button>
            </div>
            {localError ? (
              <p role="alert" className="text-[11px] text-destructive leading-snug">
                {localError}
              </p>
            ) : null}
            {showBrief ? <BriefPanel idea={idea} /> : null}
            {onCommission ? (
              <Button
                type="button"
                size="sm"
                className="h-9 w-full text-xs"
                aria-describedby={titleId}
                onClick={() => setConfirmOpen(true)}
              >
                <Sparkles className="size-3.5" data-icon="inline-start" aria-hidden />
                Start in production
              </Button>
            ) : null}
          </div>
        </div>

        {onCommission ? (
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Start this idea in production?</AlertDialogTitle>
                <AlertDialogDescription>
                  This creates a production row and opens the episode workspace (Script
                  first, then Audio, then Visuals). You can remove it later from
                  Production home.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setConfirmOpen(false);
                    onCommission();
                  }}
                >
                  Start in production
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </>
    );
  }

  if (variant === "list") {
    return (
      <>
        <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:gap-3 sm:px-3 sm:py-2.5">
          <div className="mx-auto w-40 shrink-0 sm:mx-0 sm:w-52">
            <ThumbnailBlock
              key={`${persistedImageUrl ?? ""}|${dataUrl ? "data" : ""}`}
              idea={idea}
              dataUrl={dataUrl}
              persistedImageUrl={persistedImageUrl}
              compact
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="font-normal text-[10px]">
                {PILLAR_LABEL[idea.pillar]}
              </Badge>
              <span className="text-[10px] text-muted-foreground capitalize">
                Glow: {idea.thumbnailTextGlow}
              </span>
            </div>

            <h3
              id={titleId}
              className="font-heading text-sm font-semibold leading-snug tracking-tight text-foreground"
            >
              {idea.title}
            </h3>

            <p className="text-xs leading-snug text-muted-foreground line-clamp-2">
              {idea.hook}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 text-xs"
                disabled={pending}
                onClick={onGenerateThumbnail}
              >
                {pending ? (
                  <>
                    <Loader2Icon
                      className="size-3.5 animate-spin"
                      data-icon="inline-start"
                    />
                    Generating…
                  </>
                ) : hasGeneratedImage ? (
                  "Regenerate"
                ) : (
                  "Thumbnail"
                )}
              </Button>
              <button
                type="button"
                onClick={() => setShowBrief((v) => !v)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-expanded={showBrief}
              >
                <span>{showBrief ? "Hide brief" : "Brief"}</span>
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 opacity-70 transition-transform",
                    showBrief && "rotate-180"
                  )}
                  aria-hidden
                />
              </button>
            </div>

            {localError ? (
              <p role="alert" className="text-xs text-destructive leading-snug">
                {localError}
              </p>
            ) : null}

            {showBrief ? <BriefPanel idea={idea} /> : null}

            {onCommission ? (
              <>
                <Separator className="my-2" />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Production
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 w-full text-xs sm:w-auto"
                    aria-describedby={titleId}
                    onClick={() => setConfirmOpen(true)}
                  >
                    <Sparkles className="size-3.5" data-icon="inline-start" aria-hidden />
                    Start in production
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {onCommission ? (
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Start this idea in production?</AlertDialogTitle>
                <AlertDialogDescription>
                  This creates a production row and opens the episode workspace (Script
                  first, then Audio, then Visuals). You can remove it later from
                  Production home.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setConfirmOpen(false);
                    onCommission();
                  }}
                >
                  Start in production
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Card className="overflow-hidden border-white/10 bg-white/[0.04] shadow-none ring-1 ring-white/10 backdrop-blur-xl">
        <div className="px-4 pt-4">
          <ThumbnailBlock
            key={`${persistedImageUrl ?? ""}|${dataUrl ? "data" : ""}`}
            idea={idea}
            dataUrl={dataUrl}
            persistedImageUrl={persistedImageUrl}
          />
        </div>

        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {PILLAR_LABEL[idea.pillar]}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              Glow: {idea.thumbnailTextGlow}
            </span>
          </div>

          <CardTitle
            id={titleId}
            className="text-lg leading-snug tracking-tight sm:text-xl"
          >
            {idea.title}
          </CardTitle>

          <p className="text-sm leading-relaxed text-muted-foreground">{idea.hook}</p>

          <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-fit"
              disabled={pending}
              onClick={onGenerateThumbnail}
            >
              {pending ? (
                <>
                  <Loader2Icon className="animate-spin" data-icon="inline-start" />
                  Generating…
                </>
              ) : hasGeneratedImage ? (
                "Regenerate thumbnail (Imagen)"
              ) : (
                "Generate thumbnail (Imagen)"
              )}
            </Button>
            {localError ? (
              <p role="alert" className="text-sm text-destructive leading-relaxed">
                {localError}
              </p>
            ) : null}
          </div>

          {onCommission ? (
            <>
              <Separator />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Production
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="w-fit"
                  aria-describedby={titleId}
                  onClick={() => setConfirmOpen(true)}
                >
                  <Sparkles data-icon="inline-start" aria-hidden />
                  Start in production
                </Button>
              </div>
            </>
          ) : null}

          <div className="border-t border-white/5 pt-1">
            <button
              type="button"
              onClick={() => setShowBrief((v) => !v)}
              className="flex w-full items-center justify-between gap-2 rounded-lg py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-expanded={showBrief}
            >
              <span>
                {showBrief
                  ? "Hide thumbnail brief"
                  : "Show thumbnail brief (for Imagen)"}
              </span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 opacity-70 transition-transform",
                  showBrief && "rotate-180"
                )}
                aria-hidden
              />
            </button>
            {showBrief ? (
              <div className="mt-1 flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-medium tracking-wide text-primary uppercase">
                  Thumbnail brief
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {idea.thumbnailVisualDescription}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge
                    variant="outline"
                    className="max-w-full font-mono text-xs uppercase tracking-wide"
                  >
                    {idea.thumbnailTextOverlay}
                  </Badge>
                  <Badge variant="secondary" className="text-xs capitalize">
                    Glow: {idea.thumbnailTextGlow}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Chibi-Lite mentor · curiosity line painted large · navy pill + glow
                  · same anatomy and outfit every time
                </p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {onCommission ? (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start this idea in production?</AlertDialogTitle>
              <AlertDialogDescription>
                This creates a production row and opens the episode workspace (Script
                first, then Audio, then Visuals). You can remove it later from
                Production home.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setConfirmOpen(false);
                  onCommission();
                }}
              >
                Start in production
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}
