# AutoYT — Enterprise-Grade Multi-Channel Video Production Studio

Production studio and autonomous media compilation pipeline for high-retention horizontal video essays and vertical Shorts/Reels. Powered by **Next.js 16**, **Google Gemini 2.0**, **Imagen 4.0**, **Supabase**, and **local hardware acceleration engines** (FFmpeg, local speech-pause aligners, faster-whisper transcription, and libass captioning).

**Repository:** [github.com/tharun-se95/upgrade-life](https://github.com/tharun-se95/upgrade-life)

---

## 🚀 Key Architectural Breakthroughs

The platform has been supercharged from a single-channel minimalist tool into an industrial, highly scalable, and completely decentralized multi-channel video factory.

### 🌐 1. Decoupled Multi-Channel Core
- **Complete Channel Isolation:** Database-driven configuration (`public.channels` and `public.channel_prompts` tables) isolates branding colors, customized vocal presets (ElevenLabs/Gemini speeds, speeds, and pitches), host model sheets, visual keyword lists, and negative prompts.
- **Seeded Premium Channels:**
  - *The Cosmic Archive* (Sci-Fi, retro Moebius line-ink illustration, `Charon` deep narrator voice @ `0.92x` speed).
  - *Existential Whispers* (Philosophy, dark academia oil paintings, `Kore` warm narrator voice @ `0.95x` speed).
  - *Techno-Bytes* (Dystopian cyberpunk flat vectors, `Aoede` bright sarcastic voice @ `1.10x` speed).
  - *The Wealth Blueprint* (Personal Finance, flat emerald-and-gold vector blueprint grid diagrams, `Fenrir` warm authoritative voice @ `0.96x` speed).
  - *Uncanny Valley* (Cultural Critique, retro 1950s pop-art cartoon, highly energetic, sarcastic delivery).

### 📐 2. Domain-Agnostic Dynamic Acts
- **No Hardcoded Progression:** Dropped the rigid legacy act IDs (`mess`, `deep_dive`, `mirror`, `way_forward`).
- **Context-Driven Structures:** The scriptwriter and outline planner dynamically design, partition, and name act timelines individually for each channel based on its description, focus, and target topic (e.g., custom educational acts like `agent_chaos` and `statechart_solution` for technical walkthroughs).
- **Universal Act Mapping:** All local asset stores, file-system directories, and API endpoints are fully upgraded to validate and handle any alphanumeric URL-friendly act ID seamlessly.

### 🧠 3. Self-Healing Multimodal Vision Auditor
- **Real-Time Quality Gate:** Integrated a robust, on-the-fly vision checking system utilizing Gemini 2.0 Flash to audit generated PNG stills against active style notes, layouts, and forbidden-text constraints.
- **Prompt Mutation and Healing:** If a still is scored below 7.5 or contains literal text letters/gibberish, the system automatically mutates the visual prompt, appends negative constraints, and regenerates the frame (retrying up to 3 times) to secure pristine, text-free cinematic art.

### 🔍 3.5. AI Hook Architect & Pacing Evaluator (Executive Consultant Gate)
- **Pre-Flight Quality Gate:** Integrated a fully automated, retention-engineered script and storyboard audit loop (`src/app/actions/script-writer.ts`) sitting directly in the scripting pipeline.
- **Cynical Critique Framework:** A second Gemini 2.0 Flash instance acting as a cynical YouTube consultant rates each generated act from `0 to 10` across three metrics: Hook Intensity (first 5 seconds of Act 1), Dynamic Pacing (ensuring visual triggers align perfectly with narration word-density and vocal speed guidelines), and Visual Still Composition (auditing layers, focal points, and lighting).
- **Background Self-Healing (Max 3x):** If any score falls below **8.0**, the consultant returns a detailed critique and a structured `directorsInstruction`. The scriptwriter intercepts this, appends the instruction as a mandatory rewrite command, and automatically triggers an in-background rewrite.
- **Style Canvas Domination:** Implemented a strict rule that forces all described concepts—even complex, modern server vaults or code screens—to be drawn strictly within the active style notes (e.g., as hand-drawn marker sketches for Whiteboard Marker channels, flat vectors for Techno-bytes) to prevent any style drift or bleed.
- **High-Information Trigger Phrases:** Banned vague pacing anchors (like `"Now, this"`, `"But there's"`, `"And then"`), forcing the model to select semantically rich noun/verb milestones to trigger visual cuts.

### 🎙️ 4. Offline Local Speech-Pause Aligner
- **Zero Cloud Latency:** Replaced ElevenLabs Scribe API with a local Python-based aligner (`scripts/local-aligner.py`).
- **Millisecond-Perfect Pause Detection:** Uses standard math library and binary buffers to analyze speech-energy peaks (RMS) locally on the host Mac in under 0.05 seconds. It automatically matches trigger-phrases onto natural verbal silence gaps, eliminating API cost and queues.

### 📊 5. Word-by-Word Highlighted Subtitle Burner
- **Layout-Specific Calibration:** 
  - *Vertical Shorts (9:16):* Hardburns large center-third kinetic captions ( Montserrat/Impact, 54px size, 480px bottom margin) in rapid 3-word chunks for maximum retention overlay compatibility.
  - *Widescreen Widescreen (16:9):* Subtle, lower-third aligned text ( Montserrat, 28px size, 86px bottom margin) in comfortable 5-word phrases.
- **Hardware-Accelerated Render:** Transcribes locally via `faster-whisper`, compiles `.ass` (SubStation Alpha) styled caption sheets, and hardburns them using libass-enabled FFmpeg with dynamic color palette branding.

### 🎨 6. 16-Preset Creative Blueprint Catalog
- **Style Seeding Dashboard:** Interactive Stripe-style style library page (`/studio/visual-library`) with collapsing prompt details-on-demand and image gallery showcases (Ghibli watercolor, Cyber-glow vectors, CASPIAN flat designs, claymation, and RSA whiteboard marker).
- **Direct Database Injection:** One-click seeding of any select style's palette, prose prompts, and visual parameters directly into active database channel rows.

---

## 🛠️ Tech Stack

- **Frontend Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Style Tokens:** Tailwind CSS 4, Zinc-Dark Theme with Amber-Gold highlights (#09090b / #f59e0b)
- **Database:** Supabase (Service Role security, Row Level Security active)
- **AI Core:** Google GenAI SDK (Gemini 2.0 Flash + Imagen 4.0 `imagen-4.0-generate-001`)
- **Python Framework:** Python 3.11 with `moviepy`, `numpy`, `pillow`, `pysubs2`, and `faster_whisper`
- **Developer Engines:** High-performance Next.js DNS & telemetry loopback bypasses delivering < 250ms Turbopack hot reload speeds.

---

## 📂 Project Structure

```text
/
  .cache/episodes/        # Local scriptwriter outlines and cached acts
  local-assets/           # Video pipeline assets root (ignored from git)
    narration-audio/      # Vocal narration WAV folders (per-episode)
    vis-stills/           # Storyboard PNG stills and final renders
  scripts/
    compile_style_test_videos.py  # Master style-isolated video compiler
    generate-channel-video.py     # End-to-end multi-channel parallel runner
    local-aligner.py              # Raw speech RMS pause alignment engine
    burn-subtitles.py             # Whisper + libass subtitles burning script
    generate-style-previews.js    # Node-based Imagen 4.0 preview generator
    with-node22.js                # High-performance Turbopack environment launcher
  src/
    app/                  # App Router views, server actions, and endpoints
      channel-desk/       # Main creator production console
      studio/             # Video asset script, audio, and visual timelines
      api/studio/         # Media, export, and generation endpoints
    components/           # Premium design components (Zinc/Amber style tokens)
    lib/                  # Local asset store, FFmpeg filters, Supabase clients
    prompts/              # Domain-agnostic scriptwriter, Content Architect templates
  supabase/migrations/    # Schema and multi-channel DB prompts tables
```

---

## ⚡ Quick Start (Performance Pinned)

### 1. Prerequisites
- **Node.js:** Ensure Node 22+ is available on your path (handled automatically via `scripts/with-node22.js`).
- **FFmpeg:** Must have a static FFmpeg binary compiled with `libass` support (default brew static builds).
  ```bash
  brew install ffmpeg
  ```
- **Python:** Python 3.11 virtual environment configured at the project root (`venv`).
  ```bash
  source venv/bin/activate
  pip install moviepy numpy pillow pysubs2 faster-whisper requests
  ```

### 2. Configure Environment
Create a `.env.local` file in the project root:
```bash
UPGRADE_LIFE_LOCAL_ASSETS_ROOT=/Users/tharunk/Documents/Everyday struggles/upgrade-life/local-assets
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your_local_or_remote_service_role_jwt
```

### 3. High-Performance Launch (Turbopack < 250ms Compile)
Always launch the Next.js dev server using our DNS and Telemetry bypass environment:
```bash
npm run dev:turbo
```

---

## 🎬 Testing and Compiling Video Styles

To generate and compile style-isolated 30-second test videos dynamically, use our master orchestrator script. It mocks database configurations, generates detailed scripts, synthesizes narration, compiles high-resolution stills, burns highlighted subtitles, overlays progress bars, and cleans up after itself.

```bash
# General Syntax:
python3 scripts/compile_style_test_videos.py <style_id_without_prefix>

# Example 1: Compile Ghibli Watercolor (Cozy, soft green forest scenery, Voice: Kore @0.98x)
python3 scripts/compile_style_test_videos.py style_ghibli

# Example 2: Compile Moebius Retro Ink (Analog 70s space monoliths, Voice: Charon @0.92x)
python3 scripts/compile_style_test_videos.py style_moebius

# Example 3: Compile Cyber-Glow Vectors (Holographic PCBS, Voice: Puck @1.05x)
python3 scripts/compile_style_test_videos.py style_cyber_glow

# Example 4: Compile RSA Whiteboard Marker (Deterministic Statechart tutorials, Voice: Fenrir @0.98x)
python3 scripts/compile_style_test_videos.py style_whiteboard
```

*Note: The compilation script supports **skip-aware recovery**. If a run times out or hits API limits, simply execute the same command again — it will immediately skip existing stills and audio, finishing compilation in under 10 seconds!*

---

## 📄 License

Private repository — all rights reserved. Owned and maintained by Tharun Shivkumar.
