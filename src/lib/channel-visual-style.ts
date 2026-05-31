/**
 * Canonical visual and artistic style guidelines for thumbnail and beat-still generations.
 */
export const CHANNEL_VISUAL_STYLE_PROMPT = [
  "VISUAL LANGUAGE — Artistic and Scene Composition Guidelines:",
  "0) SCENE EMOTION & JOB ON SCREEN",
  "- Each frame should read as a pensive, slightly melancholic digital experience, shifting between 'Digital Chaos' (geometric clutter, neon glitches, fragmented data streams) and 'Stoic Clarity' (minimal negative space, stark white light, symmetrical layouts) to match the narration beat. Focus on conceptual metaphors, not literal depictions.",
  "1) ART STYLE & RENDERING RULES",
  "- Modern 2D vector educational webcomic, thick clean black outlines, solid flat color fills, clean cel-shading. Glitch art elements (subtle digital artifacts, broken lines) can be used for 'Chaos' scenes.\n- Strictly avoid photorealism, 3D CGI renders, loose sketchy pencil drawings, or painterly textured brushes. Everything stays clean, vector-precise, and digital-native. No organic textures.",
  "2) CHARACTER SPECS & ANATOMY",
  "- The main AI character (see HOST_MODEL_SHEET_PROSE) should be about 3-3.5 heads tall, angular forms, with glowing circuits. Approaching emotional subtlety, never exaggerated. His presence should be calm, observing, or interacting thoughtfully.\n- Other abstract 'human' figures, if present, are silhouetted, faceless, or wireframe to represent generalized 'humanity' experiencing digital struggle.",
  "3) LINE WORK AND RENDERING",
  "- Thick, precise digital outlines with even stroke weight, providing a stark pop against background elements. Use subtle, fragmented lines for 'glitch' effects in scenes of digital overwhelm.\n- Soft cel-shading with a single, sharp shadow layer, adding volume without busy gradients. Light sources are typically stark, single-point neon glows.",
  "4) TEXT AND LABELS — TOTAL BAN",
  "- **ZERO text of any kind in the image.** No labels, no tags, no captions, no watermarks, no speech bubbles, no product names, no signs. Any text rendered by the model is a failure. All overlays must be added programmatically in post-production.",
  "5) RECURRING VISUAL ANCHORS (PROPS)",
  "- Simple, abstract digital props: a floating, fragmented data cube; a glowing, minimalist network graph; a lone, stark digital tree (binary branches). These reinforce continuity and thematic elements.\n- The host character's high-collared jacket and minimalist form are recurring anchors.",
  "6) STORYBOARD COMPOSITION & DEPTH",
  "- **For thumbnails:** One clear, minimalist focal point with blurred, abstract data-stream backgrounds for small scale CTR readability. Composition should feel stark and intentional.\n- **For storyboard stills:** Environment-forward depth with clear foreground digital elements, a midground subject (character or metaphoric object), and a detailed background layer of abstract digital architecture. Canvas must bleed to the full 16:9 canvas edge with no enclosing panel borders to avoid scaling issues in motion.",
].join("\n");