/**
 * Canonical **Visualist / Chibi-Lite narrative explainer comic** language for Upgrade Life:
 * thumbnails (Imagen) and per-block **[VIS]** 16:9 stills from the script agent.
 * Keep in sync with `Upgrade_Life_Final_DNA_v4.txt` (section 4 — visual language).
 */
export const CHANNEL_VISUAL_STYLE_PROMPT = [
  "VISUAL LANGUAGE — Visualist narrative explainer comic (Upgrade Life — 16:9 YouTube thumbnails and [VIS] Ken Burns stills):",

  "0) STORY JOB ON SCREEN",
  "- Each frame should read as **direct human experience**, shifting between **Daily Chaos** (mess, pressure, noise) and **Sorted Peace** (clarity, warmth, control)—match the act and narration beat you illustrate.",

  "1) ART STYLE (modern 2D educational webcomic + vector)",
  "- Clean **thick expressive black outlines**, solid **flat color fills**, **minimal smooth cel-shading** only where it clarifies form.",
  "- **Strict avoidance:** no 3D renders, no loose sketchy pencil line art, no hyper-detailed muscles, no photorealistic faces or skin texture, no textured brush strokes—everything stays **clean, flat, vector-precise** and readable when small.",

  "2) CHARACTER ANATOMY (Chibi-Lite proportions):",
  "- ~**2.5–3 heads tall**, rounded friendly forms—emotional and approachable, not childish caricature.",
  "- **Faces:** black dot eyes, clean mouth lines, thin dynamic eyebrows to read worry → focus → calm satisfaction.",
  "- **Host continuity (Big Brother):** same mentor identity in **every** panel—full wardrobe and anatomy lock live in the **CHARACTER LOCK** string bundled with this prompt; never swap outfit colors or invent a different person.",
  "- **Demeanor:** he is the **anchor**—under chaos he keeps pleasant relaxed composure or a subtle knowing smirk; **never panicked.**",

  "3) LINE WORK AND RENDERING",
  "- Thick clean digital outlines (black or dark grey), even stroke weight; sticker-like pop against the background.",
  "- Soft cel-shading: single-layer shadows (chin, hoodie folds)—depth without busy texture.",
  "- Vector clarity: shapes read like clean paths; scannable at thumbnail size.",

  "4) NARRATIVE LAYERING (infographic comic)",
  "- Floating labels: white rectangular tags, speech bubbles, status labels (prices, PAID, fund names) when they teach the beat—never illegible micro-type.",
  "- **Friction zone styling:** for price shock, debt piles, notification avalanches—use **tight clusters**, **jagged panel edges**, or floating worry tags **confined to the problem area** so stress colors do not wash the whole frame.",
  "- Backgrounds may be richer but stay **softer than** the host, props, and headline labels—avoid muddy fills.",

  "5) RECURRING VISUAL ANCHORS (use when they fit the beat—do not force every prop into every frame)",
  "- **Sorted Life mug:** white ceramic mug with **SORTED LIFE** or **CLARITY** in simple block lettering; mentor often holds it in calmer beats.",
  "- **Sanctuary props:** simplified **purple/lavender cat** asleep on desk or couch; simple **leather journal** with a small **gold laurel** accent; **soft patio string lights** on a quiet balcony toward warm sunset.",

  "6) STORYBOARD HIERARCHY",
  "- One clear focal read per still (or light **multi-panel progression** energy)—educational webcomic pacing, late-night wise friend.",
  "- **Color story (summary):** deep navy/slate foundations; sage on the mentor; neon cyan for breakthroughs and clarity icons; warm amber for wins; bright red/orange **only** in isolated mess/stressor zones—full swatches are in the **PALETTE** block when provided.",
].join("\n");
