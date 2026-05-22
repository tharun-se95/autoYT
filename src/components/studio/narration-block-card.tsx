"use client";

import { ImageIcon } from "lucide-react";

import { NarrationMiniAudio } from "@/components/studio/narration-mini-audio";
import { ThumbnailImagePreview } from "@/components/studio/thumbnail-image-preview";
import { VisQueueMotionPreview } from "@/components/studio/vis-queue-motion-preview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ScriptAct, ScriptNarrationBlock } from "@/lib/script-writer/types";
import { toMotionStorageIndex } from "@/lib/studio/beat-timings";
import {
  stillMatchesVisBeat,
  toVisStillBlockIndex,
} from "@/lib/script-writer/vis-block-index";
import type { ListedNarrationSegment } from "@/lib/studio/narration-segment-types";
import type { ListedVisStill } from "@/lib/studio/vis-still-types";
import {
  VIS_STILL_MIN_CHARS,
  VIS_STILL_MIN_WORDS,
  visStillDescriptionShortfall,
} from "@/lib/studio/vis-still-limits";

type NarrationBlockCardProps = {
  videoId: string;
  act: ScriptAct;
  block: ScriptNarrationBlock;
  blockIndex: number;
  segment: ListedNarrationSegment | undefined;
  blockStill: ListedVisStill | undefined;
  stills: ListedVisStill[];
  showMotionClips: boolean;
  clipsVersion: number;
  visBusyKey: string | null;
  visBlockErrors: Record<string, string>;
  onGenerateStill: (
    actId: string,
    storageBlockIndex: number,
    visualDescription: string,
  ) => void;
};

