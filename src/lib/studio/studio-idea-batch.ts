import type { VideoIdea } from "@/lib/content-architect/types";

import type { PersistedThumbnailMeta } from "./persisted-thumbnail-meta";

export type StudioIdeaListRow = {
  generatedIdeaId: string;
  idea: VideoIdea;
} & PersistedThumbnailMeta;

export type StudioIdeaBatchListItem = {
  runId: string;
  savedAt: string;
  topicsPreview: string;
  topics: string;
  ideaCount: number;
  ideas: StudioIdeaListRow[];
};
