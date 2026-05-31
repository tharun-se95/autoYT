#!/usr/bin/env python3
import json
import urllib.request
import urllib.error
import sys
import time
import os
import shutil
import subprocess

def post_json_with_retry(url, data, max_attempts=5, delay=5):
    for attempt in range(max_attempts):
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as res:
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode('utf-8', errors='ignore')
            print(f"      ⚠️ [Attempt {attempt+1}/{max_attempts}] HTTP Error {e.code}: {err_msg}")
            if attempt == max_attempts - 1:
                print("      ❌ Max attempts reached. Exiting.")
                sys.exit(1)
            print(f"      🔄 Retrying in {delay} seconds...")
            time.sleep(delay)
        except Exception as e:
            print(f"      ⚠️ [Attempt {attempt+1}/{max_attempts}] Connection Error: {e}")
            if attempt == max_attempts - 1:
                print("      ❌ Max attempts reached. Exiting.")
                sys.exit(1)
            print(f"      🔄 Retrying in {delay} seconds...")
            time.sleep(delay)
    return {}

def normalize_act_id(act_id):
    a = act_id.lower().strip()
    if "mess" in a or "act1" in a or "act_1" in a:
        return "mess"
    if "deep" in a or "act2" in a or "act_2" in a:
        return "deep_dive"
    if "mirror" in a or "act3" in a or "act_3" in a:
        return "mirror"
    if "forward" in a or "act4" in a or "act_4" in a or "way" in a:
        return "way_forward"
    return act_id