export function NarrationBlockCard({
  videoId,
  act,
  block,
  blockIndex,
  segment,
  blockStill,
  stills,
  showMotionClips,
  clipsVersion,
  visBusyKey,
  visBlockErrors,
  onGenerateStill,
}: NarrationBlockCardProps) {
  const hasNarration = block.narration.trim().length > 0;
  const audioSrc = segment
    ? `${segment.fileUrl}&v=${encodeURIComponent(segment.updatedAt)}`
    : "";
  const beats = block.visualBeats ?? [];
  const hasBeats = beats.length > 0;
  const legacyVis = !hasBeats ? (block.visualDescription ?? "").trim() : "";
  const legacyVisShort =
    legacyVis.length > 0 && visStillDescriptionShortfall(legacyVis) !== null;
  const legacyBusy = visBusyKey === `${act.actId}-${blockIndex}`;
  const legacyThumbSrc = blockStill
    ? `${blockStill.fileUrl}&v=${encodeURIComponent(blockStill.updatedAt)}`
    : "";
  const previewTitle = `${act.displayTitle} · block ${blockIndex + 1}`;
  const legacyErr = visBlockErrors[`${act.actId}-${blockIndex}`];

  return (
    <div
      id={`nar-vis-${act.actId}-${blockIndex}`}
      className="flex flex-col gap-1 border-b border-white/10 pb-2 last:border-b-0 last:pb-0 scroll-mt-14"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[8px] font-medium uppercase tracking-wide text-muted-foreground">
          Block {blockIndex + 1}
          {hasBeats ? (
            <span className="ml-1.5 text-foreground/80">· {beats.length} beats</span>
          ) : null}
        </p>
        <span className="text-[9px] font-medium text-muted-foreground/90">[NAR]</span>
      </div>
      <p className="text-[11px] leading-snug text-foreground">{block.narration}</p>
      {hasNarration ? (
        segment ? (
          <NarrationMiniAudio className="mt-0.5" src={audioSrc} />
        ) : (
          <p className="mt-0.5 text-[9px] leading-snug text-muted-foreground">
            No clip —{" "}
            <span className="font-medium text-foreground">
              Generate all narration blocks
            </span>{" "}
            on Audio.
          </p>
        )
      ) : (
        <p className="mt-0.5 text-[9px] text-muted-foreground leading-snug">
          Empty narration slot.
        </p>
      )}

      {hasBeats ? (
        <div className="mt-1 flex flex-col gap-2 border-t border-white/[0.06] pt-1.5">
          <p className="text-[9px] font-medium text-muted-foreground/90">
            Visual beats — one still per scene (~5s max each; more beats on longer blocks)
          </p>
          <ul className="flex flex-col gap-2">
            {beats.map((beat, bIdx) => {
              const storageIdx = toVisStillBlockIndex(blockIndex, bIdx);
              const busyKey = `${act.actId}-${storageIdx}`;
              const beatStill = stills.find(
                (s) =>
                  s.actId === act.actId &&
                  stillMatchesVisBeat(s.blockIndex, blockIndex, bIdx, {
                    allowLegacyPlainIndex: false,
                  }),
              );
              const beatThumbSrc = beatStill
                ? `${beatStill.fileUrl}&v=${encodeURIComponent(beatStill.updatedAt)}`
                : "";
              const desc = beat.visualDescription.trim();
              const descShortfall =
                desc.length > 0 ? visStillDescriptionShortfall(desc) : null;
              const descShort = descShortfall !== null;
              const beatBusy = visBusyKey === busyKey;
              const beatErr = visBlockErrors[busyKey];
              return (
                <li
                  id={`nar-vis-${act.actId}-${blockIndex}-beat-${bIdx}`}
                  key={bIdx}
                  className="scroll-mt-14 rounded-md border border-white/[0.06] bg-white/[0.02] p-2"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <div
                      className={cn(
                        "w-full max-w-[140px] shrink-0 overflow-hidden rounded border border-white/10",
                        beatBusy && "animate-pulse",
                      )}
                    >
                      {showMotionClips && segment && beatStill ? (
                        <VisQueueMotionPreview
                          videoId={videoId}
                          actId={act.actId}
                          motionStorageIndex={toMotionStorageIndex(
                            blockIndex,
                            bIdx,
                          )}
                          baseBlockIndex={blockIndex}
                          still={beatStill}
                          segment={segment}
                          short={descShort}
                          clipsVersion={clipsVersion}
                          className="max-w-none w-full rounded-sm"
                        />
                      ) : beatStill ? (
                        <ThumbnailImagePreview
                          src={beatThumbSrc}
                          alt=""
                          title={`${previewTitle} · beat ${bIdx + 1}`}
                          description={beat.phrase}
                          frameClassName="aspect-video w-full overflow-hidden rounded-sm"
                        />
                      ) : (
                        <div
                          className="flex aspect-video w-full items-center justify-center rounded border border-dashed border-white/12 bg-black/25"
                          aria-hidden
                        >
                          <ImageIcon className="size-4 text-muted-foreground/70" />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[7.5px] font-semibold uppercase tracking-wider text-cyan-400">
                          Beat {bIdx + 1}
                        </span>
                        <span
                          className="rounded bg-white/5 px-1 py-0.5 text-[9px] text-muted-foreground"
                          title="Trigger phrase in narration"
                        >
                          “{beat.phrase}”
                        </span>
                      </div>
                      <p
                        className="line-clamp-3 text-[10px] leading-snug text-muted-foreground"
                        title={desc}
                      >
                        {desc || (
                          <span className="italic">No visual description</span>
                        )}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 w-fit px-2.5 text-[11px]"
                        disabled={!desc || descShort || beatBusy}
                        onClick={() =>
                          onGenerateStill(act.actId, storageIdx, desc)
                        }
                      >
                        {beatBusy
                          ? "Generating…"
                          : beatStill
                            ? "Regenerate still"
                            : "Generate still"}
                      </Button>
                      {!desc ? (
                        <p className="text-[9px] text-muted-foreground leading-snug">
                          Empty beat — regenerate script on Script stage.
                        </p>
                      ) : descShort ? (
                        <p className="text-[9px] text-amber-400/90 leading-snug">
                          {descShortfall === "words"
                            ? `Under ${VIS_STILL_MIN_WORDS} words — regenerate script for cinematic scene prose.`
                            : `Under ${VIS_STILL_MIN_CHARS} chars — expand for a stronger prompt.`}
                        </p>
                      ) : null}
                      {beatErr ? (
                        <p
                          role="alert"
                          className="text-[9px] text-destructive leading-snug"
                        >
                          {beatErr}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : legacyVis ? (
        <>
          <div className="mt-1 border-t border-white/[0.06] pt-1.5">
            <p className="text-[9px] font-medium text-muted-foreground/90">
              [VIS] (legacy single frame)
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {legacyVis}
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-1.5 sm:flex-row sm:items-start">
            <div
              className={cn(
                "w-full max-w-[180px] shrink-0 overflow-hidden rounded border border-white/10",
                legacyBusy && "animate-pulse",
              )}
            >
              {blockStill ? (
                showMotionClips && segment ? (
                  <VisQueueMotionPreview
                    videoId={videoId}
                    actId={act.actId}
                    motionStorageIndex={toMotionStorageIndex(blockIndex, 0)}
                    baseBlockIndex={blockIndex}
                    still={blockStill}
                    segment={segment}
                    short={legacyVisShort}
                    clipsVersion={clipsVersion}
                    className="max-w-none w-full rounded-sm"
                  />
                ) : (
                  <ThumbnailImagePreview
                    src={legacyThumbSrc}
                    alt=""
                    title={`${previewTitle} · [VIS]`}
                    description="Full-size [VIS] still."
                    frameClassName="aspect-video w-full overflow-hidden rounded-sm"
                  />
                )
              ) : (
                <div
                  className="flex aspect-video w-full items-center justify-center rounded border border-dashed border-white/12 bg-black/25"
                  aria-hidden
                >
                  <ImageIcon className="size-5 text-muted-foreground/70" />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 w-fit px-2.5 text-[11px]"
                disabled={legacyVisShort || legacyBusy}
                onClick={() => onGenerateStill(act.actId, blockIndex, legacyVis)}
              >
                {legacyBusy
                  ? "Generating…"
                  : blockStill
                    ? "Regenerate image"
                    : "Generate image"}
              </Button>
              {legacyVisShort ? (
                <p className="text-[9px] text-amber-400/90 leading-snug">
                  {visStillDescriptionShortfall(legacyVis) === "words"
                    ? `Under ${VIS_STILL_MIN_WORDS} words — regenerate script for cinematic scene prose.`
                    : `Under ${VIS_STILL_MIN_CHARS} chars — expand for a stronger prompt.`}
                </p>
              ) : null}
              {legacyErr ? (
                <p
                  role="alert"
                  className="text-[9px] text-destructive leading-snug"
                >
                  {legacyErr}
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
