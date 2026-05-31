"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Clapperboard,
  ImageIcon,
  Mic,
  Plus,
  Trash2,
} from "lucide-react";

import { CommissionedThumbnailArt } from "@/components/production/commissioned-thumbnail-art";
import { StudioEpisodeHeader } from "@/components/studio/studio-episode-header";
import { StudioProductionNav } from "@/components/studio/studio-production-nav";
import { useScriptDraft } from "@/components/studio/script-draft-context";
import {
  NarrationAudioSegmentsProvider,
  useNarrationAudioSegments,
} from "@/components/studio/narration-audio-segments-context";
import { StudioMediaStatusBanner } from "@/components/studio/studio-media-status-banner";
import { NarrationBlockCard } from "@/components/studio/narration-block-card";
import { VisBatchReportPanel } from "@/components/studio/vis-batch-report-panel";
import { NarrationMiniAudio } from "@/components/studio/narration-mini-audio";
import { ThumbnailImagePreview } from "@/components/studio/thumbnail-image-preview";
import { StudioAssemblyPreviewPlayer } from "@/components/studio/studio-assembly-preview-player";
import { VisQueueMotionPreview } from "@/components/studio/vis-queue-motion-preview";
import {
  VisStillsSegmentsProvider,
  useVisStillsSegments,
} from "@/components/studio/vis-stills-segments-context";
import {
  VisualsBatchGenerateProvider,
  useVisualsBatchGenerateContext,
} from "@/components/studio/visuals-batch-generate-context";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getCommissionedVideo,
  isAudioComplete,
  isScriptComplete,
  markAudioComplete,
  markScriptComplete,
} from "@/lib/home/commissioned-videos-storage";
import { CHANNEL_DESK_VIDEOS_HREF } from "@/lib/nav/channel-desk";
import { VOCAL_DNA_STUDIO_SUMMARY } from "@/prompts/vocal-dna";
import { LEAD_SCRIPTWRITER_SYSTEM } from "@/prompts/script-writer/build-system-instruction";
import { validateScriptBlockOpenings } from "@/lib/script-writer/validate-block-openings";
import { countNarrationWords } from "@/lib/script-writer/format-tagged";
import { stillMatchesVisBeat } from "@/lib/script-writer/vis-block-index";
import { visStillStorageKey } from "@/lib/studio/vis-batch-report";
import { listNarrationBlocksForTts } from "@/lib/script-writer/narration-for-tts";
import { extractVisQueueFromScript } from "@/lib/script-writer/extract-vis-queue";
import { listAssemblyBeats } from "@/lib/studio/assembly-beats";
import { visStillDescriptionShortfall } from "@/lib/studio/vis-still-limits";
import type { ContentPillar } from "@/lib/content-architect/types";
import {
  AUDIO_DRAFT_UPDATED_EVENT,
  readAudioDraftRows,
  writeAudioDraftRows,
  type AudioDraftRow,
} from "@/lib/studio/audio-draft-storage";

const PROMPT_EXCERPT_LEN = 960;

const PILLAR_LABEL: Record<string, string> = {
  overthinking: "Overthinking",
  emotional_armor: "Emotional armor",
  identity_clarity: "Identity clarity",
  social_dynamics: "Social dynamics",
  habit_architecture: "Habit architecture",
};

function getPillarLabel(pillar: string): string {
  if (pillar in PILLAR_LABEL) return PILLAR_LABEL[pillar]!;
  return pillar.split(/[_-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function stageFromPath(pathname: string): "script" | "audio" | "visuals" {
  if (pathname.includes("/visuals")) return "visuals";
  if (pathname.includes("/audio")) return "audio";
  return "script";
}

function StudioStageSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !defaultOpen) return;
    el.open = true;
  }, [defaultOpen]);

  return (
    <details ref={ref} className="studio-stage-section rounded-md border border-white/10 bg-white/[0.02] ring-1 ring-white/[0.06]">
      <summary className="flex cursor-pointer list-none items-start gap-2 rounded-md px-2.5 py-2 text-left [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
        <div className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold text-foreground">
            {title}
          </span>
          {description ? (
            <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
              {description}
            </span>
          ) : null}
        </div>
        <ChevronDown
          className="studio-stage-section-chevron mt-0.5 size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </summary>
      <div className="border-t border-white/10 px-2.5 py-2">{children}</div>
    </details>
  );
}

