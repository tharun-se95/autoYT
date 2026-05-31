"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Film, Lightbulb, Search, Tv2 } from "lucide-react";

import {
  getChannelDetails,
  getChannelsList,
  type ChannelDeskDetail,
  type ChannelSimple,
} from "@/app/actions/channel-styles";
import { listStudioIdeaBatches } from "@/app/actions/studio-ideas";
import { ContentArchitectForm } from "@/components/studio/content-architect-form";
import { ProductionQueueCard } from "@/components/production/production-queue-card";
import { SectionContainer } from "@/components/landing/section-container";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  addCommissionedVideo,
  readCommissionedVideos,
  resumeHrefForVideo,
  subscribeCommissionedVideos,
  isAudioComplete,
  isScriptComplete,
  type CommissionedVideo,
  type DeskCommissionPayload,
} from "@/lib/home/commissioned-videos-storage";
import {
  CHANNEL_DESK_PATH,
  CHANNEL_DESK_UPCOMING_HREF,
  CHANNEL_DESK_VIDEOS_HREF,
} from "@/lib/nav/channel-desk";
import type { StudioIdeaBatchListItem } from "@/lib/studio/studio-idea-batch";

// NEW: Component for rendering a single idea batch
import { IdeaBatchCard } from "@/components/studio/idea-batch-card";

type HomeTab = "videos" | "upcoming";
type SortKey = "latest" | "popular" | "oldest";
type BatchSortKey = "newest" | "oldest";

function tabFromParam(raw: string | null): HomeTab {
  if (raw === "upcoming") return "upcoming";
  return "videos";
}

function sortFromParam(raw: string | null): SortKey {
  if (raw === "popular" || raw === "oldest") return raw;
  return "latest";
}

function batchSortFromParam(raw: string | null): BatchSortKey {
  if (raw === "oldest") return "oldest";
  return "newest";
}

function progressScore(v: CommissionedVideo): number {
  return (
    (isScriptComplete(v) ? 100 : 0) +
    (isAudioComplete(v) ? 100 : 0) +
    new Date(v.updatedAt).getTime() / 1e11
  );
}

function channelInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function paletteGradient(colors: string[]): string {
  if (colors.length === 0) {
    return "linear-gradient(135deg, hsl(var(--primary)/0.9), hsl(var(--primary)))";
  }
  if (colors.length === 1) {
    return `linear-gradient(135deg, ${colors[0]}, ${colors[0]})`;
  }
  return `linear-gradient(135deg, ${colors[0]}, ${colors[1] ?? colors[0]})`;
}

const FALLBACK_CHANNEL_DESCRIPTION =
  "Video production desk — start an episode to unlock Script, Audio, then Visuals. Brainstorm ideas on Upcoming before you lock a commission.";

