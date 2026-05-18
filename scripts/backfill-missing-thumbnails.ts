#!/usr/bin/env npx tsx
/**
 * Backfill thumbnails for ideas missing `thumbnail_generation_events` rows.
 * Usage: npx tsx --env-file=.env.local scripts/backfill-missing-thumbnails.ts [--limit=6]
 */
import { createClient } from "@supabase/supabase-js";

import { generateThumbnailImageCore } from "../src/lib/thumbnail/generate-thumbnail-image-core";

const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 12;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or service role key.");
    process.exit(1);
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: ideas, error: ideasErr } = await sb
  .from("generated_ideas")
  .select(
    "id, title, thumbnail_visual_description, thumbnail_text_overlay, thumbnail_text_glow, created_at"
  )
  .order("created_at", { ascending: false })
  .limit(200);

if (ideasErr || !ideas?.length) {
  console.error("Could not load ideas:", ideasErr?.message ?? "none");
  process.exit(1);
}

const { data: events, error: evErr } = await sb
  .from("thumbnail_generation_events")
  .select("idea_id")
  .not("idea_id", "is", null);

if (evErr) {
  console.error("Could not load events:", evErr.message);
  process.exit(1);
}

const hasThumb = new Set(
  (events ?? []).map((e) => e.idea_id).filter((id): id is string => !!id)
);
const missing = ideas.filter((i) => !hasThumb.has(i.id)).slice(0, limit);

console.log(
  `Ideas: ${ideas.length}, with thumbnails: ${hasThumb.size}, backfilling: ${missing.length}`
);

let ok = 0;
let fail = 0;

for (const row of missing) {
  const glow = row.thumbnail_text_glow;
  if (glow !== "cyan" && glow !== "amber") {
    fail += 1;
    console.log(`→ skip invalid glow: ${row.id}`);
    continue;
  }
  process.stdout.write(`→ ${row.title.slice(0, 48)}… `);
  const out = await generateThumbnailImageCore(
    {
      visualDescription: row.thumbnail_visual_description,
      textOverlay: row.thumbnail_text_overlay,
      textGlow: glow,
    },
    { generatedIdeaId: row.id }
  );
  if (out.ok && (out.dbEventId || out.localRelativePath)) {
    ok += 1;
    console.log(`ok (${out.dbEventId ?? out.localRelativePath})`);
  } else {
    fail += 1;
    console.log(`fail: ${out.ok ? "no persist refs" : out.error}`);
  }
}

  console.log(`Done. ok=${ok} fail=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