function IdeaHeroFrame({
  overlay,
  glow,
}: {
  overlay: string;
  glow: "amber" | "cyan";
}) {
  const glowRing =
    glow === "amber"
      ? "shadow-[0_0_24px_rgba(245,158,11,0.3)] border-amber-400/50"
      : "shadow-[0_0_24px_rgba(34,211,238,0.3)] border-cyan-400/40";
  return (
    <div
      className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-[#070714] via-[#0f1024] to-[#0a1628]"
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="relative z-[1] flex max-h-[78%] w-[88%] flex-col items-center justify-center gap-1 px-2">
        <p
          className={cn(
            "max-w-full rounded-lg border bg-black/45 px-2 py-1.5 text-center font-mono text-[10px] font-semibold uppercase leading-tight tracking-wide text-white sm:text-xs",
            glowRing
          )}
        >
          {overlay}
        </p>
        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-medium tracking-wider text-muted-foreground uppercase">
          Thumbnail preview
        </span>
      </div>
    </div>
  );
}

function EpisodePlayer({
  videoId,
  stage,
}: {
  videoId: string;
  stage: "script" | "audio" | "visuals";
}) {
  const video = getCommissionedVideo(videoId);
  if (!video) return null;
  const idea = video.idea;
  const faux = (
    <IdeaHeroFrame
      overlay={idea.thumbnailTextOverlay}
      glow={idea.thumbnailTextGlow}
    />
  );

  if (stage === "visuals") {
    return (
      <section
        aria-labelledby={`${videoId}-player-heading`}
        className="overflow-hidden rounded-lg border border-white/10 bg-black/40 ring-1 ring-white/10"
      >
        <StudioAssemblyPreviewPlayer
          videoId={videoId}
          workingTitle={video.workingTitle}
        />
        <p id={`${videoId}-player-heading`} className="sr-only">
          Assembly preview — sequential block clips with narration
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={`${videoId}-player-heading`}
      className="overflow-hidden rounded-lg border border-white/10 bg-black/30 ring-1 ring-white/10"
    >
      <h2 id={`${videoId}-player-heading`} className="sr-only">
        {stage === "audio" ? "Audio stage hero" : "Episode thumbnail"}
      </h2>
      <div className="relative aspect-video w-full">
        <CommissionedThumbnailArt video={video} fallback={faux} />
      </div>
    </section>
  );
}

function ScriptDetailsBlock({ videoId }: { videoId: string }) {
  const video = getCommissionedVideo(videoId);
  const {
    brief,
    setBrief,
    script,
    error,
    pending,
    showSeededBanner,
    dismissSeededBanner,
    resetSeedToBlank,
    submitGenerate,
  } = useScriptDraft();

  const openingIssues = script ? validateScriptBlockOpenings(script) : [];

  if (!video) return null;
  const excerpt =
    LEAD_SCRIPTWRITER_SYSTEM.length > PROMPT_EXCERPT_LEN
      ? `${LEAD_SCRIPTWRITER_SYSTEM.slice(0, PROMPT_EXCERPT_LEN)}…`
      : LEAD_SCRIPTWRITER_SYSTEM;

  return (
    <div className="flex flex-col gap-2">
      <StudioStageSection
        title="Episode"
        description="Pillar, glow, working title, hook"
        defaultOpen
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant="secondary"
              className="h-5 px-1.5 py-0 text-[10px] font-normal"
            >
              {getPillarLabel(video.idea.pillar)}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              Glow: {video.idea.thumbnailTextGlow}
            </span>
          </div>
          <div>
            <p className="font-heading text-sm font-semibold tracking-tight text-foreground">
              {video.workingTitle}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
              {video.idea.hook}
            </p>
          </div>
        </div>
      </StudioStageSection>

      <StudioStageSection
        title="System prompt (excerpt)"
        description="Lead scriptwriter model context — open when tuning behavior"
      >
        <div>
          <p className="text-[11px] leading-snug text-muted-foreground whitespace-pre-wrap">
            {excerpt}
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground leading-snug">
            Full instruction source:{" "}
            <code className="rounded bg-muted/50 px-1 py-0.5 text-[9px]">
              prompts/script-writer/build-system-instruction.ts
            </code>
          </p>
        </div>
      </StudioStageSection>

      <StudioStageSection
        title="Brief & generate"
        description="Episode brief, run the writer, fix errors"
        defaultOpen
      >
        <div className="flex flex-col gap-2">
          {showSeededBanner ? (
            <div className="flex flex-col gap-1.5 rounded-md border border-primary/25 bg-primary/5 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-3">
              <p className="text-[11px] text-muted-foreground leading-snug sm:text-xs">
                Prefilled from your commissioned idea. Edit freely before
                generating.
              </p>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={dismissSeededBanner}
                >
                  Dismiss
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={resetSeedToBlank}
                >
                  Reset to blank
                </Button>
              </div>
            </div>
          ) : null}

          <form onSubmit={submitGenerate} className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="episode-brief"
                className="text-xs font-medium text-foreground"
              >
                Episode brief
              </label>
              <p className="text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
                Four acts (~2k words),{" "}
                <strong className="font-medium text-foreground">[NAR]</strong> blocks with{" "}
                <strong className="font-medium text-foreground">phrase-timed visual beats</strong>{" "}
                (~5s max each; more on long blocks; first beat = opening words — A/V starts together), plus a
                curiosity bridge per act.
              </p>
              <Textarea
                id="episode-brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Example: Why smart people still doom-scroll after work…"
                className="min-h-[6.5rem] resize-y rounded-md text-xs leading-snug"
                disabled={pending}
                required
                aria-invalid={!!error && !script}
              />
            </div>
            <Button
              type="submit"
              disabled={pending}
              size="sm"
              className="h-8 w-fit text-xs"
            >
              {pending ? "Writing script…" : "Generate script"}
            </Button>
            {error ? (
              <p role="alert" className="text-xs text-destructive leading-snug">
                {error}
              </p>
            ) : null}
            {openingIssues.length > 0 ? (
              <p
                role="status"
                className="text-xs text-amber-600 dark:text-amber-400 leading-snug"
              >
                {openingIssues.length} block
                {openingIssues.length === 1 ? "" : "s"} do not open on the first
                visual phrase — regenerate or edit before saving to disk.
              </p>
            ) : null}
          </form>
        </div>
      </StudioStageSection>
    </div>
  );
}

function NarrationTtsControls() {
  const { videoId, segments, loadError, reloadSegments } =
    useNarrationAudioSegments();
  const { script } = useScriptDraft();
  const [genError, setGenError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  const runAllBlocks = async () => {
    if (!script) return;
    const blocks = listNarrationBlocksForTts(script);
    if (blocks.length === 0) {
      setGenError("No narration blocks in the saved script.");
      return;
    }
    setGenError(null);
    setPending(true);
    setProgress({ done: 0, total: blocks.length });
    try {
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const res = await fetch("/api/studio/audio/tts/block", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId,
            actId: b.actId,
            blockIndex: b.blockIndex,
            narration: b.narration,
            workingTitle: script.workingTitle,
          }),
        });
        const raw = await res.text();
        let data: { ok?: boolean; error?: string };
        try {
          data = JSON.parse(raw) as typeof data;
        } catch {
          setGenError(`Block ${i + 1}: non-JSON response (${res.status}).`);
          break;
        }
        if (!res.ok || !data.ok) {
          setGenError(
            typeof data.error === "string"
              ? `Block ${i + 1} (${b.actId} #${b.blockIndex}): ${data.error}`
              : `Block ${i + 1} failed (${res.status}).`,
          );
          break;
        }
        setProgress({ done: i + 1, total: blocks.length });
      }
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      await reloadSegments();
      setPending(false);
      setProgress(null);
    }
  };

  if (!script) {
    return (
      <p className="text-xs text-muted-foreground leading-snug">
        Save a four-act script in this browser to enable Gemini TTS.
      </p>
    );
  }

  const blockCount = listNarrationBlocksForTts(script).length;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] leading-snug text-muted-foreground">
        <span className="font-medium text-foreground">Vocal DNA (summary):</span>{" "}
        {VOCAL_DNA_STUDIO_SUMMARY}
      </p>
      <p className="text-[10px] text-muted-foreground">
        Per-block Gemini TTS ({blockCount} narration blocks) — each block gets a
        fresh synthesis pass and act-specific direction. Playback controls sit next
        to each [NAR] line in the main column. Clips are stored under your
        configured local assets root; when Supabase is configured, segment metadata
        is persisted there too (see{" "}
        <code className="text-foreground">src/prompts/README.md</code>).
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs"
          disabled={pending || blockCount === 0}
          onClick={() => void runAllBlocks()}
        >
          {pending
            ? progress
              ? `Generating ${progress.done}/${progress.total}…`
              : "Generating…"
            : "Generate all narration blocks"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={pending}
          onClick={() => void reloadSegments()}
        >
          Refresh
        </Button>
      </div>
      {loadError ? (
        <p role="alert" className="text-xs text-destructive leading-snug">
          {loadError}
        </p>
      ) : null}
      {genError ? (
        <p role="alert" className="text-xs text-destructive leading-snug">
          {genError}
        </p>
      ) : null}
      <p className="text-[10px] leading-snug text-muted-foreground">
        {segments.length > 0 ? (
          <>
            <span className="font-medium text-foreground">{segments.length}</span>{" "}
            narration clip{segments.length === 1 ? "" : "s"} on disk — preview each
            one next to its [NAR] line in the main column (no duplicate players
            here).
          </>
        ) : (
          <>
            No clips yet. Run &quot;Generate all narration blocks&quot; after local
            assets and API keys are set in your project environment (see{" "}
            <code className="text-foreground">src/prompts/README.md</code>).
          </>
        )}
      </p>
      <p className="text-[10px] leading-snug text-muted-foreground">
        Uses vocal DNA from <code className="text-foreground">vocal-dna.ts</code> and
        per-act director notes in{" "}
        <code className="text-foreground">narration-tts-act-notes.ts</code>. Optional
        TTS model and voice are configured via project env — same README section.
      </p>
    </div>
  );
}