export function ChannelHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = tabFromParam(searchParams.get("tab"));
  const sort = sortFromParam(searchParams.get("sort"));
  const batchSort = batchSortFromParam(searchParams.get("batches"));
  const [videos, setVideos] = useState<CommissionedVideo[]>([]);
  const [ideaBatches, setIdeaBatches] = useState<StudioIdeaBatchListItem[]>([]); // NEW: State for idea batches
  const [channels, setChannels] = useState<ChannelSimple[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChannelDeskDetail | null>(
    null
  );
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [videoSearch, setVideoSearch] = useState("");
  const [upcomingSearch, setUpcomingSearch] = useState("");

  const channelParam = searchParams.get("channel");

  const activeChannelId = useMemo(() => {
    if (channelParam && channels.some((c) => c.id === channelParam)) {
      return channelParam;
    }
    return channels[0]?.id ?? null;
  }, [channelParam, channels]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setChannelsLoading(true);
      const list = await getChannelsList();
      if (cancelled) return;
      setChannels(list);
      setChannelsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeChannelId) {
      setActiveChannel(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const detail = await getChannelDetails(activeChannelId);
      if (cancelled) return;
      setActiveChannel(detail);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeChannelId]);

  useEffect(() => {
    setDescExpanded(false);
  }, [activeChannelId]);

  const setChannelParam = useCallback(
    (nextChannelId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("channel", nextChannelId);
      router.replace(`${CHANNEL_DESK_PATH}?${params.toString()}`, {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  // NEW: Function to refresh idea batches
  const refreshIdeaBatches = useCallback(async () => {
    const batches = (await listStudioIdeaBatches()) ?? [];
    setIdeaBatches(Array.isArray(batches) ? batches : []);
  }, []);

  useEffect(() => {
    return subscribeCommissionedVideos((rows) => {
      setVideos(rows);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated || tab !== "videos") return;
    const id = requestAnimationFrame(() => {
      setVideos(readCommissionedVideos());
    });
    return () => cancelAnimationFrame(id);
  }, [tab, hydrated]);

  // NEW: Effect to load idea batches when Upcoming tab is active
  useEffect(() => {
    if (tab === "upcoming") {
      void refreshIdeaBatches();
    }
  }, [tab, refreshIdeaBatches]);

  const setTabAndUrl = useCallback(
    (next: HomeTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      if (next === "videos") {
        params.delete("batches");
      } else {
        params.delete("sort");
      }
      router.replace(`${CHANNEL_DESK_PATH}?${params.toString()}`, {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  const setBatchSortParam = useCallback(
    (next: BatchSortKey) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "upcoming");
      params.delete("sort");
      if (next === "newest") params.delete("batches");
      else params.set("batches", "oldest");
      router.replace(`${CHANNEL_DESK_PATH}?${params.toString()}`, {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  const setSortParam = useCallback(
    (next: SortKey) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "videos");
      params.delete("batches");
      if (next === "latest") params.delete("sort");
      else params.set("sort", next);
      router.replace(`${CHANNEL_DESK_PATH}?${params.toString()}`, {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  // Combined refresh for all data on the channel desk
  const refreshAllData = useCallback(() => {
    setVideos(readCommissionedVideos()); // Refreshes videos
    void refreshIdeaBatches(); // Refreshes idea batches
  }, [refreshIdeaBatches]); // Depend on refreshIdeaBatches to avoid stale closure

  const onCommissionIdea = useCallback(
    (payload: DeskCommissionPayload) => {
      const row = addCommissionedVideo(payload.idea, {
        sourceGeneratedIdeaId: payload.generatedIdeaId,
        thumbnailDbEventId: payload.thumbnailDbEventId ?? null,
        thumbnailLocalRelativePath: payload.thumbnailLocalRelativePath ?? null,
        thumbnailInlineDataUrl: null,
      });
      refreshAllData(); // Use the new combined refresh
      router.push(resumeHrefForVideo(row));
    },
    [router, refreshAllData]
  );

  const sortedVideos = useMemo(() => {
    const copy = [...videos];
    if (sort === "latest") {
      copy.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } else if (sort === "oldest") {
      copy.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else {
      copy.sort((a, b) => progressScore(b) - progressScore(a));
    }
    return copy;
  }, [videos, sort]);

  const filteredVideos = useMemo(() => {
    const q = videoSearch.trim().toLowerCase();
    if (!q) return sortedVideos;
    return sortedVideos.filter(
      (v) =>
        v.workingTitle.toLowerCase().includes(q) ||
        v.idea.hook.toLowerCase().includes(q) ||
        v.idea.title.toLowerCase().includes(q)
    );
  }, [sortedVideos, videoSearch]);

  const videoCount = videos.length;
  const channelTitle = activeChannel?.name ?? "Creator Channel";
  const channelHandle = activeChannel?.handle
    ? `@${activeChannel.handle.replace(/^@/, "")}`
    : activeChannel
      ? `@${activeChannel.id}`
      : "@CreatorStudio";
  const channelDescription =
    activeChannel?.generation_brief?.trim() || FALLBACK_CHANNEL_DESCRIPTION;
  const avatarInitials = channelInitials(channelTitle);
  const avatarGradient = paletteGradient(activeChannel?.palette_hex ?? []);
  const bannerStyle = activeChannel?.banner_image_url
    ? {
        backgroundImage: `url(${activeChannel.banner_image_url})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const,
      }
    : undefined;

  const sortChips: { id: SortKey; label: string }[] = [
    { id: "latest", label: "Latest" },
    { id: "popular", label: "Most progress" },
    { id: "oldest", label: "Oldest" },
  ];

  const batchSortChips: { id: BatchSortKey; label: string }[] = [
    { id: "newest", label: "Newest" },
    { id: "oldest", label: "Oldest" },
  ];

  // NEW: Filtered idea batches for display
  const filteredIdeaBatches = useMemo(() => {
    const q = upcomingSearch.trim().toLowerCase();
    if (!q) return ideaBatches;
    return ideaBatches.filter(
      (batch) =>
        batch.topics.toLowerCase().includes(q) ||
        batch.topicsPreview.toLowerCase().includes(q) ||
        (batch.ideas ?? []).some(
          (ideaRow) =>
            ideaRow.idea.title.toLowerCase().includes(q) ||
            ideaRow.idea.hook.toLowerCase().includes(q)
        )
    );
  }, [ideaBatches, upcomingSearch]);

  return (
    <section id="channel-hub" className="scroll-mt-20 pb-10 sm:pb-14">
      <SectionContainer className="max-w-7xl">
        {/* Channel selector */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active channel
            </p>
            {channelsLoading ? (
              <div className="h-10 w-full max-w-xs animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
            ) : channels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No channels configured in Supabase.
              </p>
            ) : (
              <Select
                value={activeChannelId ?? undefined}
                onValueChange={(value: string | null) => {
                  if (value) setChannelParam(value);
                }}
              >
                <SelectTrigger
                  aria-label="Select active channel"
                  className="h-10 w-full max-w-xs border-white/10 bg-white/[0.04] shadow-sm ring-1 ring-white/5 sm:max-w-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Tv2 className="size-4 shrink-0 text-primary" aria-hidden />
                    <SelectValue placeholder="Select channel" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Banner */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-sm sm:rounded-2xl">
          <div
            className={cn(
              "relative flex h-[100px] items-center justify-center sm:h-[140px] md:h-[160px]",
              !bannerStyle &&
                "bg-gradient-to-br from-zinc-800 via-zinc-900 to-black"
            )}
            style={bannerStyle}
          >
            {!bannerStyle ? (
              <p className="font-heading text-2xl font-semibold tracking-tight text-white/95 sm:text-3xl md:text-4xl">
                {channelTitle}
              </p>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
            )}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
          </div>
        </div>

        {/* Channel row (avatar overlaps banner) */}
        <div className="relative z-10 -mt-10 px-1 sm:-mt-12 sm:px-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
              <div
                className="size-[72px] shrink-0 overflow-hidden rounded-full border-4 border-background shadow-md ring-1 ring-white/10 sm:size-[88px]"
                style={{ background: avatarGradient }}
                aria-hidden
              >
                <div className="flex size-full items-center justify-center font-heading text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {avatarInitials}
                </div>
              </div>
              <div className="min-w-0 pb-0.5">
                <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {channelTitle}
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <span className="text-foreground/90">{channelHandle}</span>
                  <span className="mx-1.5 text-white/25">·</span>
                  <span>
                    {videoCount} {videoCount === 1 ? "video" : "videos"}
                  </span>
                  {activeChannel ? (
                    <>
                      <span className="mx-1.5 text-white/25">·</span>
                      <span>{activeChannel.id}</span>
                    </>
                  ) : null}
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-snug text-muted-foreground">
                  {descExpanded ? (
                    channelDescription
                  ) : (
                    <>
                      {channelDescription.slice(0, 120)}
                      {channelDescription.length > 120 ? "… " : null}
                      {channelDescription.length > 120 ? (
                        <button
                          type="button"
                          className="font-medium text-foreground underline-offset-2 hover:underline"
                          onClick={() => setDescExpanded(true)}
                        >
                          more
                        </button>
                      ) : null}
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Link
                href={CHANNEL_DESK_UPCOMING_HREF}
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "h-9 rounded-full px-4"
                )}
              >
                <Lightbulb className="size-4" aria-hidden />
                Upcoming
              </Link>
              <Link
                href="/studio"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-9 rounded-full border-white/15 bg-white/[0.04] px-4"
                )}
              >
                Studio
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs + search (YouTube-style) */}
        <div className="mt-6 flex flex-col gap-3 border-b border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <nav
            className="flex min-w-0 gap-0"
            role="tablist"
            aria-label="Channel desk sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "videos"}
              id="hub-tab-videos"
              onClick={() => setTabAndUrl("videos")}
              className={cn(
                "relative flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4",
                tab === "videos"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Film className="size-4 opacity-80" aria-hidden />
              Videos
              {tab === "videos" ? (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-foreground sm:left-3 sm:right-3" />
              ) : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "upcoming"}
              id="hub-tab-upcoming"
              onClick={() => setTabAndUrl("upcoming")}
              className={cn(
                "relative flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4",
                tab === "upcoming"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Lightbulb className="size-4 opacity-80" aria-hidden />
              Upcoming
              {tab === "upcoming" ? (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-foreground sm:left-3 sm:right-3" />
              ) : null}
            </button>
          </nav>

          {tab === "videos" ? (
            <div className="relative flex items-center pb-2 sm:pb-0">
              <Search
                className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={videoSearch}
                onChange={(e) => setVideoSearch(e.target.value)}
                placeholder="Search videos"
                className="h-9 w-full min-w-0 rounded-full border border-white/10 bg-white/[0.04] py-1 pr-3 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 sm:w-56 md:w-64"
                aria-label="Search videos in production"
              />
            </div>
          ) : (
            <div className="relative flex items-center pb-2 sm:pb-0">
              <Search
                className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={upcomingSearch}
                onChange={(e) => setUpcomingSearch(e.target.value)}
                placeholder="Search ideas"
                className="h-9 w-full min-w-0 rounded-full border border-white/10 bg-white/[0.04] py-1 pr-3 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 sm:w-56 md:w-64"
                aria-label="Search ideas and topics"
              />
            </div>
          )}
        </div>

        {/* Sort chips */}
        {tab === "videos" ? (
          <div
            className="mt-4 flex flex-wrap gap-2"
            role="group"
            aria-label="Sort videos"
          >
            {sortChips.map(({ id, label }) => {
              const active = sort === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSortParam(id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-transparent bg-foreground text-background"
                      : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-white/20 hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : (
          <div
            className="mt-4 flex flex-wrap gap-2"
            role="group"
            aria-label="Sort idea batches"
          >
            {batchSortChips.map(({ id, label }) => {
              const active = batchSort === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setBatchSortParam(id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-transparent bg-foreground text-background"
                      : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-white/20 hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="mt-6">
          {tab === "videos" ? (
            <div
              role="region"
              aria-labelledby="hub-tab-videos"
              className="min-h-[12rem]"
            >
              {!hydrated ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-muted-foreground">
                  Loading…
                </div>
              ) : videos.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Nothing in production yet. Use{" "}
                    <button
                      type="button"
                      onClick={() => setTabAndUrl("upcoming")}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Upcoming
                    </button>{" "}
                    to brainstorm, then{" "}
                    <strong className="text-foreground">
                      Start in production
                    </strong>{" "}
                    on an idea to add it here.
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    <Link
                      href={CHANNEL_DESK_VIDEOS_HREF}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Videos tab
                    </Link>{" "}
                    only lists commissions from this browser until you close the
                    tab.
                  </p>
                </div>
              ) : filteredVideos.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-muted-foreground">
                  No videos match “{videoSearch.trim()}”.{" "}
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    onClick={() => setVideoSearch("")}
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <ul className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredVideos.map((v) => (
                    <ProductionQueueCard
                      key={v.id}
                      video={v}
                      variant="grid"
                      onRemoved={refreshAllData}
                    />
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div role="region" aria-labelledby="hub-tab-upcoming">
              <ContentArchitectForm
                channelLayout
                channelId={activeChannelId}
                batchSort={batchSort}
                ideaSearchQuery={upcomingSearch}
                onCommissionIdea={onCommissionIdea}
                // Removed onIdeasGenerated prop
              />
              {filteredIdeaBatches.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 mt-6">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    No ideas yet. Enter topics above and click "Generate ideas".
                  </p>
                </div>
              ) : (
                <ul className="grid grid-cols-1 gap-x-4 gap-y-8 mt-6">
                  {filteredIdeaBatches.map((batch) => (
                    <IdeaBatchCard
                      key={batch.runId}
                      batch={batch}
                      onCommissionIdea={onCommissionIdea}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </SectionContainer>
    </section>
  );
}
