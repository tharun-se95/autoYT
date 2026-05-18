import "server-only";

import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import {
  getLocalAssetsRoot,
  sanitizeEpisodeIdForAssets,
  writeNarrationBlockToLocalRoot,
} from "@/lib/assets/local-asset-store";
import { createServiceSupabase } from "@/lib/supabase/admin-client";
import type { ListedNarrationSegment } from "@/lib/studio/narration-segment-types";
import type { ScriptActId } from "@/lib/script-writer/types";

export type NarrationManifestSegment = {
  actId: ScriptActId;
  blockIndex: number;
  localRelativePath: string;
  mimeType: string;
  updatedAt: string;
  dbId?: string | null;
};

export type NarrationManifest = {
  videoId: string;
  workingTitle?: string | null;
  segments: NarrationManifestSegment[];
  updatedAt: string;
};

function manifestPathForEpisode(videoId: string): string | null {
  const root = getLocalAssetsRoot();
  if (!root) return null;
  const safe = sanitizeEpisodeIdForAssets(videoId);
  return path.join(root, "narration-audio", safe, "manifest.json");
}

export async function readNarrationManifest(
  videoId: string,
): Promise<NarrationManifest | null> {
  const p = manifestPathForEpisode(videoId);
  if (!p) return null;
  try {
    const raw = await readFile(p, "utf8");
    const parsed = JSON.parse(raw) as NarrationManifest;
    if (!parsed || !Array.isArray(parsed.segments)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function mergeNarrationManifestSegment(
  videoId: string,
  segment: Omit<NarrationManifestSegment, "updatedAt"> & { updatedAt?: string },
  workingTitle?: string | null,
): Promise<void> {
  const p = manifestPathForEpisode(videoId);
  if (!p) return;
  const now = new Date().toISOString();
  const prev = (await readNarrationManifest(videoId)) ?? {
    videoId: sanitizeEpisodeIdForAssets(videoId),
    segments: [],
    updatedAt: now,
  };
  const nextSeg: NarrationManifestSegment = {
    ...segment,
    updatedAt: segment.updatedAt ?? now,
  };
  const rest = prev.segments.filter(
    (s) => !(s.actId === nextSeg.actId && s.blockIndex === nextSeg.blockIndex),
  );
  rest.push(nextSeg);
  rest.sort((a, b) => {
    const order = (x: ScriptActId) =>
      ["mess", "deep_dive", "mirror", "way_forward"].indexOf(x);
    const d = order(a.actId) - order(b.actId);
    if (d !== 0) return d;
    return a.blockIndex - b.blockIndex;
  });
  const out: NarrationManifest = {
    videoId: sanitizeEpisodeIdForAssets(videoId),
    workingTitle: workingTitle ?? prev.workingTitle,
    segments: rest,
    updatedAt: now,
  };
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(out, null, 2), "utf8");
}

export type PersistedNarrationSegment = {
  id: string;
  actId: ScriptActId;
  blockIndex: number;
  localRelativePath: string;
  mimeType: string;
};

function mimeToExtension(mimeType: string): ".wav" | ".mp3" {
  const m = mimeType.split(";")[0].trim().toLowerCase();
  if (m === "audio/mpeg" || m === "audio/mp3") return ".mp3";
  return ".wav";
}

/**
 * Writes one block of TTS to disk, updates on-disk manifest, and upserts
 * `narration_audio_segments` when Supabase service role is configured.
 */
export async function persistNarrationAudioBlock(params: {
  videoId: string;
  actId: ScriptActId;
  blockIndex: number;
  base64: string;
  mimeType: string;
  workingTitle?: string | null;
}): Promise<PersistedNarrationSegment> {
  const {
    videoId,
    actId,
    blockIndex,
    base64,
    mimeType,
    workingTitle,
  } = params;

  if (!getLocalAssetsRoot()) {
    throw new Error(
      "UPGRADE_LIFE_LOCAL_ASSETS_ROOT is not set — cannot persist narration audio.",
    );
  }

  const buffer = Buffer.from(base64.replace(/\s/g, ""), "base64");
  if (buffer.length === 0) {
    throw new Error("Empty audio buffer");
  }

  const ext = mimeToExtension(mimeType);
  const written = await writeNarrationBlockToLocalRoot(
    videoId,
    actId,
    blockIndex,
    buffer,
    ext,
  );

  let dbId: string | null = null;
  const supabase = createServiceSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("narration_audio_segments")
      .upsert(
        {
          video_id: sanitizeEpisodeIdForAssets(videoId),
          act_id: actId,
          block_index: blockIndex,
          mime_type: mimeType.split(";")[0].trim() || "audio/wav",
          local_relative_path: written.relativePath,
          file_size_bytes: written.fileSizeBytes,
          sha256_hex: written.sha256Hex,
          working_title: workingTitle?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "video_id,act_id,block_index" },
      )
      .select("id")
      .single();

    if (error || !data) {
      console.error("[studio-db] narration_audio_segments:", error);
    } else {
      dbId = data.id;
    }
  }

  await mergeNarrationManifestSegment(
    videoId,
    {
      actId,
      blockIndex,
      localRelativePath: written.relativePath,
      mimeType: mimeType.split(";")[0].trim() || "audio/wav",
      dbId,
    },
    workingTitle,
  );

  return {
    id: dbId ?? `${actId}-${blockIndex}`,
    actId,
    blockIndex,
    localRelativePath: written.relativePath,
    mimeType: mimeType.split(";")[0].trim() || "audio/wav",
  };
}

const ACT_ORDER: ScriptActId[] = [
  "mess",
  "deep_dive",
  "mirror",
  "way_forward",
];

function actOrderIndex(x: ScriptActId): number {
  return ACT_ORDER.indexOf(x);
}

function sortSegments<T extends { actId: ScriptActId; blockIndex: number }>(
  segs: T[],
): T[] {
  return [...segs].sort((a, b) => {
    const d = actOrderIndex(a.actId) - actOrderIndex(b.actId);
    if (d !== 0) return d;
    return a.blockIndex - b.blockIndex;
  });
}

function isScriptActId(s: string): s is ScriptActId {
  return (ACT_ORDER as readonly string[]).includes(s);
}

/** Load saved narration segments (manifest + Supabase merged; DB wins per block). */
export async function listNarrationSegmentsForVideo(
  videoId: string,
): Promise<ListedNarrationSegment[]> {
  const vid = sanitizeEpisodeIdForAssets(videoId);
  const byKey = new Map<string, ListedNarrationSegment>();

  const man = await readNarrationManifest(videoId);
  if (man?.segments.length) {
    for (const s of sortSegments(man.segments)) {
      const key = `${s.actId}:${s.blockIndex}`;
      byKey.set(key, {
        id: s.dbId ?? `${s.actId}-${s.blockIndex}`,
        actId: s.actId,
        blockIndex: s.blockIndex,
        mimeType: s.mimeType,
        localRelativePath: s.localRelativePath,
        updatedAt: s.updatedAt,
        fileUrl: `/api/studio/audio/file?rel=${encodeURIComponent(s.localRelativePath)}`,
      });
    }
  }

  const supabase = createServiceSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("narration_audio_segments")
      .select(
        "id, act_id, block_index, mime_type, local_relative_path, updated_at",
      )
      .eq("video_id", vid);
    if (!error && data?.length) {
      for (const row of data) {
        if (!isScriptActId(row.act_id)) continue;
        const key = `${row.act_id}:${row.block_index}`;
        byKey.set(key, {
          id: row.id,
          actId: row.act_id as ScriptActId,
          blockIndex: row.block_index,
          mimeType: row.mime_type,
          localRelativePath: row.local_relative_path,
          updatedAt: row.updated_at,
          fileUrl: `/api/studio/audio/file?rel=${encodeURIComponent(row.local_relative_path)}`,
        });
      }
    }
  }

  return sortSegments([...byKey.values()]);
}