function AudioDetailsBlock({ videoId }: { videoId: string }) {
  const video = getCommissionedVideo(videoId);
  const { brief } = useScriptDraft();
  if (!video) return null;

  if (!isScriptComplete(video)) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-amber-500/25 bg-amber-500/5 p-3">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          Audio is locked
        </h2>
        <p className="text-xs text-muted-foreground leading-snug">
          Mark the script complete on the Script stage first so audio stays tied
          to a locked four-act structure.
        </p>
        <Link
          href={`/studio/${videoId}/script`}
          className={cn(buttonVariants({ size: "sm" }), "w-fit")}
        >
          Go to Script
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <StudioStageSection
        title="Voice & sound"
        description="What this stage is for — keep open while planning takes"
        defaultOpen
      >
        <p className="text-xs text-muted-foreground leading-snug">
          Plan room tone and music beds under narration. Gemini TTS below uses
          the locked script (voice + performance rules in{" "}
          <code className="text-foreground">vocal-dna.ts</code>).
        </p>
      </StudioStageSection>

      <StudioStageSection
        title="Locked episode brief"
        description="Read-only copy from Script — open when you need the exact brief"
      >
        <p className="whitespace-pre-wrap text-[11px] leading-snug text-muted-foreground">
          {brief.trim() || "— No brief saved in this browser yet."}
        </p>
      </StudioStageSection>

      <StudioStageSection
        title="Gemini TTS (vocal DNA)"
        description="Narration from the saved script — performance rules injected automatically"
        defaultOpen
      >
        <NarrationTtsControls />
      </StudioStageSection>
    </div>
  );
}

