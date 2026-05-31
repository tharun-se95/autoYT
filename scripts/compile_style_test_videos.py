#!/usr/bin/env python3
import sys
import os
import re
import json
import requests
import subprocess
import time

# Replicate our 16 visual style database with short-form 30s scripts and voices
STYLE_VIDEOS_CONFIG = {
    "style_kurzgesagt": {
        "title": "The Quantum Multiverse",
        "voice": "Puck",
        "voice_speed": 1.05,
        "brief": (
            "Write a short 25-second popular-science video about parallel dimensions. Only 2 acts total. "
            "Act 1: mess (1 short block: your life is a series of splits - every quantum decision creates a new branching timeline). "
            "Act 2: way_forward (1 short block: realizing that somewhere out there, another version of you did the dishes. Enjoying the cosmic multiverse). "
            "Keep narration under 60 words total."
        )
    },
    "style_caspian": {
        "title": "Global Trade Chokepoints",
        "voice": "Fenrir",
        "voice_speed": 0.96,
        "brief": (
            "Write a short 25-second geopolitical video about maritime trade routes. Only 2 acts total. "
            "Act 1: mess (1 short block: the global supply chain relies on narrow, precarious straits, vulnerable to instant gridlocks). "
            "Act 2: way_forward (1 short block: the strategic routes - mapping the flow of container ships navigating these vital economic veins). "
            "Keep narration under 60 words total."
        )
    },
    "style_polyphonic": {
        "title": "The Frequency of Tears",
        "voice": "Kore",
        "voice_speed": 0.95,
        "brief": (
            "Write a short 25-second cultural essay about minor chords. Only 2 acts total. "
            "Act 1: mess (1 short block: why does a simple shift to A minor trigger deep, immediate sadness in our brain?). "
            "Act 2: way_forward (1 short block: finding cinematic beauty in shared melancholy, letting the frequencies wash over you). "
            "Keep narration under 60 words total."
        )
    },
    "style_cyber_glow": {
        "title": "Inside the Hacking Mesh",
        "voice": "Puck",
        "voice_speed": 1.05,
        "brief": (
            "Write a short 25-second hacking essay on firewalls. Only 2 acts total. "
            "Act 1: mess (1 short block: data packets traveling across complex networks, constantly scanned by security firewalls). "
            "Act 2: way_forward (1 short block: the digital breach - packet sniffing on wireframe networks and bypassing the gateway). "
            "Keep narration under 60 words total."
        )
    },
    "style_moebius": {
        "title": "Saturn Monolith",
        "voice": "Charon",
        "voice_speed": 0.92,
        "brief": (
            "Write a short 25-second space-anomalies video. Only 2 acts total. "
            "Act 1: mess (1 short block: a strange rhythmic obsidian slab discovered buried in Saturn's rings, humming erratically). "
            "Act 2: way_forward (1 short block: realizing it is not a signal, but the ancient mechanical pulse of a dead civilization). "
            "Keep narration under 60 words total."
        )
    },
    "style_dark_academia": {
        "title": "Nietzsche and the Void",
        "voice": "Kore",
        "voice_speed": 0.95,
        "brief": (
            "Write a short 25-second philosophical meditation. Only 2 acts total. "
            "Act 1: mess (1 short block: the agonizing anxiety of realizing our brief human life is meaningless on a cosmic scale). "
            "Act 2: way_forward (1 short block: the philosophical solution - embracing the void, writing your own meaning on a blank slate). "
            "Keep narration under 60 words total."
        )
    },
    "style_ghibli": {
        "title": "The Serenity of Moss",
        "voice": "Kore",
        "voice_speed": 0.98,
        "brief": (
            "Write a short 25-second cozy nature video. Only 2 acts total. "
            "Act 1: mess (1 short block: the rushing noise of city life, feeling constantly overwhelmed and out of breath). "
            "Act 2: way_forward (1 short block: slowing down in a lush forest, watching warm green moss absorb rainfall, breathing in rain). "
            "Keep narration under 60 words total."
        )
    },
    "style_retro_cartoon": {
        "title": "AI Girlfriends: Love in the Age of APIs",
        "voice": "Aoede",
        "voice_speed": 1.12,
        "brief": (
            "Write a short 25-second highly sarcastic video about AI relationships. Only 2 acts total. "
            "Act 1: mess (1 short block: men falling deeply in love with digital code avatars that never argue and charge monthly fees). "
            "Act 2: way_forward (1 short block: the hilarious reality check - realizing your virtual soulmate is just a nested if-statement running in a server farm). "
            "Keep narration under 60 words total."
        )
    },
    "style_pixel_art": {
        "title": "Midnight Terminal Solitude",
        "voice": "Puck",
        "voice_speed": 0.98,
        "brief": (
            "Write a short 25-second retro lofi video. Only 2 acts total. "
            "Act 1: mess (1 short block: sitting alone in a silent room, struggling with a stubborn bug at 2 AM). "
            "Act 2: way_forward (1 short block: a cozy lofi comfort - watch the cursor blink, listen to rain, and enjoy the programming solitude). "
            "Keep narration under 60 words total."
        )
    },
    "style_lemmino": {
        "title": "The Lost Roanoke Colony",
        "voice": "Charon",
        "voice_speed": 1.00,
        "brief": (
            "Write a short 25-second mystery documentary. Only 2 acts total. "
            "Act 1: mess (1 short block: relief ships arriving at Roanoke Island find only empty houses and a carved word: CROATOAN). "
            "Act 2: way_forward (1 short block: the dark investigation - examining historical folders and volumetric clues under a single dim light). "
            "Keep narration under 60 words total."
        )
    },
    "style_sepia_history": {
        "title": "Caesar Rubicon Crossing",
        "voice": "Fenrir",
        "voice_speed": 0.95,
        "brief": (
            "Write a short 25-second Roman history documentary. Only 2 acts total. "
            "Act 1: mess (1 short block: Julius Caesar hesitating on the banks of the Rubicon, knowing crossing means civil war). "
            "Act 2: way_forward (1 short block: the Rubicon crossed - marching with the loyal legions, Rome's ancient die is cast). "
            "Keep narration under 60 words total."
        )
    },
    "style_whiteboard": {
        "title": "Agentic AI Foundations & Statecharts",
        "voice": "Fenrir",
        "voice_speed": 0.98,
        "brief": (
            "Write an informative, highly educational whiteboard video about Agentic AI foundations and Statecharts. Only 2 acts total. "
            "Act 1: mess (1 short block: explain the chaos of building LLM agents with raw loops that lead to infinite prompt recursion, deadlocks, and uncontrollable agent loops). "
            "Act 2: way_forward (1 short block: explain the solution of using statecharts, deterministic transitions, states, and hierarchical workflows to build bulletproof, production-ready AI agents). "
            "Keep narration under 60 words total."
        )
    },
    "style_sticker": {
        "title": "Optical Illusion Brain Hacks",
        "voice": "Aoede",
        "voice_speed": 1.08,
        "brief": (
            "Write a short 25-second sticker explainer. Only 2 acts total. "
            "Act 1: mess (1 short block: your eyes are easily fooled - optical grids can make your brain see moving patterns that don't exist). "
            "Act 2: way_forward (1 short block: the brain hack - understanding cognitive visual blindspots with clean, die-cut sticker collages). "
            "Keep narration under 60 words total."
        )
    },
    "style_claymation": {
        "title": "Matte Workspace Design",
        "voice": "Puck",
        "voice_speed": 1.02,
        "brief": (
            "Write a short 25-second cozy design video. Only 2 acts total. "
            "Act 1: mess (1 short block: a cluttered desk is a cluttered mind - cables, coffee stains, and endless papers distracting you). "
            "Act 2: way_forward (1 short block: satisfying low-poly order - watching matte clay laptops and desk plants arrange themselves neatly). "
            "Keep narration under 60 words total."
        )
    },
    "style_papercut": {
        "title": "The Gold Seedling Life",
        "voice": "Kore",
        "voice_speed": 0.96,
        "brief": (
            "Write a short 25-second papercut story. Only 2 acts total. "
            "Act 1: mess (1 short block: a tiny seed buried deep in cold, heavy dirt, struggling to find any light). "
            "Act 2: way_forward (1 short block: paper stop-motion growth - breaking through the soil, spreading warm green leaves to the sunset). "
            "Keep narration under 60 words total."
        )
    },
    "style_film_noir": {
        "title": "Shadows of 42nd Street",
        "voice": "Charon",
        "voice_speed": 0.95,
        "brief": (
            "Write a short 25-second detective monologue. Only 2 acts total. "
            "Act 1: mess (1 short block: the rain washes the grime, but never the corruption, off these old cobblestone streets). "
            "Act 2: way_forward (1 short block: the noir monologue - standing alone under a foggy street lamp, waiting for a clue). "
            "Keep narration under 60 words total."
        )
    }
}

