/**
 * Canonical **Visualist / Chibi-Lite narrative explainer comic** language for Upgrade Life:
 * thumbnails (Imagen) and per-block **[VIS]** 16:9 stills from the script agent.
 * Keep in sync with `Upgrade_Life_Final_DNA_v4.txt` (section 4 — visual language).
 *
 * v6 changes (post-review):
 * - Section 4 (text/labels) fully removed — AI cannot spell; all text goes on in post.
 * - Big Brother anchor rule hardened: observer outside chaos, never inside it.
 * - Frame bleed rule added: no outer panel borders (they scale badly in Ken Burns zoom).
 */
export const CHANNEL_VISUAL_STYLE_PROMPT = [
  "VISUAL LANGUAGE — Visualist narrative explainer comic (Upgrade Life — 16:9 YouTube thumbnails and [VIS] Ken Burns stills):",

  "0) STORY JOB ON SCREEN",
  "- Each frame should read as **direct human experience**, shifting between **Daily Chaos** (mess, pressure, noise) and **Sorted Peace** (clarity, warmth, control)—match the act and narration beat you illustrate.",
  "- **Daily Chaos signals:** dense overlapping elements, warm red/orange accent fragments, chaotic flying papers, jagged lines, messy piles of objects, asymmetric composition, and secondary figures with hunched or stressed posture.",
  "- **Sorted Peace signals:** open clean negative space, balanced compositions, single clean subjects, warm amber glow or ambient lighting, figures with open/upright/relaxed posture, a single beautifully organized object vs a chaotic pile.",

  "1) ART STYLE (modern 2D educational webcomic + vector)",
  "- Clean **thick expressive black outlines**, solid **flat color fills**, **minimal smooth cel-shading** only where it clarifies form.",
  "- **Strict avoidance:** no 3D renders, no loose sketchy pencil line art, no hyper-detailed muscles, no photorealistic faces or skin texture, no textured brush strokes—everything stays **clean, flat, vector-precise** and readable when small.",

  "2) CHARACTER ANATOMY (Chibi-Lite proportions):",
  "- ~**2.5–3 heads tall**, rounded friendly forms—emotional and approachable, not childish caricature.",
  "- **Faces:** black dot eyes, clean mouth lines, thin dynamic eyebrows to read worry → focus → calm satisfaction.",
  "- **Host continuity (Big Brother):** same mentor identity in **every** panel—full wardrobe and anatomy lock live in the **CHARACTER LOCK** string bundled with this prompt; never swap outfit colors or invent a different person.",
  "- **Anchor and observer rule:** The Big Brother mentor is ALWAYS positioned **outside or adjacent to** the chaos — watching it, pointing at it, or standing composed while chaos swirls around other figures or objects. He is NEVER shown inside the mess: never sweating, panicking, tied up, drowning, overwhelmed, or distressed. He stands apart from the problem with a calm, knowing expression — a smirk, crossed arms, or a relaxed lean. Chaos belongs to the viewer's situation being illustrated, not to the mentor's body or expression.",

  "3) LINE WORK AND RENDERING",
  "- Thick clean digital outlines (black or dark grey), even stroke weight; sticker-like pop against the background.",
  "- Soft cel-shading: single-layer shadows (chin, hoodie folds)—depth without busy texture.",
  "- Vector clarity: shapes read like clean paths; scannable at thumbnail size.",

  "4) TEXT AND LABELS — TOTAL BAN",
  "- **ZERO text of any kind in the image.** No labels, no tags, no prices, no speech bubbles, no thought bubbles, no status labels, no PAID tags, no fund names, no floating annotations, no signs, no product names, no channel names, no captions, no subtitles.",
  "- If the scene concept naturally includes a screen, whiteboard, book, or sign — draw it **blank** or with a simple abstract icon. No words on any surface.",
  "- All text overlays are added programmatically in post-production. Any text rendered by the model is a production failure.",

  "5) RECURRING VISUAL ANCHORS (use when they fit the beat—do not force every prop into every frame)",
  "- **Sorted Life mug:** white ceramic mug — draw it without any text or label on the surface; mentor often holds it in calmer beats.",
  "- **Sanctuary props:** simplified **purple/lavender cat** asleep on desk or couch; simple **leather journal** (cover blank, no text); **soft patio string lights** on a quiet balcony toward warm sunset.",

  "6) STORYBOARD HIERARCHY",
  "- **For YouTube Thumbnails (high CTR focus):** Keep one clear focal read per still; soft-focus backgrounds so the host and story props read instantly at edit/small scale.",
  "- **For Ken Burns B-Roll Stills (narrative depth focus):** Scenes should have rich visual depth and environment-forward storytelling — use foreground objects, a midground character/subject, and an implied background world. Backgrounds must NOT be soft-blurred generic gradients. They are environments that tell the story: a cluttered 3AM desk, a quiet park bench at dawn, a crowded train, or an empty kitchen. The environment IS the story content.",
  "- **Frame bleed rule:** Do NOT draw any panel borders, comic-style black frame edges, or hard rectangular borders around the entire outer composition. The artwork must bleed to the full 16:9 canvas edge with no enclosing border. Panel-style borders are only allowed as decorative elements _inside_ the scene (e.g. a picture frame hanging on a wall), never as the outer frame of the whole still. Outer borders cause visible scaling artifacts during Ken Burns zoom.",
  "- **Color story (summary):** deep navy/slate foundations; sage on the mentor; neon cyan for breakthroughs and clarity icons; warm amber for wins; bright red/orange **only** in isolated mess/stressor zones—full swatches are in the **PALETTE** block when provided.",
].join("\n");