function VisualsDetailsBlock({ videoId }: { videoId: string }) {
  const video = getCommissionedVideo(videoId);
  if (!video) return null;
  if (!isAudioComplete(video)) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-amber-500/25 bg-amber-500/5 p-3">
        <h2 className="font-heading text-sm font-semibold text-foreground">
          Visuals are locked
        </h2>
        <p className="text-xs text-muted-foreground leading-snug">
          Mark audio complete first so visuals can reference a finished sound pass
          (even if it is still lightweight for now).
        </p>
        <Link
          href={`/studio/${videoId}/audio`}
          className={cn(buttonVariants({ size: "sm" }), "w-fit")}
        >
          Go to Audio
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <StudioStageSection
        title="Visuals"
        description="Scope and quick links"
        defaultOpen={false}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
          <p className="max-w-prose text-xs text-muted-foreground leading-snug">
            One Imagen still per visual beat (count scales with block length; ~5s max per beat). Batch tools live in
            the Visuals tab; per-beat work happens in the Narration column.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={CHANNEL_DESK_VIDEOS_HREF}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-7 text-xs"
              )}
            >
              Videos desk
            </Link>
            <Link
              href="/studio"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "h-7 text-xs"
              )}
            >
              Production home
            </Link>
          </div>
        </div>
      </StudioStageSection>
    </div>
  );
}

