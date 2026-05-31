"use client";

import { useEffect, useState } from "react";
import { 
  Sparkles, 
  Copy, 
  Palette, 
  Check, 
  Database, 
  Layers, 
  AlertCircle,
  Video,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";
import { getChannelsList, applyStyleToChannel, type ChannelSimple } from "@/app/actions/channel-styles";

interface VisualStyle {
  id: string;
  name: string;
  category: "explainers" | "artistic" | "vintage" | "tactile";
  niche: string;
  channel: string;
  colors: string[];
  colorNames: string[];
  keywords: string[];
  styleProse: string;
  paletteProse: string;
  noTextProse: string;
}

const STYLES_DATABASE: VisualStyle[] = [
  {
    id: "style_kurzgesagt",
    name: "The Kurzgesagt Flat-Vector",
    category: "explainers",
    niche: "Popular Science, Physics, Futurism, Biology",
    channel: "Kurzgesagt – In a Nutshell",
    colors: ["#090d16", "#e2e8f0", "#38bdf8", "#f97316", "#701a75"],
    colorNames: ["Cosmic Void", "Stellar Ivory", "Nebula Cyan", "Solar Orange", "Atmospheric Violet"],
    keywords: ["70s cosmic explainer", "perfect geometric shapes", "thick solid colored vector", "flat silhouette characters", "zero outlines"],
    styleProse: "Flat 2D minimalist vector graphic illustration in a clean, cosmic-explainer style. Perfectly geometric shapes, thick solid colored vector fills, smooth clean lines, and zero outlines. Characters must have simple black dot-eyes, clean limbs, and flat silhouettes. Highly vibrant, stylized compositions with absolute flat layering.",
    paletteProse: "Use a high-intensity cosmic neon-pastel palette of vibrant teal (#38bdf8), solar orange (#f97316), electric violet (#701a75), and deep cosmic void blue (#090d16) for backdrops. Completely flat shading with occasional soft vector gradients.",
    noTextProse: "STRICTLY BAN ALL WRITTEN TEXT, letters, labels, names, words, signs, numbers, or UI buttons from appearing anywhere in the image. If there are blackboards, computer screens, signs, or devices, depict only abstract neon lines, abstract glitch patterns, or symbolic drawings. NEVER render English text characters."
  },
  {
    id: "style_caspian",
    name: "The Caspian Isometric Blueprint",
    category: "explainers",
    niche: "Geopolitics, Finance, Economics, Corporate History",
    channel: "CaspianReport, The Infographics Show",
    colors: ["#0f172a", "#f8fafc", "#10b981", "#fbbf24", "#ef4444"],
    colorNames: ["Deep Slate Blue", "Crisp White", "Emerald Green", "Warning Gold", "Friction Red"],
    keywords: ["isometric blueprint grid", "crisp outlines", "data-dense micro assets", "schematic flow diagrams"],
    styleProse: "A clean flat vector isometric illustration drawn on a subtle geometric grid backdrop. Crisp outlines, detailed micro-isometric assets (buildings, vehicles, server racks, graphs), and structured multi-layered compositions showing clean structural flow or schematic pathways.",
    paletteProse: "Use a premium financial-analyst palette of deep slate blue background (#0f172a), crisp warm white (#f8fafc), bright emerald green (#10b981), and warning amber gold (#fbbf24) accents.",
    noTextProse: "The image must contain absolutely zero readable text: no words, letters, numbers, watermarks, tags, speech bubbles, captions, signs, or label tags inside the artwork. Every whiteboard, paper, device screen, sign, computer monitor, tablet, or book page must be completely clean, blank, and empty of any written or drawn letters. If any object would normally have writing on it, paint it as a pure solid color or an abstract blank form with absolutely no readable letters."
  },
  {
    id: "style_polyphonic",
    name: "The Polyphonic Silhouette Collage",
    category: "explainers",
    niche: "Music Essays, Cinematic Reviews, Literature, Art History",
    channel: "Polyphonic, Vox (Cultural Essays)",
    colors: ["#18181b", "#fafafa", "#dc2626", "#eab308", "#1e3a8a"],
    colorNames: ["Deep Charcoal", "Textured Cream", "Crimson Red", "Mustard Yellow", "Midnight Indigo"],
    keywords: ["high-contrast silhouette", "paper-cut layering", "bold organic shapes", "visual symbolism", "retro-modern layout"],
    styleProse: "A high-contrast minimalist 2D silhouette collage. Bold organic shapes, dramatic paper-cut layers, and symbolic graphic designs. Characters are shown as elegant dark silhouettes against bright, textured, abstract backgrounds. High visual symbolism.",
    paletteProse: "High contrast retro-modern palette of deep charcoal black silhouettes (#18181b), textured sepia, aged cream (#fafafa), and a single striking focal accent like crimson red (#dc2626) or mustard yellow (#eab308).",
    noTextProse: "Strictly avoid any readable alphanumeric text, names, labels, letters, symbols, words, or speech bubbles. All textures and background elements are purely abstract shapes with zero legible print."
  },
  {
    id: "style_cyber_glow",
    name: "The Cyber-Glow Neon Vector",
    category: "explainers",
    niche: "Futuristic Tech, Programming, Hacking Essays, Sci-Fi",
    channel: "ColdFusion, TechQuickie",
    colors: ["#000000", "#ffffff", "#06b6d4", "#ec4899", "#8b5cf6"],
    colorNames: ["Pitch Black", "Prism White", "Cyber Cyan", "Neon Pink", "Laser Violet"],
    keywords: ["luminescent vector lines", "cyberpunk electronics", "wireframe grids", "volumetric laser glow", "high retention"],
    styleProse: "Futuristic 2D cybernetic vector illustration with glowing wireframe outlines and luminescent laser lines. Complex PCB electronic layouts, glowing microchip connections, and holographic HUD graphics layered on top of deep-space backdrops.",
    paletteProse: "Electric high-intensity cyberpunk palette of pure pitch black (#000000), glowing laser cyan (#06b6d4), vibrant neon hot pink (#ec4899), and electric violet outlines. High self-luminescence values.",
    noTextProse: "Strictly ban all English characters, words, interface buttons, code, and text labels. Replace all screens, computer consoles, or digital interfaces with pure blank glowing neon shapes, abstract glowing scanlines, or concentric light circles."
  },
  {
    id: "style_moebius",
    name: "The Moebius 70s Retro Ink",
    category: "artistic",
    niche: "Space Sci-Fi, Anomalies, Lost Civilisations, Mythologies",
    channel: "The Cosmic Archive",
    colors: ["#1e1b4b", "#f1f5f9", "#38bdf8", "#fb7185", "#ca8a04"],
    colorNames: ["Nebula Shadow", "Dusty Slate", "Retro Cyan", "Faded Rose", "Aged Ochre"],
    keywords: ["fine ink cross-hatching", "analog paper washes", "granular stippling", "grand scale space", "Jean Giraud style"],
    styleProse: "Vintage 1970s analog sci-fi comic book illustration in the hand-drawn style of Moebius (Jean Giraud). Fine black ink cross-hatching, granular space-dust stippling, and flat desaturated color washes. Grand, surreal alien landscapes with massive ancient ruins and tiny explorers.",
    paletteProse: "Aged, faded analog palette of muted ochre (#ca8a04), dusty rose (#fb7185), sage green, and soft lavender. Heavy ink shadows with granular film-grain texture and off-white paper washes (#f1f5f9).",
    noTextProse: "Do not render any text, characters, words, letters, signatures, speech bubbles, or captions. Keep the artwork entirely clean, representing pure retro speculative sci-fi illustrations."
  },
  {
    id: "style_dark_academia",
    name: "The Dark Academia Chiaroscuro",
    category: "artistic",
    niche: "Philosophy, Dark Psychology, Literary Analysis",
    channel: "Existential Whispers, Pursuit of Wonder",
    colors: ["#1c1917", "#f5f5f4", "#b45309", "#15803d", "#7c2d12"],
    colorNames: ["Stone Shadow", "Warm Ivory", "Candlelight Amber", "Forest Mahogany", "Terracotta Clay"],
    keywords: ["chiaroscuro oil paint", "heavy impasto brush", "candlelight volumetric glow", "melancholic scenery", "organic dark academia"],
    styleProse: "A rich Chiaroscuro oil painting with expressive brushstrokes and thick impasto textures. Deep classical contrast, soft volumetric candle-light, and dark shadows. Romantic, melancholic scenery (dimly lit libraries, old clocks, autumn windows).",
    paletteProse: "Rich academic palette of mahogany brown, deep forest green (#15803d), dark stone charcoal (#1c1917), amber candlelight glow (#b45309), and soft book-page warm ivory (#f5f5f4).",
    noTextProse: "Every single book page, canvas, scroll, or stone wall must be completely blank, carrying zero letters, words, writing, or signatures. All background books are depicted as plain colored leather blocks with no titles."
  },
  {
    id: "style_ghibli",
    name: "The Ghibli Watercolor Wash",
    category: "artistic",
    niche: "Mythologies, Cozy Storytelling, Childhood Fables, Gentle Psychology",
    channel: "The School of Life, Cozy Tales",
    colors: ["#fef08a", "#ffffff", "#4ade80", "#60a5fa", "#f87171"],
    colorNames: ["Meadow Dandelion", "Cloud White", "Sage Green", "Cozy Blue Sky", "Soft Tomato Red"],
    keywords: ["nostalgic watercolor wash", "cozy hand-painted backdrops", "Ghibli-inspired lighting", "lively nature elements", "soft charcoal outlines"],
    styleProse: "Cozy, nostalgic hand-painted watercolor illustration in the artistic style of Studio Ghibli. Soft, fluid watercolor washes, gentle bleeding edges, light charcoal pencil outlines, and double exposure lush natural greenery. Volumetric sunlight filtering through tree leaves (komorebi), casting soft dappled shadows.",
    paletteProse: "Cheerful, warm pastel-nature color palette of soft dandelion yellow (#fef08a), meadow sage green (#4ade80), warm sky blue (#60a5fa), and soft tomato red accents, washed over vintage white canvas.",
    noTextProse: "Strictly exclude all forms of text, lettering, numbers, signs, and labels. Devices, books, or posters are painted as simple abstract organic blocks with no symbols or alphabet."
  },
  {
    id: "style_retro_cartoon",
    name: "The Mid-Century Warm Cartoon",
    category: "artistic",
    niche: "Satire, Internet Commentary, Weird Tech Trends, Modern Society",
    channel: "Uncanny Valley",
    colors: ["#2b1509", "#fffbeb", "#fb7185", "#f59e0b", "#34d399"],
    colorNames: ["Espresso Brown", "Butter-Cream", "Rose-Coral", "Sunny Amber Gold", "Sage Teal"],
    keywords: ["warm mid-century cartoon", "flat vector shapes", "lively pop-art", "deep cocoa outlines", "cheerful and nice aesthetics"],
    styleProse: "Warm and cheerful flat vector illustrations in a lively mid-century modern cartoon style. Bright, sunny, and easy-going visual aesthetics, crisp clean vector lines, soft organic shapes, and a cozy warm ambiance. Strictly avoid deep shadows, cyberpunk neon glow, dark tech grids, or gritty textures. Every frame should feel warm, nice, and inviting.",
    paletteProse: "Use a bright, cozy pastel-pop color palette centered on soft butter-cream (#fffbeb), crisp warm white, cheerful rose-coral (#fb7185), sunny amber gold (#f59e0b), and light sage teal (#34d399). Shadows are soft warm tan or light beige, never black or purple.",
    noTextProse: "STRICTLY BAN ALL WRITTEN TEXT, letters, labels, names, words, signs, numbers, or UI buttons from appearing anywhere in the image. If there are blackboards, computer screens, signs, or devices, depict only abstract neon lines, abstract glitch patterns, or symbolic drawings. NEVER render English text characters."
  },
  {
    id: "style_lemmino",
    name: "The Lemmino Moody Cinematic Noir",
    category: "vintage",
    niche: "True Crime, Unsolved Mysteries, Geopolitics, Investigations",
    channel: "Lemmino, MagnatesMedia",
    colors: ["#020617", "#f8fafc", "#e2e8f0", "#e11d48", "#b45309"],
    colorNames: ["Tech Charcoal", "Pristine White", "Investigation Blue", "Crimson Clue", "Archival Amber"],
    keywords: ["cinematic moody photo", "volumetric key light", "smoky noir haze", "high-end dark mystery", "chiaroscuro shadows"],
    styleProse: "A moody, high-end cinematic photograph with deep shadows and sharp, highly dramatic volumetric lighting. Extreme detail, smoky noir atmospheric haze, and Chiaroscuro composition. Objects appear as premium historical artifacts or dark mystery files.",
    paletteProse: "Ultra-premium dark palette of pitch black (#020617), slate gray, and steel blue with sharp glowing amber-gold (#b45309) or crimson-red (#e11d48) volumetric key lighting.",
    noTextProse: "Do not paint or include any readable letters, file labels, documents titles, dates, or signs. Keep all paper surfaces, folders, blackboards, or screens completely empty of writing, utilizing only blurred graphic textures or pure shadows."
  },
  {
    id: "style_sepia_history",
    name: "The Archival Sepia Collage",
    category: "vintage",
    niche: "War History, Ancient Empires, Documentary Narratives",
    channel: "Kings and Generals, OverSimplified",
    colors: ["#1c1917", "#d6d3d1", "#78350f", "#44403c", "#1e3a8a"],
    colorNames: ["Parchment Slate", "Sepia Tan", "Oxidized Copper", "Charcoal Dust", "Imperial Navy"],
    keywords: ["historical scrapbook", "daguerreotype cutout", "worn paper margins", "aged tea stains", "parchment texture"],
    styleProse: "An archival historical mixed-media collage. Old daguerreotype photo cutouts, aged tea-stained maps, vintage newspaper borders, and charcoal sketches layered on top of each other. Rich paper textures, coffee stains, and realistic worn-paper edges.",
    paletteProse: "Muted historical palette of sepia (#d6d3d1), dark charcoal (#1c1917), aged cream, parchment tan, and washed-out oxidized teal or copper accents (#78350f).",
    noTextProse: "Strictly omit all readable dates, numbers, map labels, or newspaper headlines. All text blocks are rendered as blurred parallel ink lines, abstract cursive squiggles, or worn, unreadable ink stains."
  },
  {
    id: "style_whiteboard",
    name: "The RSA Animate Whiteboard Marker",
    category: "explainers",
    niche: "Book Summaries, Business Models, Highly-detailed Tutorials",
    channel: "RSA Animate, Productivity Game, ASAPScience",
    colors: ["#ffffff", "#000000", "#ef4444", "#3b82f6", "#10b981"],
    colorNames: ["Pure Board White", "Dry-Erase Black", "Marker Crimson", "Marker Royal Blue", "Marker Emerald"],
    keywords: ["high-contrast marker drawing", "dry-erase white board", "hand-sketched cartoon outlines", "diagrammatic layout"],
    styleProse: "High-contrast whiteboard marker animation style illustration. Pure, crisp white whiteboard background, bold hand-sketched black marker outlines, and minimal colored marker fills. Characters are playful, cartoonish, expressive line-art figures interacting with diagrammatic icons, gears, and conceptual doodles.",
    paletteProse: "Stark, high-contrast palette of solid whiteboard white (#ffffff), dry-erase marker black (#000000), and singular marker highlights of crimson red (#ef4444), royal blue (#3b82f6), or green, utilizing clean felt-tip textures.",
    noTextProse: "Do not write any actual text, words, labels, or letters on the whiteboard or inside speech bubbles. Represent all notes, equations, and details as abstract squiggly lines, symbolic charts, geometric equations, or visual doodles."
  },
  {
    id: "style_pixel_art",
    name: "The 16-Bit Retro Lofi Pixel",
    category: "artistic",
    niche: "Lofi Beats, Retro Tech, Nostalgic History, Sci-Fi Musings",
    channel: "Lofi Girl, Retro Game Mechanics",
    colors: ["#110c1f", "#e2e8f0", "#a855f7", "#ec4899", "#3b82f6"],
    colorNames: ["Arcade Deep Blue", "Pixel Silver", "Neon Amethyst", "Cyber Rose", "Console Blue"],
    keywords: ["16-bit pixel art", "clean dithered gradients", "retro arcade color", "lofi warm glowing window", "retro console aesthetic"],
    styleProse: "Nostalgic 16-bit retro pixel art illustration with clean grid outlines and dithered color gradients. Rich indoor/outdoor lofi scenes (cozy bedrooms with glowing CRT monitors, rainy window sills, cyber-streets). High texture detail utilizing small, clean colored square pixels.",
    paletteProse: "Warm, atmospheric retro-arcade palette of deep indigo backgrounds (#110c1f), glowing amethyst violet (#a855f7), neon pink highlights (#ec4899), console blue, and silver-grey pixel shading (#e2e8f0).",
    noTextProse: "All CRT screens, console menus, or posters are filled with blank pixel blocks or abstract colored pixel shapes with absolutely zero legible letters or English characters."
  },
  {
    id: "style_sticker",
    name: "The Floating Sticker Pop-Art",
    category: "tactile",
    niche: "Life Hacks, Comedy, Trivia Shorts, Viral Explainer Shorts",
    channel: "Bright Side, HowToBasic",
    colors: ["#fafaf9", "#1c1917", "#f43f5e", "#fbbf24", "#2dd4bf"],
    colorNames: ["Warm Parchment", "Sticker Border Black", "Watermelon Rose", "Sunny Honey", "Soft Turquoise"],
    keywords: ["die-cut sticker outlines", "drop shadows", "floating paper pop-art", "high retention shorts", "clean modern cartoon"],
    styleProse: "A playful flat 2D sticker-art collage. Richly detailed cartoon objects and characters rendered as thick die-cut stickers with a clean, solid white outer border. The stickers float dynamically on a warm solid-color pastel background, casting subtle, realistic drop-shadows.",
    paletteProse: "Bright, cheerful pastel-pop palette of soft cream background (#fafaf9), sunny yellow (#fbbf24), sweet pink (#f43f5e), and soft turquoise (#2dd4bf) stickers.",
    noTextProse: "Ensure no text, lettering, or alphabet characters appear inside the stickers or on the background. Logos on stickers are converted into abstract vector patterns or shapes."
  },
  {
    id: "style_claymation",
    name: "The Matte Claymation 3D",
    category: "tactile",
    niche: "Productivity Apps, High-End Tech, Developer Server Systems",
    channel: "Polyverse, Tech Explainer 3D",
    colors: ["#fdfbf7", "#44403c", "#f0abfc", "#67e8f9", "#86efac"],
    colorNames: ["Matte Clay Cream", "Pinch Shadow", "Plasticine Lavender", "Cozy Matte Cyan", "Clay Mint Green"],
    keywords: ["matte claymation 3D", "rounded low-poly", "realistic soft studio light", "satisfying tactile clay", "depth-of-field blur"],
    styleProse: "A gorgeous, highly tactile 3D isometric illustration in a smooth claymation style. Low-poly, rounded plasticine clay assets, soft matte clay textures, and warm studio lighting with realistic soft depth-of-field blur. Looks like a physically handcrafted clay model.",
    paletteProse: "Cozy matte pastel palette of peach, soft mint (#86efac), lavender (#f0abfc), warm cream (#fdfbf7), and sky blue clay layers with smooth, realistic shadows.",
    noTextProse: "Ensure the model has absolutely no text, words, letters, labels, or UI buttons. Replace all keyboard key legends, screen details, or device interfaces with plain blank clay slabs of solid colors."
  },
  {
    id: "style_papercut",
    name: "The Papercut Stop-Motion",
    category: "tactile",
    niche: "Empathetic Stories, Culture, Organic History, TED-Ed Style",
    channel: "TED-Ed, Kurzgesagt (Paper Edition)",
    colors: ["#fffbeb", "#2a1508", "#f472b6", "#38bdf8", "#4ade80"],
    colorNames: ["Parchment Base", "Cut-Shadow Brown", "Paper Blossom Pink", "Paper Sky Blue", "Forest Green Card"],
    keywords: ["layered papercut textures", "stop-motion drop shadows", "organic raw paper edges", "tactile dimensional layout"],
    styleProse: "A highly tactile, dimensional papercut illustration. Multiple layers of physically textured cardstock and construction paper cutouts, stacked to create high depth. Features raw, fibrous paper edges, realistic drop shadows between paper layers, and a charming stop-motion layout aesthetic.",
    paletteProse: "Warm, rich organic palette of soft parchment cream (#fffbeb), wood-grain brown (#2a1508), soft blossom pink (#f472b6), and forest green cardstock layers. Soft ambient studio light casting distinct shadows.",
    noTextProse: "All paper pieces are cleanly cut and completely blank. No text, words, lettering, signatures, or printed characters of any kind may exist anywhere on the paper layers."
  },
  {
    id: "style_film_noir",
    name: "The Vintage Cellulose Film",
    category: "vintage",
    niche: "True Crime, Archival Documentaries, Old Hollywood Stories",
    channel: "The Vintage Files, Hollywood Graveyard",
    colors: ["#0a0a0a", "#f5f5f5", "#a3a3a3", "#525252", "#78716c"],
    colorNames: ["Celluloid Black", "Silver Halide White", "Vintage Neutral Gray", "Granular Charcoal", "Oxidized Sepia Tint"],
    keywords: ["vintage cellulose film", "silver halide contrast", "heavy dust scratches", "1930s cinematic look", "faded analog film texture"],
    styleProse: "Vintage 1930s cinematic cellulose film photograph. Striking silver halide black-and-white contrast, heavy analog film-grain texture, organic dust scratches, and light leaks. Moody, dramatic old Hollywood chiaroscuro lighting casting high-contrast shadows.",
    paletteProse: "Rich monochromatic silver-halide palette ranging from dense celluloid black (#0a0a0a) to bright silver-white (#f5f5f5) and midtone stone grays (#a3a3a3), with a very subtle, warm archival sepia tint (#78716c).",
    noTextProse: "Strictly exclude all readable print, document headings, numbers, and dates. All newspaper pages, text slides, and signs are blurry, illegible, or obscured by heavy film scratches and shadow overlays."
  }
];

export default function VisualLibraryPage() {
  const [channels, setChannels] = useState<ChannelSimple[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [applyingStyleId, setApplyingStyleId] = useState<string | null>(null);
  const [expandedStyles, setExpandedStyles] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadChannels() {
      const list = await getChannelsList();
      setChannels(list);
      if (list.length > 0) {
        setSelectedChannelId(list[0].id);
      }
    }
    loadChannels();
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedStates((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [key]: false }));
      }, 1500);
    });
  };

  const toggleExpand = (styleId: string) => {
    setExpandedStyles((prev) => ({ ...prev, [styleId]: !prev[styleId] }));
  };

  const handleApplyStyle = async (style: VisualStyle) => {
    if (!selectedChannelId) {
      setErrorMessage("Please select a target channel from the dropdown first.");
      return;
    }
    setApplyingStyleId(style.id);
    setSuccessMessage(null);
    setErrorMessage(null);

    const input = {
      colors: style.colors,
      styleProse: style.styleProse,
      paletteProse: style.paletteProse,
      noTextProse: style.noTextProse,
      keywords: style.keywords
    };

    const res = await applyStyleToChannel({
      channelId: selectedChannelId,
      styleName: style.name,
      styleInput: input
    });

    setApplyingStyleId(null);
    if (res.ok) {
      setSuccessMessage(`Successfully applied "${style.name}" to channel! Database rows seeded.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      setErrorMessage(res.error || "An error occurred while updating channel styles.");
    }
  };

  const filteredStyles = activeCategory === "all"
    ? STYLES_DATABASE
    : STYLES_DATABASE.filter((s) => s.category === activeCategory);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 bg-zinc-950 text-zinc-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-zinc-900 pb-8 mb-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Palette className="size-8 text-amber-500" />
              Visual Style Library
            </h1>
            <p className="text-sm text-zinc-400 max-w-xl">
              Equip your faceless YouTube channels with high-performance style directions. Inject colors and negative constraints straight into your Supabase database.
            </p>
          </div>
          
          {/* Target Channel Selector */}
          <div className="flex flex-col gap-2 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 md:w-80">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Video className="size-3 text-rose-400" />
              Target Channel Configuration
            </label>
            {channels.length === 0 ? (
              <span className="text-xs text-zinc-500 animate-pulse">Loading active channels...</span>
            ) : (
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-200 py-1.5 px-3 rounded-lg text-xs font-semibold focus:outline-none focus:border-amber-500 w-full"
              >
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Global Feedback Banners */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-3">
            <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">Success! Style Applied</span>
              <span className="text-xs opacity-90">{successMessage}</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-3">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">Seeding Failed</span>
              <span className="text-xs opacity-90">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Filter Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-zinc-900 pb-5">
          {[
            { id: "all", label: "All Presets" },
            { id: "explainers", label: "Flat Vector & Explainers" },
            { id: "artistic", label: "Artistic & Hand-Drawn" },
            { id: "vintage", label: "Vintage & Archival" },
            { id: "tactile", label: "Kinetic & Tactile" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeCategory === tab.id
                  ? "bg-zinc-800 text-white shadow-md border border-zinc-700"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Style Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredStyles.map((style) => (
            <div key={style.id} className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 flex flex-col gap-6 hover:border-zinc-800 transition-all shadow-xl">
              
              {/* Style Image Preview Banner */}
              <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-zinc-900 bg-zinc-900/40">
                <img
                  src={`/images/styles/${style.id}.png`}
                  alt={style.name}
                  className="object-cover w-full h-full hover:scale-[1.02] transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => {
                    // Show elegant loading/placeholder state if image is generating
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.className = "aspect-video w-full rounded-lg border border-dashed border-zinc-800 bg-zinc-900/20 flex flex-col items-center justify-center p-6 gap-2 text-center";
                      
                      const loader = document.createElement('div');
                      loader.className = "flex flex-col items-center gap-1.5";
                      loader.innerHTML = `
                        <div class="w-7 h-7 rounded-full border border-dashed border-amber-500/40 border-t-amber-500 animate-spin flex items-center justify-center mb-1"></div>
                        <span class="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Compiling Preview Canvas...</span>
                      `;
                      parent.appendChild(loader);
                    }
                  }}
                />
              </div>

              {/* Header Info */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                    <Sparkles className="size-4 text-amber-500" />
                    {style.name}
                  </h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                    {style.category}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 flex flex-col gap-0.5">
                  <p><strong className="text-zinc-300">Niches:</strong> {style.niche}</p>
                  <p><strong className="text-zinc-300">Channel Reference:</strong> <span className="text-amber-400 font-medium italic">{style.channel}</span></p>
                </div>
              </div>

              {/* Palette Swatches */}
              <div className="flex flex-col gap-2 border-t border-zinc-900/60 pt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Color Palette Swatches</span>
                <div className="grid grid-cols-5 gap-2">
                  {style.colors.map((color, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-900 rounded-lg p-1.5">
                      <span className="w-3.5 h-3.5 rounded-full border border-white/5 shrink-0" style={{ backgroundColor: color }}></span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] text-zinc-500 font-mono truncate">{color}</span>
                        <span className="text-[8px] text-zinc-400 font-bold leading-none truncate">{style.colorNames[idx]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hashtag tags */}
              <div className="flex flex-wrap gap-1.5">
                {style.keywords.map((word, idx) => (
                  <span key={idx} className="text-[9px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-900 text-zinc-400 font-bold">
                    #{word}
                  </span>
                ))}
              </div>

              {/* Expandable Prompts Accordion Section */}
              <div className="border-t border-zinc-900/60 pt-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleExpand(style.id)}
                    className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-all focus:outline-none"
                  >
                    {expandedStyles[style.id] ? (
                      <>
                        <EyeOff className="size-3.5 text-rose-400" />
                        Hide Style Prompts
                      </>
                    ) : (
                      <>
                        <Eye className="size-3.5 text-amber-500" />
                        Inspect Style & Prompts
                      </>
                    )}
                  </button>
                  <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">
                    {expandedStyles[style.id] ? "Details active" : "Details folded"}
                  </span>
                </div>

                {expandedStyles[style.id] && (
                  <div className="flex flex-col gap-4 border-t border-zinc-900/40 pt-4 animate-in fade-in duration-300">
                    {[
                      { label: "IMAGEN STYLE PROSE", text: style.styleProse, key: `${style.id}_style` },
                      { label: "IMAGEN PALETTE PROSE", text: style.paletteProse, key: `${style.id}_palette` },
                      { label: "NEGATIVE CONSTRAINTS (NO TEXT)", text: style.noTextProse, key: `${style.id}_notext` }
                    ].map((pBlock) => (
                      <div key={pBlock.key} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{pBlock.label}</span>
                          <button
                            onClick={() => copyToClipboard(pBlock.text, pBlock.key)}
                            className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1"
                          >
                            {copiedStates[pBlock.key] ? (
                              <>
                                <Check className="size-3 text-emerald-400" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] leading-relaxed text-zinc-400 bg-zinc-900/30 p-2.5 rounded-lg border border-zinc-900 font-mono select-all">
                          {pBlock.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Database Direct Action Button */}
              <div className="border-t border-zinc-900 pt-4 mt-auto">
                <button
                  disabled={applyingStyleId !== null}
                  onClick={() => handleApplyStyle(style)}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-950 font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/5"
                >
                  {applyingStyleId === style.id ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      Seeding Database...
                    </>
                  ) : (
                    <>
                      <Database className="size-3.5" />
                      Apply Style to Selected Channel
                    </>
                  )}
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
