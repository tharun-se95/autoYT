# Prompt layers (Upgrade Life — v5)

Each layer has **one job**. Do not duplicate long rules across layers—update **one** file, then rely on pointers below.

| Layer | File(s) | Responsibility |
|-------|-----------|------------------|
| **A — Content Architect system** | `src/prompts/content-architect/` | Role, brand, persona, psychology sub-themes, visual language references, **and** how each JSON field should read. Assembled by `build-system-instruction.ts`. |
| **B — Response schema** | `src/app/actions/content-architect.ts` (`IDEA_SCHEMA`) | **Technical** constraints only (length hints, enums, "see system §…"). **Not** a second copy of art direction. |
| **C — User message** | `src/app/actions/content-architect.ts` (dynamic `userText`) | Producer **topics** + **count** + reminder to follow the system instruction only. |
| **D — Imagen (pixels only)** | `src/prompts/thumbnail/build-imagen-prompt.ts` | **Visualist** scene assembly: opening still line + `visualDescription` + overlay. Pulls `channel-visual-style`, `channel-palette`, `host-model-sheet`—no title/hook rules. |
| **E — Brand DNA** | `Upgrade_Life_DNA_v5.txt` | Brand source of truth for humans; AI strings are derived here but live in code for assembly. |
| **F — Lead Scriptwriter system** | `src/prompts/script-writer/build-system-instruction.ts` | Long-form four-act script + phrase-to-frame rhythm + pause markers for TTS. **No** visual style or palette injections (rendering is Layer D's job). User message in `script-writer.ts` (brief only). |
| **G — Script JSON schema** | `src/app/actions/script-writer.ts` | Structure only (acts, blocks, bridges); semantics in layer F. |
| **H — Vocal DNA (TTS)** | `src/prompts/vocal-dna.ts` + `src/prompts/narration-tts-act-notes.ts` | Global performance instructions + **per-act** director addenda for chunked Gemini TTS (`generate-narration-tts.ts`). Honors `...` and `—` pause markers from scripts. |

## Channel thesis (v5)

Every video argues from: **"Your life isn't complicated — you are."** This is injected into Layers A and F via `CHANNEL_THESIS` from `src/lib/channel-dna.ts`.

## Psychology sub-themes (v5, replaces four broad pillars)

All five live under one roof: **psychology and mindset**.
- `overthinking` — Decision paralysis, rumination
- `emotional_armor` — Anxiety, anger, emotional regulation
- `identity_clarity` — Self-knowledge, values, purpose
- `social_dynamics` — Relationships through a psychology lens
- `habit_architecture` — Building/breaking habits via behavioral psychology

## Shared constants

- `src/prompts/shared/host-model-sheet.ts` — **Single** mentor identity string for Content Architect prose, Imagen `CHARACTER LOCK`, and Lead Scriptwriter **[VIS]** lines.
- `src/lib/channel-visual-style.ts` + `src/lib/channel-palette.ts` — **Visualist** comic language + Cyber-Stoic palette (thumbnails + script **[VIS]** stills). Injected in Layers A and D **only** (not in the Scriptwriter — that's deliberate context pruning).
- `src/lib/channel-dna.ts` — Version, source file, **thesis** string, reference image.

## Imports elsewhere

- `src/lib/content-architect/system-prompt.ts` re-exports the assembled system string (stable import path for the action).
- `src/lib/thumbnail/build-image-prompt.ts` re-exports Imagen builder from `src/prompts/thumbnail/`.

When you change thumbnail **writing** rules, edit **Layer A** (`content-architect/parts/part-4-output-discipline.ts`).  
When you change thumbnail **painting** rules, edit **Layer D** (`thumbnail/build-imagen-prompt.ts`) and shared Visualist modules under `src/lib/` (`channel-visual-style`, `channel-palette`) plus `host-model-sheet.ts`.
When you change **script** voice, act shape, or [NAR]/[VIS] rules, edit **Layer F** (`script-writer/build-system-instruction.ts`).  
When you change **spoken** delivery (accent target, pacing, proximity) for Gemini TTS, edit **Layer H** (`vocal-dna.ts`). Per-act TTS energy (Mess vs Mirror vs Way Forward) lives in **`narration-tts-act-notes.ts`**.

## If JSON field quality drifts

Gemini also reads `responseSchema` field descriptions. Keep them as **pointers** only; if the model under-follows a field, add **one** clarifying sentence there—do not paste the full system prompt into the schema (that reintroduces overwrite risk).

## Supabase + local disk (studio data and durable thumbnails)

Studio tables live on whatever project **`NEXT_PUBLIC_SUPABASE_URL`** points at. Migrations under `supabase/migrations/` create (among others): `idea_generation_runs`, `generated_ideas`, `script_documents`, **`thumbnail_generation_events`**, **`narration_audio_segments`**, **`vis_still_generation_events`**. RLS is on; server code uses the **service_role** JWT for inserts.

### Narration TTS (per script block)

1. **Disk:** With **`UPGRADE_LIFE_LOCAL_ASSETS_ROOT`** set, each block is written as `{root}/narration-audio/{episodeId}/{actId}-{blockIndex}.wav` (or `.mp3`) and a **`manifest.json`** in that folder lists segments for reload without DB.
2. **Supabase:** With the service role key, each block upserts into **`narration_audio_segments`** (`video_id` is the sanitized episode id). **`GET /api/studio/audio/segments?videoId=…`** prefers DB rows, else reads the manifest.
3. **Playback:** **`GET /api/studio/audio/file?rel=…`** serves allowed narration paths only.
4. **Studio:** Audio stage → **Generate all narration blocks** calls **`POST /api/studio/audio/tts/block`** once per `[NAR]` block (curiosity bridges are not auto-TTS yet).
6. **Env snapshot (no secrets):** **`GET /api/studio/media-status`** returns JSON booleans (`localAssetsConfigured`, `supabaseConfigured`, `ffmpegAvailable`, `ffprobeAvailable`, `motionClipsReady`) without echoing env var values.

### [VIS] stills (Imagen, Visuals stage)

1. **Disk:** `{root}/vis-stills/{episodeId}/{actId}-{blockIndex}.png` plus **`manifest.json`** in that folder.
2. **Supabase:** **`vis_still_generation_events`** (optional). **`GET /api/studio/visuals/stills?videoId=…`** prefers DB, else manifest.
3. **Generate:** **`POST /api/studio/visuals/generate`** with `videoId`, `actId`, `blockIndex`, `visualDescription`, optional `workingTitle`. **`GET /api/studio/visuals/file?rel=…`** serves PNGs only.
4. **Motion preview (Ken Burns + narration length):** **`GET /api/studio/visuals/motion?videoId=…&actId=…&blockIndex=…`** builds or returns a cached **H.264** MP4 under `{root}/vis-stills/{episodeId}/motion/{actId}-{blockIndex}.mp4` — **one clip per block**: still + **lanczos** oversample + **`zoompan`** Ken Burns (`zoom_in` / `zoom_out` / `pan_left` / `pan_right`, rotated by act + block), **frame count from ffprobe audio duration** at 24 fps (muxed with that narration). Optional **`FFMPEG_PATH`** / **`FFPROBE_PATH`** if binaries are not on `PATH`. If ffmpeg is missing, the route returns **503** and the UI falls back to the static still.
5. **Batch clip render:** **`POST /api/studio/visuals/motion/render`** with `{ "videoId": "…" }` renders every block that has both a still and narration (optional `force: true`, or single block with `actId` + `blockIndex`). Studio **Generate clips** calls this.
6. **Assembly preview (Visuals hero):** The top player on the Visuals stage plays block clips **in script order** with muxed narration (play / pause / skip).
7. **Download video:** **`POST /api/studio/visuals/export`** with `{ "videoId", "workingTitle"?, "force"? }` ensures block clips exist, **ffmpeg concat** joins them to `{root}/vis-stills/{episodeId}/export/assembly.mp4`, then returns a **`downloadUrl`**. **`GET /api/studio/visuals/export/file?videoId=…`** streams the file as an attachment. Studio **Download video** triggers this.

### Thumbnails: `UPGRADE_LIFE_LOCAL_ASSETS_ROOT` + Supabase (preferred)

1. **Folder on disk:** Set **`UPGRADE_LIFE_LOCAL_ASSETS_ROOT`** (or **`LOCAL_ASSETS_ROOT`**) in `.env.local` to an **absolute** path that exists and is writable (e.g. external SSD: `/Volumes/Seagate/upgrade-life-assets`, or `~/upgrade-life-assets`).
2. **Supabase:** Set **`NEXT_PUBLIC_SUPABASE_URL`**, **`SUPABASE_SERVICE_ROLE_KEY`** (or **`SUPABASE_SECRET_KEY`** — same service_role secret). Without the service key, files can still be written to disk but **no** `thumbnail_generation_events` row is created, so **`/api/studio/thumbnails/by-id/...`** will not work.
3. **Apply migrations** to that project (`supabase db push`, `supabase migration up`, or MCP `apply_migration`) so `thumbnail_generation_events` exists.
4. **Restart the Next dev server** after changing env vars.
5. **Flow:** Imagen returns bytes → server writes `{root}/thumbnails/{yyyy}/{mm}/{uuid}.png` → row inserted with **`local_relative_path`** (and optional **`idea_id`**). The client still gets base64 for instant preview; reloads use the API routes + disk.

A dedicated project was used for early MCP apply; you can point the same migrations at any project as long as URL + service role match.

**`SUPABASE_ACCESS_TOKEN`** is for the Supabase CLI / tooling only, not for `createClient` in this app.

### Other server writes

With the same URL + service role, `content-architect` and `script-writer` can persist idea batches and script documents when configured. Per-block narration audio rows go to **`narration_audio_segments`** when **`UPGRADE_LIFE_LOCAL_ASSETS_ROOT`** is set (files always to disk; DB row is best-effort).