function NarrationColumn({
  videoId,
  showMotionClips = false,
}: {
  videoId: string;
  showMotionClips?: boolean;
}) {
  const { clipsVersion } = useVisualsBatchGenerateContext();
  const { script, copyDone, copyTaggedTranscript } = useScriptDraft();
  const { segments, loadError: segmentLoadError } = useNarrationAudioSegments();
  const { stills, loadError: visStillsLoadError, reloadStills } =
    useVisStillsSegments();
  const [visBlockErrors, setVisBlockErrors] = useState<Record<string, string>>({});
  const [visBusyKey, setVisBusyKey] = useState<string | null>(null);
  const counts = script ? countNarrationWords(script) : null;

  const segmentByActBlock = useMemo(() => {
    const m = new Map<string, (typeof segments)[number]>();
    for (const s of segments) {
      m.set(`${s.actId}:${s.blockIndex}`, s);
    }
    return m;
  }, [segments]);

  const generateVisStill = async (
    actId: string,
    blockIndex: number,
    visualDescription: string,
  ) => {
    if (!script) return;
    const key = `${actId}-${blockIndex}`;
    setVisBlockErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setVisBusyKey(key);
    try {
      const res = await fetch("/api/studio/visuals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          actId,
          blockIndex,
          visualDescription,
          workingTitle: script.workingTitle,
        }),
      });
      const raw = await res.text();
      let data: { ok?: boolean; error?: string };
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        setVisBlockErrors((prev) => ({
          ...prev,
          [key]: `Non-JSON response (${res.status}).`,
        }));
        return;
      }
      if (!res.ok || !data.ok) {
        setVisBlockErrors((prev) => ({
          ...prev,
          [key]:
            typeof data.error === "string"
              ? data.error
              : `Request failed (${res.status}).`,
        }));
        return;
      }
      await reloadStills();
    } catch (e) {
      setVisBlockErrors((prev) => ({
        ...prev,
        [key]: e instanceof Error ? e.message : "Image request failed.",
      }));
    } finally {
      setVisBusyKey(null);
    }
  };

  if (!script) {
    return (
      <section
        aria-labelledby="narration-heading"
        className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
      >
        <h2
          id="narration-heading"
          className="font-heading text-sm font-semibold text-foreground"
        >
          Narration
        </h2>
        <p className="mt-1.5 text-xs text-muted-foreground leading-snug">
          Generate a script from the episode brief above. The four-act narration
          appears here for read-aloud and audio reference.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="narration-heading"
      className="rounded-lg border border-white/10 bg-white/[0.02] p-3 sm:p-3.5"
    >
      <div className="mx-auto w-full max-w-prose">
        <div className="flex flex-col gap-2 border-b border-white/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2
              id="narration-heading"
              className="font-heading text-sm font-semibold tracking-tight text-foreground"
            >
              Narration
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Four-act script: [NAR] blocks (3–6 sentences), [VIS] beats scaled to narration length, TTS per block, and
              stills / motion previews per beat.
            </p>
            {segmentLoadError ? (
              <p
                role="alert"
                className="mt-2 text-[10px] text-destructive leading-snug"
              >
                Could not load saved narration audio: {segmentLoadError}
              </p>
            ) : null}
            {visStillsLoadError ? (
              <p
                role="alert"
                className="mt-2 text-[10px] text-destructive leading-snug"
              >
                Could not load saved [VIS] stills: {visStillsLoadError}
              </p>
            ) : null}
            {counts ? (
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
                <span className="font-medium text-foreground">Words (approx.)</span>{" "}
                <span className="tabular-nums text-foreground">{counts.total}</span> total
                {script.acts.map((a) => (
                  <span key={a.actId} className="ml-2 inline-block">
                    · {a.displayTitle}{" "}
                    <span className="tabular-nums text-muted-foreground">
                      {counts.perAct[a.actId] ?? 0}
                    </span>
                  </span>
                ))}
                {counts.total < 1800 ? (
                  <span className="mt-1 block text-amber-400/95 sm:mt-0 sm:ml-2 sm:inline">
                    Under ~2000 words — consider a richer brief before locking.
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 self-start px-3 text-xs sm:self-end"
            onClick={() => void copyTaggedTranscript()}
          >
            {copyDone ? "Copied" : "Copy transcript"}
          </Button>
        </div>

        <ul className="mt-3 flex flex-col gap-1.5">
        {script.acts.map((act) => (
          <li key={act.actId}>
            <details
              className="group rounded-md bg-black/20 ring-1 ring-inset ring-white/[0.07] open:bg-black/25 open:ring-white/12"
              open={act.actId === "mess"}
            >
              <summary className="cursor-pointer list-none rounded-md px-2 py-2 sm:px-2.5 [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-heading text-xs font-semibold text-foreground">
                    {act.displayTitle}
                  </span>
                  <Badge variant="secondary" className="h-4 px-1 py-0 font-mono text-[9px] leading-none">
                    {act.actId}
                  </Badge>
                </div>
              </summary>
              <div className="flex flex-col gap-2 border-t border-white/10 px-2 pb-2 pt-2 sm:px-2.5">
                {act.narrationBlocks.map((block, i) => (
                  <NarrationBlockCard
                    key={`${act.actId}-${i}`}
                    videoId={videoId}
                    act={act}
                    block={block}
                    blockIndex={i}
                    segment={segmentByActBlock.get(`${act.actId}:${i}`)}
                    blockStill={stills.find(
                      (s) =>
                        s.actId === act.actId &&
                        stillMatchesVisBeat(s.blockIndex, i, 0, {
                          allowLegacyPlainIndex: !(
                            block.visualBeats && block.visualBeats.length > 0
                          ),
                        }),
                    )}
                    stills={stills}
                    showMotionClips={showMotionClips}
                    clipsVersion={clipsVersion}
                    visBusyKey={visBusyKey}
                    visBlockErrors={visBlockErrors}
                    onGenerateStill={generateVisStill}
                  />
                ))}
                <div className="border-t border-primary/20 pt-1.5">
                  <p className="text-[9px] font-medium uppercase tracking-wide text-primary/90">
                    Curiosity bridge
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-foreground">
                    {act.curiosityBridge}
                  </p>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}

function ScriptQueueAside({ videoId }: { videoId: string }) {
  const video = getCommissionedVideo(videoId);
  if (!video) return null;
  return (
    <div className="flex flex-col gap-2" role="region" aria-label="Related idea cues">
      <StudioStageSection
        title="Related idea"
        description="Commissioned title & hook — collapse when you do not need it"
        defaultOpen
      >
        <div className="flex gap-1.5 rounded-md border border-white/10 bg-black/20 p-1.5">
          <div className="relative aspect-video w-[4.5rem] shrink-0 overflow-hidden rounded border border-white/10 bg-gradient-to-br from-[#070714] to-[#0a1628]">
            <p className="absolute inset-0 flex items-center justify-center p-0.5 text-center font-mono text-[6px] font-semibold uppercase leading-tight text-white">
              {video.idea.thumbnailTextOverlay}
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-3 text-[11px] font-medium text-foreground leading-snug">
              {video.idea.title}
            </p>
            <p className="mt-0.5 line-clamp-3 text-[10px] text-muted-foreground leading-snug">
              {video.idea.hook}
            </p>
          </div>
        </div>
      </StudioStageSection>
    </div>
  );
}

function CollapsibleScriptStageDetails({ videoId }: { videoId: string }) {
  const [open, setOpen] = useState(true);
  const detailsId = "episode-details-heading";

  return (
    <section
      aria-labelledby={detailsId}
      className="rounded-lg border border-white/10 bg-[#0f0f0f]/40 p-2.5 ring-1 ring-white/5 sm:p-3"
    >
      <div className="flex items-center justify-between gap-1.5 border-b border-white/10 pb-2">
        <h2
          id={detailsId}
          className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-foreground"
        >
          <Clapperboard className="size-3.5 shrink-0 text-primary" aria-hidden />
          <span className="truncate">Stage 1 · Script</span>
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={
            open
              ? "Collapse Stage 1 · Script details"
              : "Expand Stage 1 · Script details"
          }
        >
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </Button>
      </div>
      {open ? (
        <div className="pt-2.5">
          <ScriptDetailsBlock videoId={videoId} />
        </div>
      ) : null}
    </section>
  );
}

function ScriptStageAsideColumn({ videoId }: { videoId: string }) {
  return (
    <aside
      className="flex flex-col gap-2.5"
      aria-label="Stage 1 script details and related cues"
    >
      <CollapsibleScriptStageDetails videoId={videoId} />
      <ScriptQueueAside videoId={videoId} />
    </aside>
  );
}

function CollapsibleAudioStageDetails({ videoId }: { videoId: string }) {
  const [open, setOpen] = useState(true);
  const detailsId = "episode-details-heading";

  return (
    <section
      aria-labelledby={detailsId}
      className="rounded-lg border border-white/10 bg-[#0f0f0f]/40 p-2.5 ring-1 ring-white/5 sm:p-3"
    >
      <div className="flex items-center justify-between gap-1.5 border-b border-white/10 pb-2">
        <h2
          id={detailsId}
          className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-foreground"
        >
          <Clapperboard className="size-3.5 shrink-0 text-primary" aria-hidden />
          <span className="truncate">Stage 2 · Audio</span>
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={
            open
              ? "Collapse Stage 2 · Audio details"
              : "Expand Stage 2 · Audio details"
          }
        >
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </Button>
      </div>
      {open ? (
        <div id="audio-stage-details-panel" className="pt-2.5">
          <AudioDetailsBlock videoId={videoId} />
        </div>
      ) : null}
    </section>
  );
}

function AudioQueueList({ videoId }: { videoId: string }) {
  const video = getCommissionedVideo(videoId);
  const unlocked = !!(video && isScriptComplete(video));

  const [rows, setRows] = useState<AudioDraftRow[]>([]);

  useEffect(() => {
    if (!unlocked) return;
    const load = () => setRows(readAudioDraftRows(videoId));
    load();
    window.addEventListener(AUDIO_DRAFT_UPDATED_EVENT, load);
    return () =>
      window.removeEventListener(AUDIO_DRAFT_UPDATED_EVENT, load);
  }, [videoId, unlocked]);

  const addRow = useCallback(() => {
    if (!unlocked) return;
    setRows((prev) => {
      const next: AudioDraftRow[] = [
        {
          id: crypto.randomUUID(),
          label: `Take ${prev.length + 1}`,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ];
      writeAudioDraftRows(videoId, next);
      return next;
    });
  }, [videoId, unlocked]);

  const removeRow = useCallback(
    (id: string) => {
      if (!unlocked) return;
      setRows((prev) => {
        const next = prev.filter((r) => r.id !== id);
        writeAudioDraftRows(videoId, next);
        return next;
      });
    },
    [videoId, unlocked]
  );

  if (!unlocked) {
    return (
      <div className="rounded-md border border-white/10 bg-white/[0.02] p-2.5 text-[11px] leading-snug text-muted-foreground">
        Audio queue unlocks after the script stage is marked complete.
      </div>
    );
  }

  return (
    <StudioStageSection
      title="Take stubs"
      description="Placeholder takes — collapse when focusing on the stage panel"
      defaultOpen
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">
            Queue
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-0.5 px-2 text-[10px]"
            onClick={addRow}
          >
            <Plus className="size-3" aria-hidden />
            Add stub
          </Button>
        </div>
        <ul className="flex flex-col gap-1.5">
          {rows.length === 0 ? (
            <li className="rounded-md border border-dashed border-white/15 p-2.5 text-center text-[11px] leading-snug text-muted-foreground">
              No rows yet. Add a placeholder take to mimic a suggested-video list.
            </li>
          ) : (
            rows.map((r) => (
              <li
                key={r.id}
                className="flex gap-1.5 rounded-md border border-white/10 bg-white/[0.03] p-1.5"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded border border-white/10 bg-black/30">
                  <Mic className="size-4 text-muted-foreground" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {r.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${r.label}`}
                  onClick={() => removeRow(r.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))
          )}
        </ul>
    </div>
    </StudioStageSection>
  );
}

function AudioStageAsideColumn({ videoId }: { videoId: string }) {
  return (
    <aside
      className="flex flex-col gap-2.5"
      aria-label="Stage 2 audio details and queue"
    >
      <CollapsibleAudioStageDetails videoId={videoId} />
      <AudioQueueList videoId={videoId} />
    </aside>
  );
}

function VisualsQueueAside({ videoId }: { videoId: string }) {
  const video = getCommissionedVideo(videoId);
  const { script } = useScriptDraft();
  const { stills, loadError } = useVisStillsSegments();
  const { segments } = useNarrationAudioSegments();
  const {
    readyCount,
    clipReadyCount,
    genError: batchGenError,
    batchReport,
    retryCount,
    dismissBatchReport,
    clipError: batchClipError,
    pending: batchPending,
    progress: batchProgress,
    runAll: runAllVisuals,
    runFailedOrMissing,
    visStillMinWords,
    clipsPending,
    clipsProgress,
    runAllClips,
    clipsVersion,
    refreshStudioVisuals,
    refreshPending,
  } = useVisualsBatchGenerateContext();

  if (!video || !isAudioComplete(video)) {
    return (
      <aside
        className="flex flex-col gap-2"
        aria-label="Visual prompts from script"
      >
        <StudioStageSection
          title="Shot list locked"
          description="Audio stage must be complete first"
          defaultOpen
        >
          <p className="text-[11px] leading-snug text-muted-foreground">
            [VIS] queue unlocks after audio is marked complete.
          </p>
        </StudioStageSection>
      </aside>
    );
  }

  const visQueue = extractVisQueueFromScript(script);
  const assemblyBeats = useMemo(
    () => listAssemblyBeats(script, segments, stills),
    [script, segments, stills],
  );

  const stillByStorageKey = useMemo(() => {
    const m = new Map<string, (typeof stills)[number]>();
    for (const s of stills) {
      m.set(`${s.actId}:${s.blockIndex}`, s);
    }
    return m;
  }, [stills]);

  const savedVisCount = useMemo(
    () =>
      visQueue.filter((it) =>
        stillByStorageKey.has(
          visStillStorageKey(it.actId, it.blockIndex, it.beatIndex),
        ),
      ).length,
    [visQueue, stillByStorageKey],
  );

  const jumpToBeat = (
    actId: string,
    blockIndex: number,
    beatIndex: number,
  ) => {
    const beatEl = document.getElementById(
      `nar-vis-${actId}-${blockIndex}-beat-${beatIndex}`,
    );
    const blockEl = document.getElementById(`nar-vis-${actId}-${blockIndex}`);
    (beatEl ?? blockEl)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <aside className="flex flex-col gap-2" aria-label="Visual prompts from script">
      <StudioStageSection
        title="Shot progress"
        description="One Ken Burns clip per visual beat, timed to phrase length in the narration"
        defaultOpen
      >
        <div className="mb-2 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {visQueue.length > 0 ? (
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{savedVisCount}</span>
                {" / "}
                <span className="text-foreground">{visQueue.length}</span> stills saved
                {" · "}
                <span className="font-medium text-foreground">{assemblyBeats.length}</span>{" "}
                clips ready
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">No shots yet</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 flex-1 text-[11px] sm:flex-none sm:px-3"
              disabled={batchPending || clipsPending || readyCount === 0 || !script}
              onClick={() => void runAllVisuals()}
            >
              {batchPending
                ? batchProgress
                  ? `Generating ${batchProgress.done}/${batchProgress.total}…`
                  : "Generating…"
                : `Generate stills (${readyCount} ready)`}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 text-[10px]"
              disabled={batchPending || clipsPending || refreshPending}
              onClick={() => void refreshStudioVisuals()}
            >
              {refreshPending ? "Refreshing…" : "Refresh"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 flex-1 text-[11px] sm:flex-none sm:px-3"
              disabled={batchPending || clipsPending || clipReadyCount === 0}
              onClick={() => void runAllClips()}
            >
              {clipsPending
                ? clipsProgress
                  ? `Clips ${clipsProgress.done}/${clipsProgress.total}…`
                  : "Rendering clips…"
                : `Generate clips (${clipReadyCount} ready)`}
            </Button>
            {retryCount > 0 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 flex-1 text-[11px] sm:flex-none sm:px-3"
                disabled={batchPending || clipsPending}
                onClick={() => void runFailedOrMissing()}
              >
                {batchPending
                  ? "Retrying…"
                  : `Retry failed & missing (${retryCount})`}
              </Button>
            ) : null}
          </div>
        </div>
        {batchReport ? (
          <VisBatchReportPanel
            className="mb-2"
            compact
            report={batchReport}
            retryCount={retryCount}
            pending={batchPending}
            minWords={visStillMinWords}
            onRetry={() => void runFailedOrMissing()}
            onDismiss={dismissBatchReport}
          />
        ) : null}
        {loadError ? (
          <p role="alert" className="mb-2 text-[10px] text-destructive leading-snug">
            {loadError}
          </p>
        ) : null}
        {batchReport ? null : batchGenError ? (
          <p role="alert" className="mb-2 text-[10px] text-destructive leading-snug">
            {batchGenError}
          </p>
        ) : null}
        {batchClipError ? (
          <p role="alert" className="mb-2 text-[10px] text-destructive leading-snug">
            {batchClipError}
          </p>
        ) : null}
        {assemblyBeats.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/15 p-2.5 text-[11px] leading-snug text-muted-foreground">
            No visual beats yet. Generate a script on the Script stage first.
          </p>
        ) : (
          <ul className="flex max-h-[min(70vh,32rem)] flex-col gap-2 overflow-y-auto pr-0.5">
            {assemblyBeats.map((item, idx) => {
              const short =
                visStillDescriptionShortfall(item.visualDescription) !== null;
              const itemKey = visStillStorageKey(
                item.actId,
                item.baseBlockIndex,
                item.beatIndex,
              );
              const batchFailed = batchReport?.failed.find(
                (f) =>
                  visStillStorageKey(
                    f.item.actId,
                    f.item.blockIndex,
                    f.item.beatIndex,
                  ) === itemKey,
              );
              const batchMissing = batchReport?.missing.some(
                (m) =>
                  visStillStorageKey(m.actId, m.blockIndex, m.beatIndex) ===
                  itemKey,
              );
              return (
                <li
                  key={`${item.actId}-${item.motionStorageIndex}-${idx}`}
                  className={cn(
                    "flex flex-col gap-2 rounded-md border bg-white/[0.03] p-2 sm:flex-row sm:items-start sm:gap-2",
                    batchFailed
                      ? "border-destructive/40 ring-1 ring-destructive/20"
                      : batchMissing
                        ? "border-amber-500/40 ring-1 ring-amber-500/20"
                        : "border-white/10",
                  )}
                >
                  <VisQueueMotionPreview
                    videoId={videoId}
                    actId={item.actId}
                    motionStorageIndex={item.motionStorageIndex}
                    baseBlockIndex={item.baseBlockIndex}
                    still={item.still}
                    segment={item.segment}
                    short={short}
                    clipsVersion={clipsVersion}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[10px] font-medium text-foreground">
                      {item.actTitle} · block {item.baseBlockIndex + 1} · beat{" "}
                      {item.beatIndex + 1}
                    </span>
                    <span
                      className="line-clamp-2 text-[10px] text-muted-foreground"
                      title={item.visualDescription}
                    >
                      “{item.phrase}” — {item.visualDescription}
                    </span>
                    {batchFailed ? (
                      <span className="text-[9px] text-destructive leading-snug">
                        Failed: {batchFailed.error}
                      </span>
                    ) : batchMissing ? (
                      <span className="text-[9px] text-amber-400/95 leading-snug">
                        Still missing after batch — use Retry below
                      </span>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-fit px-2 text-[10px]"
                      onClick={() =>
                        jumpToBeat(
                          item.actId,
                          item.baseBlockIndex,
                          item.beatIndex,
                        )
                      }
                    >
                      Jump
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </StudioStageSection>
    </aside>
  );
}

function StudioGlobalStageHandoff({ videoId }: { videoId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const stage = stageFromPath(pathname);
  const video = getCommissionedVideo(videoId);
  const { generatedThisSession } = useScriptDraft();
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  if (!video) return null;

  const scriptDone = isScriptComplete(video);
  const audioDone = isAudioComplete(video);

  if (stage === "script") {
    return (
      <div
        className="mb-3 flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        role="region"
        aria-label="Lock script and unlock Audio"
      >
        <p className="text-[11px] leading-snug text-muted-foreground sm:max-w-[55%]">
          {scriptDone
            ? "Script is locked in for this episode. Continue in Audio when you are ready."
            : "When you are happy with the generated script, lock the Script stage to unlock Audio."}
        </p>
        <div className="flex min-w-0 flex-col gap-1.5 sm:max-w-[45%] sm:items-end">
          {!scriptDone ? (
            <>
              <Button
                type="button"
                size="sm"
                className="h-8 w-full text-xs sm:w-auto"
                disabled={!generatedThisSession}
                onClick={() => {
                  markScriptComplete(videoId);
                  router.push(`/studio/${videoId}/audio`);
                }}
              >
                Mark script complete & unlock Audio
              </Button>
              <p className="text-[10px] text-muted-foreground sm:max-w-sm sm:text-right">
                Enabled after a successful generate in this session (or a loaded
                draft with a script) so you do not accidentally ship an empty
                script.
              </p>
            </>
          ) : (
            <Link
              href={`/studio/${videoId}/audio`}
              className={cn(
                buttonVariants({ size: "sm" }),
                "flex h-8 w-full items-center justify-center text-xs sm:w-auto"
              )}
            >
              Open Audio stage
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (stage === "audio") {
    if (!scriptDone) {
      return (
        <div
          className="mb-3 flex flex-col gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          role="region"
          aria-label="Audio locked until script complete"
        >
          <p className="text-[11px] leading-snug text-muted-foreground">
            Audio stays locked until the Script stage is marked complete.
          </p>
          <Link
            href={`/studio/${videoId}/script`}
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "shrink-0 text-xs"
            )}
          >
            Go to Script
          </Link>
        </div>
      );
    }

    return (
      <div
        className="mb-3 flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        role="region"
        aria-label="Lock audio and unlock Visuals"
      >
        <p className="text-[11px] leading-snug text-muted-foreground sm:max-w-[55%]">
          {audioDone
            ? "Audio is locked in. Visuals is unlocked — open the Visuals tab when you are ready."
            : "When your sound pass is ready, mark Audio complete to unlock Visuals."}
        </p>
        <div className="flex min-w-0 flex-col items-stretch gap-1.5 sm:items-end">
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            disabled={audioDone}
            onClick={() => {
              markAudioComplete(videoId);
              setAudioNotice("Audio marked complete — Visuals is unlocked.");
              router.refresh();
            }}
          >
            Mark audio complete & unlock Visuals
          </Button>
          {audioNotice ? (
            <p
              className="text-[10px] text-muted-foreground sm:text-right"
              role="status"
            >
              {audioNotice}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (stage === "visuals" && !audioDone) {
    return (
      <div
        className="mb-3 flex flex-col gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
        role="region"
        aria-label="Visuals locked until audio complete"
      >
        <p className="text-[11px] leading-snug text-muted-foreground">
          Visuals unlock after Audio is marked complete.
        </p>
        <Link
          href={`/studio/${videoId}/audio`}
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "shrink-0 text-xs"
          )}
        >
          Go to Audio
        </Link>
      </div>
    );
  }

  return null;
}

export function StudioEpisodeWatchShell({
  videoId,
  children,
}: {
  videoId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const stage = stageFromPath(pathname);
  const video = getCommissionedVideo(videoId);
  const workingTitle = video?.workingTitle ?? "autoYT";

  return (
    <NarrationAudioSegmentsProvider videoId={videoId}>
      <VisStillsSegmentsProvider videoId={videoId}>
        <VisualsBatchGenerateProvider videoId={videoId} workingTitle={workingTitle}>
      <div className="mx-auto w-full max-w-7xl px-3 pb-8 pt-1.5 sm:px-5 lg:px-6">
        <div className="mb-2">
          <StudioEpisodeHeader videoId={videoId} />
          <StudioProductionNav videoId={videoId} />
        </div>

        <StudioGlobalStageHandoff videoId={videoId} />

        <StudioMediaStatusBanner />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="flex flex-col gap-3.5 lg:col-span-8">
            <EpisodePlayer videoId={videoId} stage={stage} />

            {stage === "visuals" ? (
              <section
                aria-labelledby="episode-details-heading"
                className="rounded-lg border border-white/10 bg-white/[0.02] p-3 ring-1 ring-white/[0.06] sm:p-3.5"
              >
                <div className="flex items-center gap-1.5 border-b border-white/10 pb-2">
                  <Clapperboard className="size-3.5 text-primary" aria-hidden />
                  <h2
                    id="episode-details-heading"
                    className="text-xs font-semibold text-foreground"
                  >
                    Stage 3 · Visuals
                  </h2>
                </div>
                <div className="pt-2.5">
                  <VisualsDetailsBlock videoId={videoId} />
                </div>
              </section>
            ) : null}

            <NarrationColumn
              videoId={videoId}
              showMotionClips={stage === "visuals"}
            />

            {children ? <div className="flex flex-col gap-2">{children}</div> : null}
          </div>

          <div className="lg:col-span-4">
            <div className="min-h-0 lg:sticky lg:top-14 lg:self-start">
              {stage === "script" ? (
                <ScriptStageAsideColumn videoId={videoId} />
              ) : stage === "audio" ? (
                <AudioStageAsideColumn videoId={videoId} />
              ) : (
                <VisualsQueueAside videoId={videoId} />
              )}
            </div>
          </div>
        </div>
      </div>
        </VisualsBatchGenerateProvider>
      </VisStillsSegmentsProvider>
    </NarrationAudioSegmentsProvider>
  );
}