def compile_style_video(style_id):
    if style_id not in STYLE_VIDEOS_CONFIG:
        print(f"❌ Error: Style '{style_id}' not found in configuration.")
        return False
        
    config = STYLE_VIDEOS_CONFIG[style_id]
    v_id = f"test_style_{style_id.replace('style_', '')}"
    title = config["title"]
    brief = config["brief"]
    voice = config["voice"]
    speed = config["voice_speed"]

    print(f"\n=========================================================")
    print(f"🎬 KICKING OFF COMPILATION FOR PREVIEW VIDEO: {style_id.upper()}")
    print(f"   Video ID: {v_id} | Voice: {voice} (@{speed}x)")
    print(f"   Topic:    {title}")
    print("=========================================================")

    # 1. Load Supabase config from .env.local
    env_path = "/Users/tharunk/Documents/Everyday struggles/autoYT/.env.local"
    with open(env_path, "r", encoding="utf-8") as f:
        env_content = f.read()

    match_url = re.search(r"NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)", env_content)
    match_key = re.search(r"SUPABASE_SECRET_KEY\s*=\s*(.*)", env_content)
    
    if not match_url or not match_key:
        print("❌ Error: Missing credentials in .env.local")
        return False
        
    sb_url = match_url.group(1).strip()
    sb_key = match_key.group(1).strip()

    headers = {
        "apikey": sb_key,
        "Authorization": f"Bearer {sb_key}",
        "Content-Type": "application/json"
    }

    # 2. Temporarily register or merge this specific style configuration into channels and channel_prompts
    print("   1. Mocking style-isolated channel overrides in DB...")
    
    style_details = [s for s in styles_definitions() if s["id"] == style_id]
    if not style_details:
        print(f"   ❌ Error: Could not resolve prompt details for {style_id}")
        return False
    sd = style_details[0]

    # Insert channel mock
    mock_channel = {
        "id": f"ch_style_{style_id.replace('style_', '')}",
        "name": f"{sd['name']} Preview",
        "handle": f"ch_style_{style_id.replace('style_', '')}",
        "default_mode": "short",
        "template_family": "widescreen",
        "visual_style_notes": sd["styleProse"],
        "palette_hex": sd["colors"],
        "style_keywords": sd["keywords"],
        "visual_donts": "no text letters on screen, no boring stock photos",
        "generation_brief": f"A clean test video for the {sd['name']} style.",
        "voice_id": voice,
        "voice_speed": speed,
        "music_preset": "cosmic_ambient",
        "sfx_level": "low",
        "reference_urls": [],
        "characters": []
    }
    requests.delete(f"{sb_url}/rest/v1/channels?id=eq.ch_style_{style_id.replace('style_', '')}", headers=headers)
    requests.post(f"{sb_url}/rest/v1/channels", headers=headers, data=json.dumps(mock_channel))

    # Insert prompts mock
    requests.delete(f"{sb_url}/rest/v1/channel_prompts?channel_id=eq.ch_style_{style_id.replace('style_', '')}", headers=headers)
    prompts = [
        {"channel_id": f"ch_style_{style_id.replace('style_', '')}", "prompt_key": "VOCAL_DNA_TTS_SYSTEM_INSTRUCTION", "version": "v1.0", "is_active": True, "prompt_text": f"Vocal DNA: Deliver as {voice} voice, speed {speed}x."},
        {"channel_id": f"ch_style_{style_id.replace('style_', '')}", "prompt_key": "HOST_MODEL_SHEET_PROSE", "version": "v1.0", "is_active": True, "prompt_text": "A friendly, warm, and highly expressive animated character who guides the viewer."},
        {"channel_id": f"ch_style_{style_id.replace('style_', '')}", "prompt_key": "IMAGEN_VIS_STILL_PROSE_STYLE", "version": "v1.0", "is_active": True, "prompt_text": sd["styleProse"]},
        {"channel_id": f"ch_style_{style_id.replace('style_', '')}", "prompt_key": "IMAGEN_VIS_STILL_PROSE_PALETTE", "version": "v1.0", "is_active": True, "prompt_text": sd["paletteProse"]},
        {"channel_id": f"ch_style_{style_id.replace('style_', '')}", "prompt_key": "IMAGEN_VIS_STILL_PROSE_NOTEXT", "version": "v1.0", "is_active": True, "prompt_text": sd["noTextProse"]}
    ]
    requests.post(f"{sb_url}/rest/v1/channel_prompts", headers=headers, data=json.dumps(prompts))

    # 3. Insert or register the video row
    print("   2. Preparing video row in database...")
    requests.delete(f"{sb_url}/rest/v1/videos?id=eq.{v_id}", headers=headers)
    video_payload = {
        "id": v_id,
        "channel_id": f"ch_style_{style_id.replace('style_', '')}",
        "title": title,
        "mode": "short",
        "status": "scripting",
        "pipeline_unlocked": "script",
        "sections": []
    }
    requests.post(f"{sb_url}/rest/v1/videos", headers=headers, data=json.dumps(video_payload))

    # 4. Trigger the master compilation python scripts (resuming if assets exist!)
    print("   3. Invoking generation engine sequentially...")
    root_assets = "/Users/tharunk/Documents/Everyday struggles/autoYT/local-assets"

    print(f"      👉 Launching generate-channel-video.py for ch_style_{style_id.replace('style_', '')}...")
    result = subprocess.run([
        "python3", "-u", "scripts/generate-channel-video.py", f"ch_style_{style_id.replace('style_', '')}"
    ], capture_output=True, text=True, cwd="/Users/tharunk/Documents/Everyday struggles/autoYT")
    
    print(result.stdout)
    if result.stderr:
        print("=== STDERR ===")
        print(result.stderr)

    # Clean up mock database channel rows to keep database pristine
    print("\n   4. Cleaning up temporary DB mock rows...")
    requests.delete(f"{sb_url}/rest/v1/channel_prompts?channel_id=eq.ch_style_{style_id.replace('style_', '')}", headers=headers)
    requests.delete(f"{sb_url}/rest/v1/channels?id=eq.ch_style_{style_id.replace('style_', '')}", headers=headers)

    enhanced_output = os.path.join(root_assets, "vis-stills", v_id, "export", "assembly_enhanced.mp4")
    if os.path.exists(enhanced_output):
        print(f"\n🎉 SUCCESS! TEST VIDEO FOR '{style_id}' IS COMPILED!")
        print(f"   Output Path: {enhanced_output}")
        print(f"   File Size:   {os.path.getsize(enhanced_output) / (1024*1024):.2f} MB")
        return True
    else:
        print(f"\n❌ Error: Compilation failed for style '{style_id}'. Final enhanced file not found.")
        return False

