#!/usr/bin/env python3
import sys
import os
import re
import json
import base64
import requests
import time

def main():
    print("=== STARTING AUTONOMOUS IMAGE GENERATION FOR VISUAL LIBRARY ===")
    
    # 1. Load Gemini API Key from .env.local
    env_path = "/Users/tharunk/Documents/Everyday struggles/autoYT/.env.local"
    if not os.path.exists(env_path):
        print("❌ Error: .env.local not found!")
        sys.exit(1)
        
    with open(env_path, "r", encoding="utf-8") as f:
        env_content = f.read()
        
    match_gemini = re.search(r"GEMINI_API_KEY\s*=\s*(.*)", env_content)
    if not match_gemini:
        print("❌ Error: GEMINI_API_KEY not found in .env.local")
        sys.exit(1)
        
    gemini_key = match_gemini.group(1).strip()
    
    # Create public directory if missing
    output_dir = "/Users/tharunk/Documents/Everyday struggles/autoYT/public/images/styles"
    os.makedirs(output_dir, exist_ok=True)
    
    # 2. Define our 16 visual styles and their representative scene prompts
    styles_prompts = [
        {
            "id": "style_kurzgesagt",
            "scene": "A giant glowing neutron star swallowing a surrounding cosmic nebula in deep space, with stylized geometric orbits.",
            "style": "Flat 2D minimalist vector graphic illustration in a clean, cosmic-explainer style. Perfectly geometric shapes, thick solid colored vector fills, smooth clean lines, and zero outlines. Characters must have simple black dot-eyes, clean limbs, and flat silhouettes. Highly vibrant, stylized compositions with absolute flat layering.",
            "palette": "Use a high-intensity cosmic neon-pastel palette of vibrant teal (#38bdf8), solar orange (#f97316), electric violet (#701a75), and deep cosmic void blue (#090d16) for backdrops. Completely flat shading with occasional soft vector gradients.",
            "notext": "STRICTLY BAN ALL WRITTEN TEXT, letters, labels, names, words, signs, numbers, or UI buttons from appearing anywhere in the image. If there are blackboards, computer screens, signs, or devices, depict only abstract neon lines, abstract glitch patterns, or symbolic drawings. NEVER render English text characters."
        },
        {
            "id": "style_caspian",
            "scene": "A detailed isometric blueprint diagram of a modern, multi-tiered solar farm and clean-energy grid network.",
            "style": "A clean flat vector isometric illustration drawn on a subtle geometric grid backdrop. Crisp outlines, detailed micro-isometric assets (buildings, vehicles, server racks, graphs), and structured multi-layered compositions showing clean structural flow or schematic pathways.",
            "palette": "Use a premium financial-analyst palette of deep slate blue background (#0f172a), crisp warm white (#f8fafc), bright emerald green (#10b981), and warning amber gold (#fbbf24) accents.",
            "notext": "The image must contain absolutely zero readable text: no words, letters, numbers, watermarks, tags, speech bubbles, captions, signs, or label tags inside the artwork. Every whiteboard, paper, device screen, sign, computer monitor, tablet, or book page must be completely clean, blank, and empty of any written or drawn letters. If any object would normally have writing on it, paint it as a pure solid color or an abstract blank form with absolutely no readable letters."
        },
        {
            "id": "style_polyphonic",
            "scene": "A minimalist paper-cut silhouette of an acoustic guitar player sitting under a massive crescent moon.",
            "style": "A high-contrast minimalist 2D silhouette collage. Bold organic shapes, dramatic paper-cut layers, and symbolic graphic designs. Characters are shown as elegant dark silhouettes against bright, textured, abstract backgrounds. High visual symbolism.",
            "palette": "High contrast retro-modern palette of deep charcoal black silhouettes (#18181b), textured sepia, aged cream (#fafafa), and a single striking focal accent like crimson red (#dc2626) or mustard yellow (#eab308).",
            "notext": "Strictly avoid any readable alphanumeric text, names, labels, letters, symbols, words, or speech bubbles. All textures and background elements are purely abstract shapes with zero legible print."
        },
        {
            "id": "style_cyber_glow",
            "scene": "A glowing luminescent neon green motherboard layout with complex PCB traces and laser cyan microprocessor grids.",
            "style": "Futuristic 2D cybernetic vector illustration with glowing wireframe outlines and luminescent laser lines. Complex PCB electronic layouts, glowing microchip connections, and holographic HUD graphics layered on top of deep-space backdrops.",
            "palette": "Electric high-intensity cyberpunk palette of pure pitch black (#000000), glowing laser cyan (#06b6d4), vibrant neon hot pink (#ec4899), and electric violet outlines. High self-luminescence values.",
            "notext": "Strictly ban all English characters, words, interface buttons, code, and text labels. Replace all screens, computer consoles, or digital interfaces with pure blank glowing neon shapes, abstract glowing scanlines, or concentric light circles."
        },
        {
            "id": "style_moebius",
            "scene": "A lone astronaut in a retro spacesuit standing before a massive, crumbling stone gate on the pink dunes of a desert planet.",
            "style": "Vintage 1970s analog sci-fi comic book illustration in the hand-drawn style of Moebius (Jean Giraud). Fine black ink cross-hatching, granular space-dust stippling, and flat desaturated color washes. Grand, surreal alien landscapes with massive ancient ruins and tiny explorers.",
            "palette": "Aged, faded analog palette of muted ochre (#ca8a04), dusty rose (#fb7185), sage green, and soft lavender. Heavy ink shadows with granular film-grain texture and off-white paper washes (#f1f5f9).",
            "notext": "Do not render any text, characters, words, letters, signatures, speech bubbles, or captions. Keep the artwork entirely clean, representing pure retro speculative sci-fi illustrations."
        },
        {
            "id": "style_dark_academia",
            "scene": "An antique mahogany writing desk in a dimly lit, dusty library, with a burning candle casting soft amber shadows over leather-bound books.",
            "style": "A rich Chiaroscuro oil painting with expressive brushstrokes and thick impasto textures. Deep classical contrast, soft volumetric candle-light, and dark shadows. Romantic, melancholic scenery (dimly lit libraries, old clocks, autumn windows).",
            "palette": "Rich academic palette of mahogany brown, deep forest green (#15803d), dark stone charcoal (#1c1917), amber candlelight glow (#b45309), and soft book-page warm ivory (#f5f5f4).",
            "notext": "Every single book page, canvas, scroll, or stone wall must be completely blank, carrying zero letters, words, writing, or signatures. All background books are depicted as plain colored leather blocks with no titles."
        },
        {
            "id": "style_ghibli",
            "scene": "A cozy rustic cottage nestled in a lush, blooming meadow, with soft clouds floating in a sunny blue sky.",
            "style": "Cozy, nostalgic hand-painted watercolor illustration in the artistic style of Studio Ghibli. Soft, fluid watercolor washes, gentle bleeding edges, light charcoal pencil outlines, and double exposure lush natural greenery. Volumetric sunlight filtering through tree leaves (komorebi), casting soft dappled shadows.",
            "palette": "Cheerful, warm pastel-nature color palette of soft dandelion yellow (#fef08a), meadow sage green (#4ade80), warm sky blue (#60a5fa), and soft tomato red accents, washed over vintage white canvas.",
            "notext": "Strictly exclude all forms of text, lettering, numbers, signs, and labels. Devices, books, or posters are painted as simple abstract organic blocks with no symbols or alphabet."
        },
        {
            "id": "style_retro_cartoon",
            "scene": "A friendly robot serving warm coffee to a smiling vintage television in a cozy retro-futuristic living room.",
            "style": "Warm and cheerful flat vector illustrations in a lively mid-century modern cartoon style. Bright, sunny, and easy-going visual aesthetics, crisp clean vector lines, soft organic shapes, and a cozy warm ambiance. Strictly avoid deep shadows, cyberpunk neon glow, dark tech grids, or gritty textures. Every frame should feel warm, nice, and inviting.",
            "palette": "Use a bright, cozy pastel-pop color palette centered on soft butter-cream (#fffbeb), crisp warm white, cheerful rose-coral (#fb7185), sunny amber gold (#f59e0b), and light sage teal (#34d399). Shadows are soft warm tan or light beige, never black or purple.",
            "notext": "STRICTLY BAN ALL WRITTEN TEXT, letters, labels, names, words, signs, numbers, or UI buttons from appearing anywhere in the image. If there are blackboards, computer screens, signs, or devices, depict only abstract neon lines, abstract glitch patterns, or symbolic drawings. NEVER render English text characters."
        },
        {
            "id": "style_lemmino",
            "scene": "A dark, smoky interrogation room with a single overhead spotlight illuminating a vintage folder on a metallic desk.",
            "style": "A moody, high-end cinematic photograph with deep shadows and sharp, highly dramatic volumetric lighting. Extreme detail, smoky noir atmospheric haze, and Chiaroscuro composition. Objects appear as premium historical artifacts or dark mystery files.",
            "palette": "Ultra-premium dark palette of pitch black (#020617), slate gray, and steel blue with sharp glowing amber-gold (#b45309) or crimson-red (#e11d48) volumetric key lighting.",
            "notext": "Do not paint or include any readable letters, file labels, documents titles, dates, or signs. Keep all paper surfaces, folders, blackboards, or screens completely empty of writing, utilizing only blurred graphic textures or pure shadows."
        },
        {
            "id": "style_sepia_history",
            "scene": "An archival scrapbook layout combining vintage map fragments of ancient Rome, oxidized coins, and old sepia drawings.",
            "style": "An archival historical mixed-media collage. Old daguerreotype photo cutouts, aged tea-stained maps, vintage newspaper borders, and charcoal sketches layered on top of each other. Rich paper textures, coffee stains, and realistic worn-paper edges.",
            "palette": "Muted historical palette of sepia (#d6d3d1), dark charcoal (#1c1917), aged cream, parchment tan, and washed-out oxidized teal or copper accents (#78350f).",
            "notext": "Strictly omit all readable dates, numbers, map labels, or newspaper headlines. All text blocks are rendered as blurred parallel ink lines, abstract cursive squiggles, or worn, unreadable ink stains."
        },
        {
            "id": "style_whiteboard",
            "scene": "A clean, hand-sketched whiteboard diagram showing lightbulbs, gears, and conceptual line-art figures collaborating.",
            "style": "High-contrast whiteboard marker animation style illustration. Pure, crisp white whiteboard background, bold hand-sketched black marker outlines, and minimal colored marker fills. Characters are playful, cartoonish, expressive line-art figures interacting with diagrammatic icons, gears, and conceptual doodles.",
            "palette": "Stark, high-contrast palette of solid whiteboard white (#ffffff), dry-erase marker black (#000000), and singular marker highlights of crimson red (#ef4444), royal blue (#3b82f6), or green, utilizing clean felt-tip textures.",
            "notext": "Do not write any actual text, words, labels, or letters on the whiteboard or inside speech bubbles. Represent all notes, equations, and details as abstract squiggly lines, symbolic charts, geometric equations, or visual doodles."
        },
        {
            "id": "style_pixel_art",
            "scene": "A cozy bedroom window sill on a rainy night, with a retro monitor glowing and city neon lights reflecting in puddles outside.",
            "style": "Nostalgic 16-bit retro pixel art illustration with clean grid outlines and dithered color gradients. Rich indoor/outdoor lofi scenes (cozy bedrooms with glowing CRT monitors, rainy window sills, cyber-streets). High texture detail utilizing small, clean colored square pixels.",
            "palette": "Warm, atmospheric retro-arcade palette of deep indigo backgrounds (#110c1f), glowing amethyst violet (#a855f7), neon pink highlights (#ec4899), console blue, and silver-grey pixel shading (#e2e8f0).",
            "notext": "All CRT screens, console menus, or posters are filled with blank pixel blocks or abstract colored pixel shapes with absolutely zero legible letters or English characters."
        },
        {
            "id": "style_sticker",
            "scene": "A playful collage of floating die-cut stickers depicting a juicy watermelon, a golden honey pot, and a retro camera.",
            "style": "A playful flat 2D sticker-art collage. Richly detailed cartoon objects and characters rendered as thick die-cut stickers with a clean, solid white outer border. The stickers float dynamically on a warm solid-color pastel background, casting subtle, realistic drop-shadows.",
            "palette": "Bright, cheerful pastel-pop palette of soft cream background (#fafaf9), sunny yellow (#fbbf24), sweet pink (#f43f5e), and soft turquoise (#2dd4bf) stickers.",
            "notext": "Ensure no text, lettering, or alphabet characters appear inside the stickers or on the background. Logos on stickers are converted into abstract vector patterns or shapes."
        },
        {
            "id": "style_claymation",
            "scene": "A clean, rounded low-poly clay model of a modern laptop, a small green succulent plant, and a warm desk lamp.",
            "style": "A gorgeous, highly tactile 3D isometric illustration in a smooth claymation style. Low-poly, rounded plasticine clay assets, soft matte clay textures, and warm studio lighting with realistic soft depth-of-field blur. Looks like a physically handcrafted clay model.",
            "palette": "Cozy matte pastel palette of peach, soft mint (#86efac), lavender (#f0abfc), warm cream (#fdfbf7), and sky blue clay layers with smooth, realistic shadows.",
            "notext": "Ensure the model has absolutely no text, words, letters, labels, or UI buttons. Replace all keyboard key legends, screen details, or device interfaces with plain blank clay slabs of solid colors."
        },
        {
            "id": "style_papercut",
            "scene": "A tactile layered construction paper landscape of a warm forest sunset, with sharp paper drop shadows.",
            "style": "A highly tactile, dimensional papercut illustration. Multiple layers of physically textured cardstock and construction paper cutouts, stacked to create high depth. Features raw, fibrous paper edges, realistic drop shadows between paper layers, and a charming stop-motion layout aesthetic.",
            "palette": "Warm, rich organic palette of soft parchment cream (#fffbeb), wood-grain brown (#2a1508), soft blossom pink (#f472b6), and forest green cardstock layers. Soft ambient studio light casting distinct shadows.",
            "notext": "All paper pieces are cleanly cut and completely blank. No text, words, lettering, signatures, or printed characters of any kind may exist anywhere on the paper layers."
        },
        {
            "id": "style_film_noir",
            "scene": "A dramatic 1930s film noir scene of a lone figure under a street lamp on a wet, foggy cobblestone street.",
            "style": "Vintage 1930s cinematic cellulose film photograph. Striking silver halide black-and-white contrast, heavy analog film-grain texture, organic dust scratches, and light leaks. Moody, dramatic old Hollywood chiaroscuro lighting casting high-contrast shadows.",
            "palette": "Rich monochromatic silver-halide palette ranging from dense celluloid black (#0a0a0a) to bright silver-white (#f5f5f5) and midtone stone grays (#a3a3a3), with a very subtle, warm archival sepia tint (#78716c).",
            "notext": "Strictly exclude all readable print, document headings, numbers, and dates. All newspaper pages, text slides, and signs are blurry, illegible, or obscured by heavy film scratches and shadow overlays."
        }
    ]
    
    # 3. Request Image from Google Gemini API
    # Since we want widescreen 16:9 images, we invoke Gemini AI Studio generateImages via Imagen 4.0
    url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:generateImages?key={gemini_key}"
    
    headers = {
        "Content-Type": "application/json"
    }
    
    for idx, s in enumerate(styles_prompts):
        style_id = s["id"]
        img_path = os.path.join(output_dir, f"{style_id}.png")
        
        # Avoid duplicate generation to save rate limits
        if os.path.exists(img_path) and os.path.getsize(img_path) > 1000:
            print(f"👉 [{idx+1}/16] {style_id}.png already exists on disk. Skipping.")
            continue
            
        # Combine parameters to form a flawless style prompt
        full_prompt = (
            f"Draw a single widescreen 16:9 cartoon illustration filling the entire frame edge to edge. "
            f"Scene: {s['scene']}. "
            f"{s['style']} {s['palette']} {s['notext']}"
        )
        
        print(f"🚀 [{idx+1}/16] Generating image for '{style_id}'...")
        payload = {
            "prompt": full_prompt,
            "numberOfImages": 1,
            "aspectRatio": "16:9",
            "outputMimeType": "image/png"
        }
        
        # Retry logic for network fluctuations
        attempts = 3
        success = False
        for attempt in range(1, attempts + 1):
            try:
                res = requests.post(url, headers=headers, data=json.dumps(payload), timeout=45)
                if res.status_code == 200:
                    data = res.json()
                    first_img = data.get("generatedImages", [{}])[0]
                    b64_bytes = first_img.get("image", {}).get("imageBytes")
                    
                    if b64_bytes:
                        # Write PNG file directly to disk
                        with open(img_path, "wb") as png:
                            png.write(base64.b64decode(b64_bytes))
                        print(f"   ✓ Saved preview image successfully to: {img_path}")
                        success = True
                        break
                    else:
                        print(f"   ⚠️ Warning [Attempt {attempt}]: No imageBytes returned. filtered reason: {first_img.get('raiFilteredReason')}")
                else:
                    print(f"   ⚠️ Warning [Attempt {attempt}]: HTTP {res.status_code} - {res.text[:300]}")
            except Exception as e:
                print(f"   ⚠️ Exception [Attempt {attempt}]: {e}")
            time.sleep(2)
            
        if not success:
            print(f"❌ Failed to generate preview image for '{style_id}' after {attempts} attempts.")
            
    print("\n🎉=======================================================")
    print("🎉 ALL 16 GRAPHIC STILL PREVIEWS ARE COMPILED & READY!")
    print("=========================================================")

if __name__ == "__main__":
    main()
