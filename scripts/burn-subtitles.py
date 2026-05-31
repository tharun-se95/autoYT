#!/usr/bin/env python3
import sys
import os
import re
import json
import requests
import subprocess
import shutil
import time
import pysubs2
from faster_whisper import WhisperModel

# SubStation Alpha (ASS) Color converter: Hex (#RRGGBB) -> ASS format (&HBBGGRR&)
# Note: ASS uses BGR ordering instead of RGB, and adds alpha/formatting symbols.
def hex_to_ass_color(hex_str, alpha_hex="00"):
    hex_clean = hex_str.strip().replace("#", "")
    if len(hex_clean) == 3:
        hex_clean = "".join(c*2 for c in hex_clean)
    if len(hex_clean) != 6:
        return "&H00FFFFFF&" # Fallback to solid white
        
    r = hex_clean[0:2]
    g = hex_clean[2:4]
    b = hex_clean[4:6]
    return f"&H{alpha_hex}{b}{g}{r}&"

def main():
    if len(sys.argv) < 3:
        print("Usage: burn-subtitles.py <input_mp4_path> <output_mp4_path> [channel_id]")
        sys.exit(1)
        
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    channel_id = sys.argv[3] if len(sys.argv) > 3 else "default"

    if not os.path.exists(input_path):
        print(f"❌ Error: Input video file not found: {input_path}")
        sys.exit(1)

    # Use the pre-compiled, fully-loaded static FFmpeg binary
    ffmpeg_path = "/Users/tharunk/Documents/Everyday struggles/autoYT/node_modules/ffmpeg-static/ffmpeg"

    # Detect video dimensions first
    width, height = None, None
    is_vertical = False
    try:
        cmd = [ffmpeg_path, "-i", input_path]
        res = subprocess.run(cmd, capture_output=True, text=True)
        match = re.search(r",\s*(\d+)x(\d+)", res.stderr)
        if match:
            width = int(match.group(1))
            height = int(match.group(2))
            is_vertical = (height > width)
    except Exception as e:
        print(f"   ⚠️ Dimension detection failed: {e}")

    if width and height:
        print(f"   🎥 Detected resolution: {width}x{height} | Aspect: {'Vertical/Shorts (9:16)' if is_vertical else 'Widescreen/Long-form (16:9)'}")
    else:
        width, height = 1920, 1080
        is_vertical = False
        print(f"   🎥 Using fallback resolution: 1920x1080 | Aspect: Widescreen/Long-form (16:9)")

    # 1. Fetch channel styles from Supabase
    print(f"🌐 Resolving branding colors for channel: '{channel_id}'...")
    env_path = "/Users/tharunk/Documents/Everyday struggles/autoYT/.env.local"
    
    # Load defaults
    palette = ["#0f172a", "#f8fafc", "#10b981", "#fbbf24"] # Slate, off-white, emerald, gold
    font_name = "Arial Black"

    # Check database overrides
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            env_content = f.read()
        match_url = re.search(r"NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)", env_content)
        match_key = re.search(r"SUPABASE_SECRET_KEY\s*=\s*(.*)", env_content)
        if match_url and match_key:
            sb_url = match_url.group(1).strip()
            sb_key = match_key.group(1).strip()
            headers = {"apikey": sb_key, "Authorization": f"Bearer {sb_key}"}
            
            try:
                res = requests.get(f"{sb_url}/rest/v1/channels?id=eq.{channel_id}", headers=headers)
                if res.status_code == 200 and res.json():
                    chan_row = res.json()[0]
                    palette = chan_row.get("palette_hex", palette)
                    print(f"   ✓ Loaded custom palette from Supabase: {palette}")
                    
                    # Adapt font style based on channel niche/personality
                    if channel_id == "ch_cosmic_archive":
                        font_name = "Impact"
                    elif channel_id == "ch_existential_whispers":
                        font_name = "Georgia"
                    elif channel_id == "ch_techno_bytes":
                        font_name = "Arial Black"
                    elif channel_id == "ch_wealth_blueprint":
                        font_name = "Montserrat"
            except Exception as e:
                print(f"   ⚠️ Could not load database config, using local fallbacks: {e}")

    # Extract colors from palette
    primary_color_hex = palette[1] if len(palette) > 1 else "#f8fafc"
    highlight_color_hex = palette[2] if len(palette) > 2 else "#10b981"
    if channel_id == "ch_wealth_blueprint" and len(palette) > 3:
        highlight_color_hex = palette[3] # Gold yellow
        
    outline_color_hex = palette[0] if len(palette) > 0 else "#0f172a"

    # Dynamic styling and scaling parameters based on aspect ratio
    if is_vertical:
        # SHORT-FORM / SHORTS / REELS (9:16)
        # Big, bold, centered-ish, fast kinetic pacing
        if font_name == "Impact":
            font_size = int(height * 0.052)
        elif font_name == "Georgia":
            font_size = int(height * 0.042)
        elif font_name == "Arial Black":
            font_size = int(height * 0.048)
        else: # Montserrat / standard
            font_size = int(height * 0.046)
            
        y_margin = int(height * 0.25) # Centered lower-third area to stay clear of TikTok/Insta UI
        outline_thickness = 4.0
        chunk_size = 3 # Rapid 3-word chunks
    else:
        # LONG-FORM / WIDESCREEN / TEST VIDEOS (16:9)
        # Small, elegant, bottom-aligned, clean non-intrusive cinematic pacing
        if font_name == "Impact":
            font_size = int(height * 0.030) # ~32px on 1080p, ~64px on 4K
        elif font_name == "Georgia":
            font_size = int(height * 0.024) # ~26px on 1080p, ~52px on 4K
        elif font_name == "Arial Black":
            font_size = int(height * 0.028) # ~30px on 1080p, ~60px on 4K
        else: # Montserrat / standard
            font_size = int(height * 0.026) # ~28px on 1080p, ~56px on 4K
            
        y_margin = int(height * 0.08) # Neatly tucked at bottom (approx 86px on 1080p)
        outline_thickness = 2.0
        chunk_size = 5 # Standard 5-word chunks for easy, non-distracting reading

    ass_primary = hex_to_ass_color(primary_color_hex)
    ass_highlight = hex_to_ass_color(highlight_color_hex)
    ass_outline = hex_to_ass_color(outline_color_hex)

    print(f"   Style Specs: Font={font_name} | Size={font_size}px | MarginV={y_margin} | Chunk={chunk_size} | Outline={outline_thickness}")
    print(f"   Colors: Primary={primary_color_hex} | Highlight={highlight_color_hex} | Outline={outline_color_hex}")

    # 2. Local transcription using faster-whisper (high-speed CPU/GPU run)
    print("\n🎧 Transcribing audio track locally via faster-whisper...")
    model_name = "base"
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    
    segments, info = model.transcribe(input_path, word_timestamps=True, beam_size=5)
    
    all_words = []
    for segment in segments:
        for w in segment.words:
            all_words.append({
                "word": w.word.strip(),
                "start": w.start,
                "end": w.end
            })
            
    print(f"   ✓ Transcribed {len(all_words)} words! Audio language: {info.language}")

    if not all_words:
        print("⚠️ Warning: No words transcribed. Copying source video directly.")
        shutil.copy2(input_path, output_path)
        sys.exit(0)

    # 3. Compile Word-by-Word Kinetic SubStation Alpha Subtitles (.ass) using pysubs2
    print("\n✍️ Compiling kinetic, word-by-word highlighted ASS subtitles...")
    subs = pysubs2.SSAFile()
    
    # Define style block
    style = pysubs2.SSAStyle()
    style.fontname = font_name
    style.fontsize = font_size
    
    # Custom color parser for pysubs2 Color objects
    def parse_hex_to_rgb(hex_str):
        h = hex_str.replace("#", "").strip()
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        
    pr, pg, pb = parse_hex_to_rgb(primary_color_hex)
    out_r, out_g, out_b = parse_hex_to_rgb(outline_color_hex)
    
    style.primarycolor = pysubs2.Color(pr, pg, pb, 0)
    style.outlinecolor = pysubs2.Color(out_r, out_g, out_b, 0)
    style.backcolor = pysubs2.Color(0, 0, 0, 0) # fully transparent
    style.bold = True
    style.outline = outline_thickness
    style.shadow = 1.0
    style.alignment = 2 # Bottom-center alignment
    style.marginv = y_margin # Vertical margin from bottom
    subs.styles["Default"] = style

    # Group words into chunks
    for idx in range(0, len(all_words), chunk_size):
        chunk = all_words[idx : idx + chunk_size]
        if not chunk:
            continue
            
        line_start_ms = int(chunk[0]["start"] * 1000)
        line_end_ms = int(chunk[-1]["end"] * 1000)
        
        # Display the chunk, highlighting the currently active word
        for active_idx, active_word in enumerate(chunk):
            word_start_ms = int(active_word["start"] * 1000)
            word_end_ms = int(active_word["end"] * 1000)
            
            text_parts = []
            for w_idx, w in enumerate(chunk):
                word_text = w["word"]
                if w_idx == active_idx:
                    text_parts.append(f"{{\\c{ass_highlight}}}{word_text}{{\\c}}")
                else:
                    text_parts.append(f"{{\\c{ass_primary}}}{word_text}{{\\c}}")
                    
            full_line_text = " ".join(text_parts)
            
            # Create dialogue event line for this word's timing slice
            event = pysubs2.SSAEvent(
                start=word_start_ms,
                end=word_end_ms,
                text=full_line_text
            )
            subs.append(event)

    temp_ass_path = f"subtitles-{int(time.time())}.ass"
    subs.save(temp_ass_path)
    print(f"   ✓ Subtitle script compiled and saved temporarily to: {temp_ass_path}")

    # 4. Burn subtitles onto video using FFmpeg
    print("\n🎬 Burning kinetic subtitles into MP4 container via FFmpeg subtitles filter...")
    tmp_out = f"export-subtitled-{int(time.time())}.mp4"
    
    escaped_ass = temp_ass_path.replace(":", "\\:").replace("'", "'\\\\''")
    
    burn_cmd = [
        ffmpeg_path, "-y", "-i", input_path,
        "-vf", f"subtitles=filename={temp_ass_path}",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
        "-c:a", "copy", # Copy untouched lossless master audio
        "-movflags", "+faststart",
        tmp_out
    ]
    
    res = subprocess.run(burn_cmd, capture_output=True, text=True)
    
    # Clean up temporary subtitle file
    if os.path.exists(temp_ass_path):
        os.remove(temp_ass_path)
        
    if res.returncode == 0:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        shutil.move(tmp_out, output_path)
        print("\n🎉=======================================================")
        print("🎉 SUCCESS! THE KINETIC-SUBTITLED VIDEO IS READY!")
        print("=========================================================")
        print(f"Output Path: {output_path}")
        print(f"File Size:   {os.path.getsize(output_path) / (1024*1024):.2f} MB")
        print("=========================================================")
    else:
        print("❌ Subtitle burning failed:")
        print(res.stderr)
        if os.path.exists(tmp_out):
            os.remove(tmp_out)
        sys.exit(1)

if __name__ == "__main__":
    main()
