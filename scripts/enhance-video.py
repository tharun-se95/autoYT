#!/usr/bin/env python3
import sys
import os
import re
import requests
import numpy as np
from moviepy import VideoFileClip

def main():
    if len(sys.argv) < 3:
        print("Usage: enhance-video.py <input_video_path> <output_video_path> [channel_id]")
        sys.exit(1)
        
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    channel_id = sys.argv[3] if len(sys.argv) > 3 else "default"

    if not os.path.exists(input_path):
        print(f"❌ Error: Input video not found: {input_path}")
        sys.exit(1)

    print(f"\n🎬 [MOVIEPY ENHANCER] Enhancing video: {input_path}")
    print(f"🌐 Loading styles for channel: '{channel_id}'...")
    
    # Defaults
    palette = ["#0f172a", "#f8fafc", "#10b981", "#fbbf24"] # Slate, off-white, emerald, gold
    env_path = "/Users/tharunk/Documents/Everyday struggles/autoYT/.env.local"

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
                    palette = res.json()[0].get("palette_hex", palette)
                    print(f"   ✓ Loaded channel palette: {palette}")
            except Exception as e:
                print(f"   ⚠️ Database query skipped, using defaults: {e}")

    highlight_hex = palette[2] if len(palette) > 2 else "#10b981"
    if channel_id == "ch_wealth_blueprint" and len(palette) > 3:
        highlight_hex = palette[3] # Gold yellow

    # Open video clip in MoviePy
    clip = VideoFileClip(input_path)
    width, height = clip.size
    duration = clip.duration
    is_vertical = (height > width)
    
    print(f"   🎥 Format: {'Vertical/Shorts (9:16)' if is_vertical else 'Widescreen/Long-form (16:9)'} | Resolution: {width}x{height} | Duration: {duration:.2f}s")

    # 1. Add Vector-Accelerated Retention Progress Bar Filter
    print("   📊 Generating dynamic, frame-level retention progress bar...")
    bar_height = 8 if is_vertical else 4
    y_start = height - bar_height
    
    # Parse hex color safely
    hex_clean = highlight_hex.replace("#", "").strip()
    if len(hex_clean) == 3:
        hex_clean = "".join(c*2 for c in hex_clean)
    if len(hex_clean) != 6:
        hex_clean = "10b981" # default emerald
    
    r = int(hex_clean[0:2], 16)
    g = int(hex_clean[2:4], 16)
    b = int(hex_clean[4:6], 16)
    fill_color = [r, g, b]
    bg_color = [30, 41, 59] # Slate grey background
    
    # Programmatic NumPy frame transformations are super-fast!
    def progress_bar_filter(gf, t):
        frame = gf(t).copy() # Get copy of RGB frame from get_frame(t)
        progress = min(1.0, t / duration)
        fill_width = int(width * progress)
        
        # Apply background bar
        frame[y_start:height, :, :] = bg_color
        
        # Apply filled progress bar
        if fill_width > 0:
            frame[y_start:height, 0:fill_width, :] = fill_color
            
        return frame

    enhanced_clip = clip.transform(progress_bar_filter)

    # Render enhanced video
    print(f"\n🚀 Rendering final video output to: {output_path}...")
    
    # Write output to file (preserves pristine copy of narration audio stream)
    enhanced_clip.write_videofile(
        output_path,
        codec="libx264",
        audio_codec="aac",
        preset="veryfast",
        threads=4,
        logger=None # suppress verbose proglog logs
    )
    
    # Clean up file handles
    clip.close()
    enhanced_clip.close()
    
    print("\n🎉=======================================================")
    print("🎉 SUCCESS! THE CINEMATIC ENHANCED MASTERPIECE IS READY!")
    print("=========================================================")
    print(f"Output Path: {output_path}")
    print(f"File Size:   {os.path.getsize(output_path) / (1024*1024):.2f} MB")
    print("=========================================================")

if __name__ == "__main__":
    main()
