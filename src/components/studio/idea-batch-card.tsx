"use client";

import type { StudioIdeaBatchListItem } from "@/lib/studio/studio-idea-batch";
import type { DeskCommissionPayload } from "@/lib/home/commissioned-videos-storage";
import type { VideoIdea } from "@/lib/content-architect/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateThumbnailImage } from "@/app/actions/thumbnail-image";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";

interface IdeaBatchCardProps {
  batch: StudioIdeaBatchListItem;
  onCommissionIdea: (payload: DeskCommissionPayload) => void;
}

export function IdeaBatchCard({ batch, onCommissionIdea }: IdeaBatchCardProps) {
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateThumbnail = async (idea: VideoIdea, generatedIdeaId: string) => {
    setLoadingThumbnails(true);
    setError(null);
    try {
      const result = await generateThumbnailImage(
        {
          visualDescription: idea.thumbnailVisualDescription,
          textOverlay: idea.thumbnailTextOverlay,
          textGlow: idea.thumbnailTextGlow,
        },
        { generatedIdeaId },
      );

      if (!result.ok) {
        setError(result.error);
        console.error("Thumbnail generation failed:", result.error);
      } else {
        console.log("Thumbnail generated successfully!", result);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "An unknown error occurred during thumbnail generation.";
      setError(message);
      console.error("Error generating thumbnail:", err);
    } finally {
      setLoadingThumbnails(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{batch.topicsPreview}</CardTitle>
        <CardDescription>{batch.topics}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {(batch.ideas ?? []).map((ideaRow) => (
            <div key={ideaRow.generatedIdeaId} className="border p-2 rounded">
              <p className="font-medium">{ideaRow.idea.title}</p>
              <p className="text-sm text-muted-foreground">{ideaRow.idea.hook}</p>
              <Badge className="mt-1" variant="secondary">{ideaRow.idea.pillar}</Badge>
              {ideaRow.thumbnailLocalRelativePath ? (
                <img
                  src={`/api/studio/thumbnails/file?path=${encodeURIComponent(ideaRow.thumbnailLocalRelativePath)}`}
                  alt="Thumbnail" className="w-full h-auto mt-2 rounded" />
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">
                  No thumbnail yet.
                  <Button
                    size="sm"
                    className="ml-2"
                    onClick={() =>
                      handleGenerateThumbnail(ideaRow.idea, ideaRow.generatedIdeaId)
                    }
                    disabled={loadingThumbnails}
                  >
                    {loadingThumbnails ? <Spinner size="sm" /> : "Generate Thumbnail"}
                  </Button>
                  {error && <p className="text-red-500 text-xs mt-1">Error: {error}</p>}
                </div>
              )}
              <Button
                className="mt-3"
                onClick={() =>
                  onCommissionIdea({
                    idea: ideaRow.idea,
                    generatedIdeaId: ideaRow.generatedIdeaId,
                    thumbnailDbEventId: ideaRow.thumbnailDbEventId,
                    thumbnailLocalRelativePath: ideaRow.thumbnailLocalRelativePath,
                  })
                }
              >
                Start in production
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Generated: {new Date(batch.savedAt).toLocaleString()}
      </CardFooter>
    </Card>
  );
}