def main():
    video_id = "overthinking-widescreen-short-test"
    # A highly-focused, extremely short 30-45 second widescreen concept (only 2 acts, 1 block each)
    brief_text = (
        "Write a 45-second video. ONLY 2 acts total. "
        "Act 1: mess (1 short block: the mental trap of overthinking). "
        "Act 2: way_forward (1 short block: subtractive liberation - letting space be empty). "
        "Keep narration under 120 words total."
    )
    
    root_dir = "/Users/tharunk/Documents/Everyday struggles/autoYT/local-assets"
    script_path = os.path.join(root_dir, "vis-stills", video_id, "script.json")
    
    print("=========================================================")
    print("🎬 FAST 45-SECOND WIDESCREEN PIPELINE GENERATOR (RESUME) 🎬")
    print("=========================================================")
    
    # 1. Load or Generate Script
    script = None
    if os.path.exists(script_path):
        print(f"📂 [RESUME] Found existing script.json on disk at {script_path}. Loading...")
        try:
            with open(script_path, "r", encoding="utf-8") as f:
                script = json.load(f)
            print("✓ Script Loaded successfully from disk!")
        except Exception as e:
            print(f"⚠️ Failed to read existing script: {e}. Re-generating...")
            
    if script is None:
        print(f"STAGE 1: GENERATING SHORT SCRIPT...")
        script_payload = {
            "episodeBrief": brief_text,
            "videoId": video_id,
            "mode": "test"
        }
        res = post_json_with_retry("http://localhost:3000/api/studio/script/generate", script_payload)
        if not res.get("ok"):
            print("Script generation failed:", res)
            sys.exit(1)
        script = res["script"]
        print(f"✓ Script Generated successfully!")
        
    title = script.get("workingTitle", "Overthinking Short Test")
    print(f"Title: {title}")
    
    # Normalize act IDs permanently inside script and save
    for act in script.get("acts", []):
        act["actId"] = normalize_act_id(act["actId"])
    
    os.makedirs(os.path.dirname(script_path), exist_ok=True)
    with open(script_path, "w", encoding="utf-8") as f:
        json.dump(script, f, indent=2, ensure_ascii=False)
        
    # 2. Iterate and generate assets (audio and stills)
    print("\n=========================================================")
    print("STAGE 2: GENERATING AUDIO AND STORYBOARD STILLS PER BLOCK")
    print("=========================================================")
    
    for act in script.get("acts", []):
        act_id = act["actId"]
        act_title = act.get("displayTitle", act_id)
        print(f"\n👉 Act: {act_id.upper()} - {act_title}")
        
        for block_idx, block in enumerate(act.get("narrationBlocks", [])):
            print(f"  └─ Block {block_idx}: '{block['narration'][:50]}...' ({len(block['narration'])} chars)")
            
            # A. Check and Generate Audio (per-block narration)
            audio_rel_path = f"narration-audio/{video_id}/{act_id}-{block_idx:04d}.wav"
            audio_abs_path = os.path.join(root_dir, audio_rel_path)
            audio_rel_path_mp3 = f"narration-audio/{video_id}/{act_id}-{block_idx:04d}.mp3"
            audio_abs_path_mp3 = os.path.join(root_dir, audio_rel_path_mp3)
            
            if os.path.exists(audio_abs_path) or os.path.exists(audio_abs_path_mp3):
                print(f"    🔊 [SKIP] Narration audio already exists on disk. Skipping.")
            else:
                audio_payload = {
                    "videoId": video_id,
                    "actId": act_id,
                    "blockIndex": block_idx,
                    "narration": block["narration"],
                    "workingTitle": title
                }
                print(f"    🔊 Generating TTS Narration...")
                audio_res = post_json_with_retry("http://localhost:3000/api/studio/audio/tts/block", audio_payload)
                if audio_res.get("ok"):
                    segment = audio_res["segment"]
                    print(f"    ✓ Audio segment saved to: {segment['localRelativePath']}")
                else:
                    print(f"    % [FALLBACK] Attempting with no-system folded...")
                    sys.exit(1)
                
            # B. Check and Generate Stills (per-beat illustrations)
            beats = block.get("visualBeats", [])
            print(f"    🖼️ Generating storyboard still(s)... ({len(beats)} beats)")
            for beat_idx, beat in enumerate(beats):
                still_index = block_idx * 100 + beat_idx
                still_rel_path = f"vis-stills/{video_id}/{act_id}-{still_index:04d}.png"
                still_abs_path = os.path.join(root_dir, still_rel_path)
                still_rel_path_webp = f"vis-stills/{video_id}/{act_id}-{still_index:04d}.webp"
                still_abs_path_webp = os.path.join(root_dir, still_rel_path_webp)
                
                if os.path.exists(still_abs_path) or os.path.exists(still_abs_path_webp):
                    print(f"      ├─ Beat {beat_idx} [index {still_index}]: [SKIP] Still already exists on disk. Skipping.")
                else:
                    still_payload = {
                        "videoId": video_id,
                        "actId": act_id,
                        "blockIndex": still_index,
                        "visualDescription": beat["visualDescription"],
                        "workingTitle": title,
                        "force": True
                    }
                    print(f"      ├─ Beat {beat_idx} [index {still_index}]: Phrase: '{beat['phrase']}'")
                    print(f"      │  Prose: '{beat['visualDescription'][:50]}...'")
                    print(f"      │  Generating still via Imagen 3...")
                    
                    still_res = post_json_with_retry("http://localhost:3000/api/studio/visuals/generate", still_payload)
                    if still_res.get("ok"):
                        still = still_res["still"]
                        print(f"      │  ✓ Widescreen still saved to: {still['localRelativePath']}")
                    else:
                        print(f"      │  ✗ Still generation failed: {still_res}")
                        sys.exit(1)
                        
    # 3. Assemble and Export Base Video
    print("\n=========================================================")
    print("STAGE 3: ASSEMBLING & COMPILING PORTION")
    print("=========================================================")
    export_payload = {
        "videoId": video_id,
        "workingTitle": title,
        "force": True
    }
    print("🎬 Initiating FFmpeg compilation & Ken Burns rendering...")
    export_res = post_json_with_retry("http://localhost:3000/api/studio/visuals/export", export_payload)
    if not export_res.get("ok"):
        print("Export failed:", export_res)
        sys.exit(1)
        
    base_video_path = os.path.join(root_dir, export_res["relativePath"])
    print(f"✓ Base video compiled successfully at: {base_video_path}")
    
    # 4. Copy and Mix Background Music
    print("\n=========================================================")
    print("STAGE 4: SOUND-DESIGN MIXING (ADDING THE STOIC AMBIENT BED)")
    print("=========================================================")
    
    seagate_music_src = "/Volumes/Seagate/film-agent-app/public/assets/library/ca66f5e44a5564e2b7bacfac3196a106.mp3"
    local_music_dest = os.path.join(root_dir, "bg_music.mp3")
    
    if os.path.exists(seagate_music_src):
        print(f"🎵 [SOUND DESIGN] Copying premium ambient track from Seagate SSD...")
        shutil.copy2(seagate_music_src, local_music_dest)
        print("✓ Copied track successfully to local assets!")
    else:
        print("⚠️ Warning: Seagate B-roll music track not found. Skipping mixing.")
        sys.exit(0)
        
    output_mixed_path = os.path.join(root_dir, "vis-stills", video_id, "export", "assembly_mixed.mp4")
    os.makedirs(os.path.dirname(output_mixed_path), exist_ok=True)
    
    print("🎙️ Mixing ambient sound bed at -16dB with narration...")
    # FFmpeg complex filter: scale/mix bg audio with narration (inputs=2, duration=first)
    mix_cmd = [
        "ffmpeg", "-y", "-i", base_video_path, "-i", local_music_dest,
        "-filter_complex", "[1:a]volume=0.15[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[a]",
        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        output_mixed_path
    ]
    
    res = subprocess.run(mix_cmd, capture_output=True, text=True)
    if res.returncode == 0:
        print("\n🎉=======================================================")
        print("🎉 SUCCESS! THE SOUND-MIXED SHORT VIDEO ESSAY IS COMPLETE!")
        print("=========================================================")
        print(f"Mixed video path: {output_mixed_path}")
        print(f"Size: {os.path.getsize(output_mixed_path) / (1024*1024):.2f} MB")
        print("=========================================================")
    else:
        print("❌ Audio mixing failed:")
        print(res.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
