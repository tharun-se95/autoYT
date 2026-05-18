"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useAssemblyExport } from "@/components/studio/use-assembly-export";
import { useVisualsBatchClips } from "@/components/studio/use-visuals-batch-clips";
import { useVisualsBatchGenerate } from "@/components/studio/use-visuals-batch-generate";

type VisualsBatchGenerateContextValue = ReturnType<typeof useVisualsBatchGenerate> &
  ReturnType<typeof useVisualsBatchClips> &
  ReturnType<typeof useAssemblyExport>;

const VisualsBatchGenerateContext =
  createContext<VisualsBatchGenerateContextValue | null>(null);

export function VisualsBatchGenerateProvider({
  videoId,
  workingTitle,
  children,
}: {
  videoId: string;
  workingTitle: string;
  children: ReactNode;
}) {
  const generate = useVisualsBatchGenerate(videoId);
  const clips = useVisualsBatchClips(videoId);
  const assemblyExport = useAssemblyExport(videoId, workingTitle);
  const value = { ...generate, ...clips, ...assemblyExport };
  return (
    <VisualsBatchGenerateContext.Provider value={value}>
      {children}
    </VisualsBatchGenerateContext.Provider>
  );
}

export function useVisualsBatchGenerateContext(): VisualsBatchGenerateContextValue {
  const ctx = useContext(VisualsBatchGenerateContext);
  if (!ctx) {
    throw new Error(
      "useVisualsBatchGenerateContext must be used within VisualsBatchGenerateProvider",
    );
  }
  return ctx;
}
