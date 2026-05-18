"use client";

import { useCallback, useEffect, useId, useMemo, useState, useTransition } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";

import { generateVideoIdeas } from "@/app/actions/content-architect";
import {
  backfillMissingIdeaThumbnails,
  listStudioIdeaBatches,
} from "@/app/actions/studio-ideas";
import { GlassPanel } from "@/components/landing/glass-panel";
import { IdeaResultCard } from "@/components/studio/idea-result-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DeskCommissionPayload } from "@/lib/home/commissioned-videos-storage";
import type { StudioIdeaBatchListItem } from "@/lib/studio/studio-idea-batch";
import { cn } from "@/lib/utils";

const COUNT_OPTIONS = [3, 4, 5, 6, 8, 10, 12] as const;

function formatBatchTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ContentArchitectForm({
  onCommissionIdea,
  channelLayout = false,
  batchSort = "newest",
  ideaSearchQuery = "",
}: {
  onCommissionIdea?: (payload: DeskCommissionPayload) => void;
  /** Full-width Channel desk (YouTube-style) with grid idea tiles and filters. */
  channelLayout?: boolean;
  batchSort?: "newest" | "oldest";
  ideaSearchQuery?: string;
}) {
  const formId = useId();
  const [topics, setTopics] = useState("");
  const [ideaCount, setIdeaCount] = useState<number>(6);
  const [batches, setBatches] = useState<StudioIdeaBatchListItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [listPending, startListTransition] = useTransition();

  const loadBatches = useCallback((options?: { backfillMissing?: boolean }) => {
    startListTransition(async () => {
      if (options?.backfillMissing) {
        await backfillMissingIdeaThumbnails(12);
      }
      const rows = await listStudioIdeaBatches();
      setBatches(rows);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await generateVideoIdeas(topics, ideaCount);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      loadBatches();
    });
  }

  const displayBatches = useMemo(() => {
    if (!channelLayout) return batches;
    const rows = batches.map((b) => ({ ...b, ideas: [...b.ideas] }));
    if (batchSort === "oldest") {
      rows.sort(
        (a, b) =>
          new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
      );
    } else {
      rows.sort(
        (a, b) =>
          new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      );
    }
    const q = ideaSearchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows
      .map((batch) => {
        const batchMatch = batch.topicsPreview.toLowerCase().includes(q);
        if (batchMatch) return batch;
        const ideas = batch.ideas.filter(
          (row) =>
            row.idea.title.toLowerCase().includes(q) ||
            row.idea.hook.toLowerCase().includes(q)
        );
        return { ...batch, ideas };
      })
      .filter((batch) => batch.ideas.length > 0);
  }, [batches, batchSort, channelLayout, ideaSearchQuery]);

  const ideaCardVariant = channelLayout ? "grid" : "list";

  const hasBatches = hydrated && batches.length > 0;

  const composer = (
    <GlassPanel
      className={cn(
        "p-4 sm:p-5",
        channelLayout &&
          "border-white/10 bg-[#0f0f0f]/50 shadow-sm ring-1 ring-white/5"
      )}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <div
          className={cn(
            "flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2",
            channelLayout && "lg:gap-3"
          )}
        >
          <Textarea
            id={`${formId}-topics`}
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            placeholder="Topics, themes, seeds…"
            aria-label="Topics and seeds for new video ideas"
            rows={2}
            className={cn(
              "min-h-10 flex-1 resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none",
              "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
              "dark:bg-input/30",
              "max-h-40 sm:max-h-none",
              channelLayout && "lg:min-h-11"
            )}
            disabled={pending}
            required
            aria-invalid={!!error && batches.length === 0}
          />
          <div className="flex shrink-0 items-center gap-2 sm:justify-end">
            <label htmlFor={`${formId}-count`} className="sr-only">
              Number of ideas to generate
            </label>
            <select
              id={`${formId}-count`}
              value={ideaCount}
              onChange={(e) => setIdeaCount(Number(e.target.value))}
              disabled={pending}
              aria-label="Number of ideas"
              className={cn(
                "h-10 min-w-[6.5rem] rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
                "dark:bg-input/30"
              )}
            >
              {COUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <Button
              type="submit"
              size="icon"
              disabled={pending}
              className="size-10 shrink-0"
              aria-label={
                pending ? "Generating ideas and thumbnails" : "Generate ideas"
              }
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-4" aria-hidden />
              )}
            </Button>
            {channelLayout ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={listPending}
                className="size-10 shrink-0"
                onClick={() => loadBatches({ backfillMissing: true })}
                aria-label={
                  listPending ? "Refreshing idea list" : "Refresh idea list"
                }
                title={
                  listPending
                    ? "Refreshing…"
                    : "Refresh list and backfill missing thumbnails"
                }
              >
                {listPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="size-4" aria-hidden />
                )}
              </Button>
            ) : null}
          </div>
        </div>
        {error ? (
          <p
            role="alert"
            className="text-sm text-destructive leading-relaxed"
          >
            {error}
          </p>
        ) : null}
      </form>
    </GlassPanel>
  );

  const batchSection = hasBatches ? (
    <div className="flex flex-col gap-4">
      {!channelLayout ? (
        <>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 pr-2">
              <h2 className="font-heading text-base font-semibold text-foreground">
                Saved batches
              </h2>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                Saved runs and ideas from Supabase. Thumbnails reload from disk when
                UPGRADE_LIFE_LOCAL_ASSETS_ROOT and service role are set (see
                .env.example).
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              disabled={listPending}
              onClick={() => loadBatches()}
              aria-label={
                listPending ? "Refreshing batch list" : "Refresh batch list"
              }
              title={listPending ? "Refreshing…" : "Refresh"}
            >
              {listPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-4" aria-hidden />
              )}
            </Button>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            List view · <strong className="text-foreground">Brief</strong> for full
            Imagen text · <strong className="text-foreground">Thumbnail</strong> to
            render.
          </p>
        </>
      ) : null}
      {channelLayout && displayBatches.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-muted-foreground">
          No ideas match your search. Try different keywords or clear the search field
          above.
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {displayBatches.map((batch) => (
            <section
              key={batch.runId}
              aria-labelledby={`${formId}-batch-${batch.runId}`}
              className="flex flex-col gap-3"
            >
              <div className="border-b border-white/10 pb-2">
                <h3
                  id={`${formId}-batch-${batch.runId}`}
                  className="text-sm font-medium text-foreground"
                >
                  {formatBatchTime(batch.savedAt)} · {batch.ideas.length} ideas
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-snug">
                  {batch.topicsPreview}
                </p>
              </div>
              <ul
                className={cn(
                  channelLayout
                    ? "grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    : "overflow-hidden rounded-lg border border-white/10 bg-white/[0.02] divide-y divide-white/10"
                )}
              >
                {batch.ideas.map((row) => (
                  <li
                    key={row.generatedIdeaId}
                    className={cn(channelLayout && "min-w-0")}
                  >
                    <IdeaResultCard
                      idea={row.idea}
                      generatedIdeaId={row.generatedIdeaId}
                      variant={ideaCardVariant}
                      persistedThumbnail={{
                        thumbnailDbEventId: row.thumbnailDbEventId,
                        thumbnailLocalRelativePath:
                          row.thumbnailLocalRelativePath,
                      }}
                      onThumbnailSaved={() => {
                        loadBatches();
                      }}
                      onCommission={
                        onCommissionIdea
                          ? () =>
                              onCommissionIdea({
                                idea: row.idea,
                                generatedIdeaId: row.generatedIdeaId,
                                thumbnailDbEventId: row.thumbnailDbEventId,
                                thumbnailLocalRelativePath:
                                  row.thumbnailLocalRelativePath,
                              })
                          : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className={cn("flex flex-col", channelLayout ? "gap-6" : "gap-5")}>
      {channelLayout ? (
        <>
          {composer}
          {batchSection}
        </>
      ) : (
        <>
          {composer}
          {batchSection}
          {hydrated && batches.length === 0 ? (
            <p className="text-[11px] text-muted-foreground leading-snug">
              No saved batches yet. Generate ideas above (Supabase must be configured).
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
