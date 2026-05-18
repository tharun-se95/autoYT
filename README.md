# Upgrade Life

Production studio for the **Upgrade Life** YouTube channel — from brainstormed ideas to a downloadable episode video. Built with **Next.js**, **Gemini**, **Imagen**, **Supabase**, and **ffmpeg**.

**Repository:** [github.com/tharun-se95/upgrade-life](https://github.com/tharun-se95/upgrade-life)

---

## What it does

| Area | Description |
|------|-------------|
| **Channel desk** | Browse **Videos** in production and **Upcoming** ideas. Generate idea batches with thumbnails (Imagen 4 + Channel DNA v4). |
| **Studio — Script** | Four-act scripts (`mess` → `deep_dive` → `mirror` → `way_forward`) with `[NAR]` narration and `[VIS]` still lines. |
| **Studio — Audio** | Per-block Gemini TTS with vocal DNA; audio saved to disk + optional Supabase. |
| **Studio — Visuals** | Imagen stills per `[VIS]` line, Ken Burns **motion clips** (ffmpeg), assembly **preview**, and **Download video** (full concat export). |

```text
Ideas + thumbnails  →  Script  →  Narration  →  [VIS] stills  →  Motion clips  →  assembly.mp4
   Channel desk          Studio      Studio         Studio          ffmpeg           Download
```

---

## Tech stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router), React 19, TypeScript
- **UI:** Tailwind CSS 4, shadcn/ui
- **AI:** Google Gemini (ideas, scripts, TTS), Imagen 4 (thumbnails + stills)
- **Database:** [Supabase](https://supabase.com) (Postgres + service role for server writes)
- **Media:** Local asset root on disk; **ffmpeg** / **ffprobe** for Ken Burns clips and final concat
- **Node:** 20.9+ (see `.nvmrc` — Node 22 recommended)

---

## Quick start

### Prerequisites

- **Node.js** ≥ 20.9 ([nvm](https://github.com/nvm-sh/nvm): `nvm use`)
- **ffmpeg** (includes ffprobe): `brew install ffmpeg` on macOS
- **Google AI** API key ([Gemini](https://ai.google.dev/))
- **Supabase** project (optional but recommended for persistence across reloads)
- Writable folder for generated assets (external drive or `~/upgrade-life-assets`)

### Install and run

```bash
git clone https://github.com/tharun-se95/upgrade-life.git
cd upgrade-life
npm install
cp .env.example .env.local
```

Edit `.env.local` — at minimum:

```bash
UPGRADE_LIFE_LOCAL_ASSETS_ROOT=/absolute/path/to/upgrade-life-assets
GEMINI_API_KEY=your_key
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_jwt
# If ffmpeg is not on PATH when Next.js starts:
# FFMPEG_PATH=/opt/homebrew/bin/ffmpeg
# FFPROBE_PATH=/opt/homebrew/bin/ffprobe
```

Apply database migrations (once per Supabase project):

```bash
# With Supabase CLI linked to your project:
supabase db push
# Or run SQL files in supabase/migrations/ via the dashboard
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `UPGRADE_LIFE_LOCAL_ASSETS_ROOT` | Yes (for media) | Absolute path for thumbnails, narration, stills, motion clips, exports |
| `GEMINI_API_KEY` | Yes | Ideas, scripts, TTS, Imagen |
| `NEXT_PUBLIC_SUPABASE_URL` | Recommended | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Server-side inserts (never expose to the client) |
| `FFMPEG_PATH` / `FFPROBE_PATH` | If needed | Absolute paths when ffmpeg is not on the dev server `PATH` |
| `GEMINI_MODEL` | Optional | Default `gemini-2.0-flash` |
| `GEMINI_TTS_MODEL` / `GEMINI_TTS_VOICE` | Optional | Narration voice (see `.env.example`) |

Copy from [`.env.example`](.env.example). **Never commit** `.env.local`.

Check readiness without exposing secrets: `GET /api/studio/media-status` → `localAssetsConfigured`, `supabaseConfigured`, `ffmpegAvailable`, `motionClipsReady`.

---

## Production workflow

1. **Channel desk → Upcoming** — Enter topics, generate ideas + thumbnails. Use **Start in production** to open an episode in the studio.
2. **Studio → Script** — Generate or edit the four-act script; mark script complete.
3. **Studio → Audio** — **Generate all narration blocks**; mark audio complete.
4. **Studio → Visuals**
   - **Generate all visuals** — Imagen still per `[VIS]` line
   - **Generate clips** — ffmpeg Ken Burns + muxed narration per block
   - **Assembly preview** — Play all blocks in order in the hero player
   - **Download video** — ffmpeg concat → single `assembly.mp4`

### On-disk layout

With `UPGRADE_LIFE_LOCAL_ASSETS_ROOT` set to e.g. `/Volumes/SSD/upgrade-life-assets`:

```text
{root}/
  thumbnails/{yyyy}/{mm}/*.png
  narration-audio/{episodeId}/{actId}-{blockIndex}.wav
  vis-stills/{episodeId}/{actId}-{blockIndex}.png
  vis-stills/{episodeId}/motion/{actId}-{blockIndex}.mp4
  vis-stills/{episodeId}/export/assembly.mp4
```

Each episode folder includes `manifest.json` files so lists can reload without the database when needed.

---

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (webpack) |
| `npm run dev:turbo` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |

---

## Project structure

```text
src/
  app/                    # Routes, API handlers, server actions
    channel-desk/         # Ideas + production queue
    studio/               # Per-episode script / audio / visuals
    api/studio/           # Media APIs (audio, visuals, thumbnails, export)
  components/             # UI (landing, channel hub, studio shell)
  lib/                    # Assets store, ffmpeg, Gemini helpers, Supabase
  prompts/                # Prompt layers (Content Architect, Scriptwriter, TTS, Imagen)
supabase/migrations/      # Postgres schema
scripts/                  # Node version check, thumbnail backfill
Upgrade_Life_Final_DNA_v4.txt   # Brand DNA source (human reference)
```

Deeper prompt architecture and API notes: [`src/prompts/README.md`](src/prompts/README.md).

---

## ffmpeg

Motion and export require **ffmpeg** and **ffprobe** on the machine running Next.js.

```bash
# macOS
brew install ffmpeg
ffmpeg -version
ffprobe -version
```

- **Per-block clips:** still + Ken Burns (`zoompan`) + narration length from ffprobe → H.264 MP4
- **Download video:** concat demuxer (`-c copy` when possible) → `export/assembly.mp4`

If the dev server does not inherit your shell `PATH`, set `FFMPEG_PATH` and `FFPROBE_PATH` in `.env.local` and restart.

---

## Supabase

Migrations create tables including:

- `idea_generation_runs`, `generated_ideas`
- `script_documents`
- `thumbnail_generation_events`
- `narration_audio_segments`
- `vis_still_generation_events`

Server routes use the **service role** key. Row Level Security is enabled; client-side writes are not used for studio data.

---

## API overview (studio)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/studio/media-status` | GET | Env readiness (no secrets) |
| `/api/studio/audio/segments` | GET | List narration segments |
| `/api/studio/audio/tts/block` | POST | Generate TTS for one block |
| `/api/studio/visuals/stills` | GET | List [VIS] stills |
| `/api/studio/visuals/generate` | POST | Generate one still |
| `/api/studio/visuals/motion` | GET | Stream one motion clip |
| `/api/studio/visuals/motion/render` | POST | Batch-render motion clips |
| `/api/studio/visuals/export` | POST | Build joined `assembly.mp4` |
| `/api/studio/visuals/export/file` | GET | Download assembly MP4 |

---

## Contributing

This is a private channel production tool. For your own fork:

1. Branch from `main`
2. Keep secrets in `.env.local` only
3. Run `npm run lint` before opening a PR

---

## License

Private project — all rights reserved unless otherwise specified by the repository owner.