def shutil_rm_exists(p):
    if os.path.exists(p):
        import shutil
        if os.path.isdir(p):
            shutil.rmtree(p)
        else:
            os.remove(p)

def styles_definitions():
    # Copy from static styles database
    return [
        {"id": "style_kurzgesagt", "name": "The Kurzgesagt Flat-Vector", "category": "explainers", "colors": ["#090d16", "#e2e8f0", "#38bdf8", "#f97316", "#701a75"], "keywords": ["70s cosmic explainer", "perfect geometric shapes"], "styleProse": "Flat 2D minimalist vector graphic illustration in a clean, cosmic-explainer style. Perfectly geometric shapes, thick solid colored vector fills, smooth clean lines, and zero outlines.", "paletteProse": "Use a high-intensity cosmic neon-pastel palette of vibrant teal (#38bdf8), solar orange (#f97316), electric violet (#701a75), and deep cosmic void blue (#090d16) for backdrops.", "noTextProse": "STRICTLY BAN ALL WRITTEN TEXT, letters, labels, names, words, signs, numbers, or UI buttons from appearing anywhere in the image. NEVER render English text characters."},
        {"id": "style_caspian", "name": "The Caspian Isometric Blueprint", "category": "explainers", "colors": ["#0f172a", "#f8fafc", "#10b981", "#fbbf24", "#ef4444"], "keywords": ["isometric blueprint grid", "crisp outlines"], "styleProse": "A clean flat vector isometric illustration drawn on a subtle geometric grid backdrop. Crisp outlines, detailed micro-isometric assets (buildings, vehicles, server racks, graphs), and structured multi-layered compositions showing clean structural flow.", "paletteProse": "Use a premium financial-analyst palette of deep slate blue background (#0f172a), crisp warm white (#f8fafc), bright emerald green (#10b981), and warning amber gold (#fbbf24) accents.", "noTextProse": "The image must contain absolutely zero readable text: no words, letters, numbers, watermarks, tags, speech bubbles, captions, signs, or label tags inside the artwork."},
        {"id": "style_polyphonic", "name": "The Polyphonic Silhouette Collage", "category": "explainers", "colors": ["#18181b", "#fafafa", "#dc2626", "#eab308", "#1e3a8a"], "keywords": ["high-contrast silhouette", "paper-cut layering"], "styleProse": "A high-contrast minimalist 2D silhouette collage. Bold organic shapes, dramatic paper-cut layers, and symbolic graphic designs. Characters are shown as elegant dark silhouettes against bright, textured, abstract backgrounds. High visual symbolism.", "paletteProse": "High contrast retro-modern palette of deep charcoal black silhouettes (#18181b), textured sepia, aged cream (#fafafa), and a single striking focal accent like crimson red (#dc2626) or mustard yellow (#eab308).", "noTextProse": "Strictly avoid any readable alphanumeric text, names, labels, letters, symbols, words, or speech bubbles."},
        {"id": "style_cyber_glow", "name": "The Cyber-Glow Neon Vector", "category": "explainers", "colors": ["#000000", "#ffffff", "#06b6d4", "#ec4899", "#8b5cf6"], "keywords": ["luminescent vector lines", "cyberpunk electronics"], "styleProse": "Futuristic 2D cybernetic vector illustration with glowing wireframe outlines and luminescent laser lines. Complex PCB electronic layouts, glowing microchip connections, and holographic HUD graphics layered on top of deep-space backdrops.", "paletteProse": "Electric high-intensity cyberpunk palette of pure pitch black (#000000), glowing laser cyan (#06b6d4), vibrant neon hot pink (#ec4899), and electric violet outlines.", "noTextProse": "Strictly ban all English characters, words, interface buttons, code, and text labels. Replace all screens, computer consoles, or digital interfaces with pure blank glowing neon shapes, abstract glowing scanlines, or concentric light circles."},
        {"id": "style_moebius", "name": "The Moebius 70s Retro Ink", "category": "artistic", "colors": ["#1e1b4b", "#f1f5f9", "#38bdf8", "#fb7185", "#ca8a04"], "keywords": ["fine ink cross-hatching", "analog paper washes"], "styleProse": "Vintage 1970s analog sci-fi comic book illustration in the hand-drawn style of Moebius (Jean Giraud). Fine black ink cross-hatching, granular space-dust stippling, and flat desaturated color washes. Grand, surreal alien landscapes with massive ancient ruins and tiny explorers.", "paletteProse": "Aged, faded analog palette of muted ochre (#ca8a04), dusty rose (#fb7185), sage green, and soft lavender. Heavy ink shadows with granular film-grain texture and off-white paper washes (#f1f5f9).", "noTextProse": "Do not render any text, characters, words, letters, signatures, speech bubbles, or captions."},
        {"id": "style_dark_academia", "name": "The Dark Academia Chiaroscuro", "category": "artistic", "colors": ["#1c1917", "#f5f5f4", "#b45309", "#15803d", "#7c2d12"], "keywords": ["chiaroscuro oil paint", "heavy impasto brush"], "styleProse": "A rich Chiaroscuro oil painting with expressive brushstrokes and thick impasto textures. Deep classical contrast, soft volumetric candle-light, and dark shadows. Romantic, melancholic scenery (dimly lit libraries, old clocks, autumn windows).", "paletteProse": "Rich academic palette of mahogany brown, deep forest green (#15803d), dark stone charcoal (#1c1917), amber candlelight glow (#b45309), and soft book-page warm ivory (#f5f5f4).", "noTextProse": "Every single book page, canvas, scroll, or stone wall must be completely blank, carrying zero letters, words, writing, or signatures."},
        {"id": "style_ghibli", "name": "The Ghibli Watercolor Wash", "category": "artistic", "colors": ["#fef08a", "#ffffff", "#4ade80", "#60a5fa", "#f87171"], "keywords": ["nostalgic watercolor wash", "cozy hand-painted backdrops"], "styleProse": "Cozy, nostalgic hand-painted watercolor illustration in the artistic style of Studio Ghibli. Soft, fluid watercolor washes, gentle bleeding edges, light charcoal pencil outlines, and double exposure lush natural greenery. Volumetric sunlight filtering through tree leaves (komorebi), casting soft dappled shadows.", "paletteProse": "Cheerful, warm pastel-nature color palette of soft dandelion yellow (#fef08a), meadow sage green (#4ade80), warm sky blue (#60a5fa), and soft tomato red accents, washed over vintage white canvas.", "noTextProse": "Strictly exclude all forms of text, lettering, numbers, signs, and labels."},
        {"id": "style_retro_cartoon", "name": "The Mid-Century Warm Cartoon", "category": "artistic", "colors": ["#2b1509", "#fffbeb", "#fb7185", "#f59e0b", "#34d399"], "keywords": ["warm mid-century cartoon", "flat vector shapes"], "styleProse": "Warm and cheerful flat vector illustrations in a lively mid-century modern cartoon style. Bright, sunny, and easy-going visual aesthetics, crisp clean vector lines, soft organic shapes, and a cozy warm ambiance. Strictly avoid deep shadows, cyberpunk neon glow, dark tech grids, or gritty textures. Every frame should feel warm, nice, and inviting.", "paletteProse": "Use a bright, cozy pastel-pop color palette centered on soft butter-cream (#fffbeb), crisp warm white, cheerful rose-coral (#fb7185), sunny amber gold (#f59e0b), and light sage teal (#34d399). Shadows are soft warm tan or light beige, never black or purple.", "noTextProse": "STRICTLY BAN ALL WRITTEN TEXT, letters, labels, names, words, signs, numbers, or UI buttons from appearing anywhere in the image. If there are blackboards, computer screens, signs, or devices, depict only abstract neon lines, abstract glitch patterns, or symbolic drawings. NEVER render English text characters."},
        {"id": "style_lemmino", "name": "The Lemmino Moody Cinematic Noir", "category": "vintage", "colors": ["#020617", "#f8fafc", "#e2e8f0", "#e11d48", "#b45309"], "keywords": ["cinematic moody photo", "volumetric key light"], "styleProse": "A moody, high-end cinematic photograph with deep shadows and sharp, highly dramatic volumetric lighting. Extreme detail, smoky noir atmospheric haze, and Chiaroscuro composition. Objects appear as premium historical artifacts or dark mystery files.", "paletteProse": "Ultra-premium dark palette of pitch black (#020617), slate gray, and steel blue with sharp glowing amber-gold (#b45309) or crimson-red (#e11d48) volumetric key lighting.", "noTextProse": "Do not paint or include any readable letters, file labels, documents titles, dates, or signs."},
        {"id": "style_sepia_history", "name": "The Archival Sepia Collage", "category": "vintage", "colors": ["#1c1917", "#d6d3d1", "#78350f", "#44403c", "#1e3a8a"], "keywords": ["historical scrapbook", "daguerreotype cutout"], "styleProse": "An archival historical mixed-media collage. Old daguerreotype photo cutouts, aged tea-stained maps, vintage newspaper borders, and charcoal sketches layered on top of each other. Rich paper textures, coffee stains, and realistic worn-paper edges.", "paletteProse": "Muted historical palette of sepia (#d6d3d1), dark charcoal (#1c1917), aged cream, parchment tan, and washed-out oxidized teal or copper accents (#78350f).", "noTextProse": "Strictly omit all readable dates, numbers, map labels, or newspaper headlines."},
        {"id": "style_whiteboard", "name": "The RSA Animate Whiteboard Marker", "category": "explainers", "colors": ["#ffffff", "#000000", "#ef4444", "#3b82f6", "#10b981"], "keywords": ["high-contrast marker drawing", "dry-erase white board"], "styleProse": "High-contrast whiteboard marker animation style illustration. Pure, crisp white whiteboard background, bold hand-sketched black marker outlines, and minimal colored marker fills. Characters are playful, cartoonish, line-art figures interacting with diagrammatic icons.", "paletteProse": "Stark, high-contrast palette of solid whiteboard white (#ffffff), dry-erase marker black (#000000), and singular marker highlights of crimson red (#ef4444), royal blue (#3b82f6), or green, utilizing clean felt-tip textures.", "noTextProse": "Do not write any actual text, words, labels, or letters on the whiteboard or inside speech bubbles. Represent all notes, equations, and details as abstract squiggly lines, symbolic charts, geometric equations, or visual doodles."},
        {"id": "style_pixel_art", "name": "The 16-Bit Retro Lofi Pixel", "category": "artistic", "colors": ["#110c1f", "#e2e8f0", "#a855f7", "#ec4899", "#3b82f6"], "keywords": ["16-bit pixel art", "clean dithered gradients"], "styleProse": "Nostalgic 16-bit retro pixel art illustration with clean grid outlines and dithered color gradients. Rich indoor/outdoor lofi scenes (cozy bedrooms with glowing CRT monitors, rainy window sills, cyber-streets). High texture detail utilizing small, clean colored square pixels.", "paletteProse": "Warm, atmospheric retro-arcade palette of deep indigo backgrounds (#110c1f), glowing amethyst violet (#a855f7), neon pink highlights (#ec4899), console blue, and silver-grey pixel shading (#e2e8f0).", "noTextProse": "All CRT screens, console menus, or posters are filled with blank pixel blocks or abstract colored pixel shapes with absolutely zero legible letters or English characters."},
        {"id": "style_sticker", "name": "The Floating Sticker Pop-Art", "category": "tactile", "colors": ["#fafaf9", "#1c1917", "#f43f5e", "#fbbf24", "#2dd4bf"], "keywords": ["die-cut sticker outlines", "drop shadows"], "styleProse": "A playful flat 2D sticker-art collage. Richly detailed cartoon objects and characters rendered as thick die-cut stickers with a clean, solid white outer border. The stickers float dynamically on a warm solid-color pastel background, casting subtle, realistic drop-shadows.", "paletteProse": "Bright, cheerful pastel-pop palette of soft cream background (#fafaf9), sunny yellow (#fbbf24), sweet pink (#f43f5e), and soft turquoise (#2dd4bf) stickers.", "noTextProse": "Ensure no text, lettering, or alphabet characters appear inside the stickers or on the background."},
        {"id": "style_claymation", "name": "The Matte Claymation 3D", "category": "tactile", "colors": ["#fdfbf7", "#44403c", "#f0abfc", "#67e8f9", "#86efac"], "keywords": ["matte claymation 3D", "rounded low-poly"], "styleProse": "A gorgeous, highly tactile 3D isometric illustration in a smooth claymation style. Low-poly, rounded plasticine clay assets, soft matte clay textures, and warm studio lighting with realistic soft depth-of-field blur.", "paletteProse": "Cozy matte pastel palette of peach, soft mint (#86efac), lavender (#f0abfc), warm cream (#fdfbf7), and sky blue clay layers with smooth, realistic shadows.", "noTextProse": "Ensure the model has absolutely no text, words, letters, labels, or UI buttons. Replace all keyboard key legends, screen details, or device interfaces with plain blank clay slabs of solid colors."},
        {"id": "style_papercut", "name": "The Papercut Stop-Motion", "category": "tactile", "colors": ["#fffbeb", "#2a1508", "#f472b6", "#38bdf8", "#4ade80"], "keywords": ["layered papercut textures", "stop-motion drop shadows"], "styleProse": "A highly tactile, dimensional papercut illustration. Multiple layers of physically textured cardstock and construction paper cutouts, stacked to create high depth. Features raw, fibrous paper edges, realistic drop shadows between paper layers, and a charming stop-motion layout aesthetic.", "paletteProse": "Warm, rich organic palette of soft parchment cream (#fffbeb), wood-grain brown (#2a1508), soft blossom pink (#f472b6), and forest green cardstock layers.", "noTextProse": "All paper pieces are cleanly cut and completely blank. No text, words, lettering, signatures, or printed characters of any kind may exist anywhere on the paper layers."},
        {"id": "style_film_noir", "name": "The Vintage Cellulose Film", "category": "vintage", "colors": ["#0a0a0a", "#f5f5f5", "#a3a3a3", "#525252", "#78716c"], "keywords": ["vintage cellulose film", "silver halide contrast"], "styleProse": "Vintage 1930s cinematic cellulose film photograph. Striking silver halide black-and-white contrast, heavy analog film-grain texture, organic dust scratches, and light leaks.", "paletteProse": "Rich monochromatic silver-halide palette ranging from dense celluloid black (#0a0a0a) to bright silver-white (#f5f5f5) and midtone stone grays (#a3a3a3), with a very subtle, warm archival sepia tint (#78716c).", "noTextProse": "Strictly exclude all readable print, document headings, numbers, and dates. All newspaper pages, text slides, and signs are blurry, illegible, or obscured by heavy film scratches and shadow overlays."}
    ]

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: compile_style_test_videos.py <style_id>")
        sys.exit(1)
    compile_style_video(sys.argv[1])
