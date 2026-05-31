import "server-only";

import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import {
  getLocalAssetsRoot,
  sanitizeEpisodeIdForAssets,
  writeVisStillToLocalRoot,
} from "@/lib/assets/local-asset-store";
import { createServiceSupabase } from "@/lib/supabase/admin-client";
import type { ListedVisStill } from "@/lib/studio/vis-still-types";
import type { ScriptActId } from "@/lib/script-writer/types";

export type VisStillManifestSegment = {
  actId: ScriptActId;
  blockIndex: number;
  localRelativePath: string;
  mimeType: string;
  updatedAt: string;
  dbId?: string | null;
};

export type VisStillManifest = {
  videoId: string;
  workingTitle?: string | null;
  segments: VisStillManifestSegment[];
  updatedAt: string;
};

function manifestPathForEpisode(videoId: string): string | null {
  const root = getLocalAssetsRoot();
  if (!root) return null;
  const safe = sanitizeEpisodeIdForAssets(videoId);
  return path.join(root, "vis-stills", safe, "manifest.json");
}

export async function readVisStillManifest(
  videoId: string,
): Promise<VisStillManifest | null> {
  const p = manifestPathForEpisode(videoId);
  if (!p) return null;
  try {
    const raw = await readFile(p, "utf8");
    const parsed = JSON.parse(raw) as VisStillManifest;
    if (!parsed || !Array.isArray(parsed.segments)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function mergeVisStillManifestSegment(
  videoId: string,
  segment: Omit<VisStillManifestSegment, "updatedAt"> & { updatedAt?: string },
  workingTitle?: string | null,
): Promise<void> {
  const p = manifestPathForEpisode(videoId);
  if (!p) return;
  const now = new Date().toISOString();
  const prev = (await readVisStillManifest(videoId)) ?? {
    videoId: sanitizeEpisodeIdForAssets(videoId),
    segments: [],
    updatedAt: now,
  };
  const nextSeg: VisStillManifestSegment = {
    ...segment,
    updatedAt: segment.updatedAt ?? now,
  };
  const rest = prev.segments.filter(
    (s) => !(s.actId === nextSeg.actId && s.blockIndex === nextSeg.blockIndex),
  );
  rest.push(nextSeg);
  const uniqueActIds: string[] = [];
  for (const r of rest) {
    if (!uniqueActIds.includes(r.actId)) {
      uniqueActIds.push(r.actId);
    }
  }
  const order = (x: ScriptActId) => uniqueActIds.indexOf(x);
  rest.sort((a, b) => {
    const d = order(a.actId) - order(b.actId);
    if (d !== 0) return d;
    return a.blockIndex - b.blockIndex;
  });
  const out: VisStillManifest = {
    videoId: sanitizeEpisodeIdForAssets(videoId),
    workingTitle: workingTitle ?? prev.workingTitle,
    segments: rest,
    updatedAt: now,
  };
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(out, null, 2), "utf8");
}

export type PersistedVisStill = {
  id: string;
  actId: ScriptActId;
  blockIndex: number;
  localRelativePath: string;
  mimeType: string;
};

/**
 * Writes PNG bytes for one [VIS] still, updates manifest, upserts
 * `vis_still_generation_events` when Supabase service role is configured.
 */
export async function persistVisStillFromBase64(params: {
  videoId: string;
  actId: ScriptActId;
  blockIndex: number;
  base64: string;
  mimeType: string;
  workingTitle?: string | null;
}): Promise<PersistedVisStill> {
  const { videoId, actId, blockIndex, base64, mimeType, workingTitle } = params;

  if (!getLocalAssetsRoot()) {
    throw new Error(
      "UPGRADE_LIFE_LOCAL_ASSETS_ROOT is not set — cannot persist vis still.",
    );
  }

  const buffer = Buffer.from(base64.replace(/\s/g, ""), "base64");
  if (buffer.length === 0) {
    throw new Error("Empty image buffer");
  }

  const written = await writeVisStillToLocalRoot(videoId, actId, blockIndex, buffer);
  const mime = mimeType.split(";")[0].trim() || "image/png";

  let dbId: string | null = null;
  const supabase = createServiceSupabase();
  if (supabase) {
    const vid = sanitizeEpisodeIdForAssets(videoId);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("vis_still_generation_events")
      .upsert(
        {
          video_id: vid,
          act_id: actId,
          block_index: blockIndex,
          mime_type: mime,
          local_relative_path: written.relativePath,
          file_size_bytes: written.fileSizeBytes,
          sha256_hex: written.sha256Hex,
          working_title: workingTitle?.trim() || null,
          updated_at: now,
        },
        { onConflict: "video_id,act_id,block_index" },
      )
      .select("id")
      .single();

    if (error || !data) {
      console.error("[studio-db] vis_still_generation_events:", error);
    } else {
      dbId = data.id;
    }
  }

  await mergeVisStillManifestSegment(
    videoId,
    {
      actId,
      blockIndex,
      localRelativePath: written.relativePath,
      mimeType: mime,
      dbId,
    },
    workingTitle,
  );

  return {
    id: dbId ?? `${actId}-${blockIndex}`,
    actId,
    blockIndex,
    localRelativePath: written.relativePath,
    mimeType: mime,
  };
}

function isScriptActId(s: string): s is ScriptActId {
  return typeof s === "string" && s.trim().length > 0 && /^[a-z0-9_-]+$/i.test(s);
}

function sortStills<T extends { actId: ScriptActId; blockIndex: number }>(
  rows: T[],
): T[] {
  // Dynamically extract unique actIds in the order they appear to define act ordering
  const uniqueActIds: string[] = [];
  for (const r of rows) {
    if (!uniqueActIds.includes(r.actId)) {
      uniqueActIds.push(r.actId);
    }
  }

  return [...rows].sort((a, b) => {
    const d = uniqueActIds.indexOf(a.actId) - uniqueActIds.indexOf(b.actId);
    if (d !== 0) return d;
    return a.blockIndex - b.blockIndex;
  });
}

/** Load [VIS] stills (manifest + Supabase merged; DB wins per block). */
export async function listVisStillsForVideo(
  videoId: string,
): Promise<ListedVisStill[]> {
  const vid = sanitizeEpisodeIdForAssets(videoId);
  const byKey = new Map<string, ListedVisStill>();

  const man = await readVisStillManifest(videoId);
  if (man?.segments.length) {
    for (const s of sortStills(man.segments)) {
      const key = `${s.actId}:${s.blockIndex}`;
      byKey.set(key, {
        id: s.dbId ?? `${s.actId}-${s.blockIndex}`,
        actId: s.actId,
        blockIndex: s.blockIndex,
        mimeType: s.mimeType,
        localRelativePath: s.localRelativePath,
        updatedAt: s.updatedAt,
        fileUrl: `/api/studio/visuals/file?rel=${encodeURIComponent(s.localRelativePath)}`,
      });
    }
  }

  const supabase = createServiceSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("vis_still_generation_events")
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
          fileUrl: `/api/studio/visuals/file?rel=${encodeURIComponent(row.local_relative_path)}`,
        });
      }
    }
  }

  return sortStills([...byKey.values()]);
}
