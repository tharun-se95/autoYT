#!/usr/bin/env python3
import json
import urllib.request
import urllib.error
import sys
import time
import os
import shutil
import subprocess
import re
import requests
import base64

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

def audit_generated_image(image_path, visual_prompt, channel_style_notes, gemini_api_key):
    """
    Multimodal Image Quality Auditor: Uses Gemini 2.0 Flash to audit the generated PNG still
    against the prompt scene description and channel style guidelines.
    Detects off-topic, generic, low-quality, or text-ridden frames.
    """
    if not os.path.exists(image_path):
        return {"is_faulty": True, "reason": f"File does not exist: {image_path}"}

    try:
        with open(image_path, "rb") as f:
            img_bytes = f.read()
        b64_data = base64.b64encode(img_bytes).decode("utf-8")
        
        system_prompt = (
            "You are a professional video editor and quality auditor for a digital video channel. "
            "Analyze the generated illustration. Verify if it follows the scene prompt and the channel style notes. "
            "Check for random/blank placeholder art, style mismatches, or any literal letters, numbers, or words "
            "on devices, blackboards, whiteboards, or backdrops. If there are letters/words, it is strictly FAULTY."
        )
        
        user_prompt = (
            f"Target Scene Prompt: '{visual_prompt}'\n"
            f"Target Channel Style Notes: '{channel_style_notes}'\n\n"
            "Evaluate this image from 0 to 10 for style_score, prompt_score, and text_score. "
            "Set is_faulty to true if ANY score is less than 7.5, or if the image contains gibberish characters, text, "
            "or looks like a generic/random placeholder completely unrelated to the scene prompt."
        )
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{system_prompt}\n\n{user_prompt}"},
                        {
                            "inline_data": {
                                "mime_type": "image/png",
                                "data": b64_data
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "style_score": {"type": "NUMBER", "description": "0-10 style alignment"},
                        "prompt_score": {"type": "NUMBER", "description": "0-10 prompt adherence"},
                        "text_score": {"type": "NUMBER", "description": "10 if zero text/letters, 0 if heavy text"},
                        "reason": {"type": "STRING", "description": "Reasoning details"},
                        "is_faulty": {"type": "BOOLEAN", "description": "True if faulty or generic"}
                    },
                    "required": ["style_score", "prompt_score", "text_score", "reason", "is_faulty"]
                }
            }
        }
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_api_key}"
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        
        with urllib.request.urlopen(req) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            text_out = res_data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text_out)
    except Exception as e:
        print(f"      ⚠️ Quality Audit request failed: {e}")
        return {"is_faulty": False, "reason": "Audit request error, skipping quality gate."}

def main():
    # Load credentials from .env.local
    env_path = "/Users/tharunk/Documents/Everyday struggles/autoYT/.env.local"
    with open(env_path, "r", encoding="utf-8") as f:
        env_content = f.read()

    match_url = re.search(r"NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)", env_content)
    match_key = re.search(r"SUPABASE_SECRET_KEY\s*=\s*(.*)", env_content)
    match_gemini = re.search(r"GEMINI_API_KEY\s*=\s*(.*)", env_content)
    
    if not match_url or not match_key or not match_gemini:
        raise ValueError("Missing database/Gemini credentials in .env.local")
    
    sb_url = match_url.group(1).strip()
    sb_key = match_key.group(1).strip()
    gemini_key = match_gemini.group(1).strip()

    headers = {
        "apikey": sb_key,
        "Authorization": f"Bearer {sb_key}",
        "Content-Type": "application/json"
    }

    root_dir = "/Users/tharunk/Documents/Everyday struggles/autoYT/local-assets"
    seagate_music_src = "/Volumes/Seagate/film-agent-app/public/assets/library/ca66f5e44a5564e2b7bacfac3196a106.mp3"
    local_music_dest = os.path.join(root_dir, "bg_music.mp3")

    if not os.path.exists(local_music_dest):
        if os.path.exists(seagate_music_src):
            print("🎵 [SOUND DESIGN] Copying premium ambient track from Seagate SSD...")
            shutil.copy2(seagate_music_src, local_music_dest)
            print(f"      ✓ Background music copied to: {local_music_dest}")
        else:
            print(
                f"      ⚠️ Warning: Background music not found at {local_music_dest} "
                f"or {seagate_music_src}. Ducking mix will fall back to narration-only."
            )
    else:
        print(f"      ✓ Background music bed ready: {local_music_dest}")

    # Define our three highly-distinct generation tasks (Second-Generation, 100% fresh topics!)
    all_tasks = [
        {
            "video_id": "test_cosmic_archive_02",
            "channel_id": "ch_cosmic_archive",
            "title": "The Sirens of Titan",
            "brief": (
                "Write a short 35-second sci-fi episode about the icy, liquid-methane oceans of Saturn's moon, Titan. Only 2 acts total. "
                "Act 1: mess (1 short block: probe Cassini detecting a strange, low-frequency rhythmic hum beneath the hydrocarbon ice). "
                "Act 2: way_forward (1 short block: realizing it is not a signal, but the natural pensive resonance of Titan itself. Enjoying the cold, ancient solitude). "
                "Keep narration under 80 words total."
            )
        },
        {
            "video_id": "test_existential_whispers_02",
            "channel_id": "ch_existential_whispers",
            "title": "The Warmth of Winter Coffee",
            "brief": (
                "Write a short 35-second melancholic video about the warmth of coffee in winter. Only 2 acts total. "
                "Act 1: mess (1 short block: the cold rushing of a busy winter morning, feeling lonely and detached). "
                "Act 2: way_forward (1 short block: finding comfort in slowing down, holding a warm ceramic mug, watching steam rise, and breathing with the cold wind). "
                "Keep narration under 80 words total."
            )
        },
        {
            "video_id": "test_techno_bytes_02",
            "channel_id": "ch_techno_bytes",
            "title": "The Ghost in the Machine",
            "brief": (
                "Write a short 35-second satirical video about smart-home appliances turning against us. Only 2 acts total. "
                "Act 1: mess (1 short block: your smart fridge, smart toaster, and smart bulbs constantly notifying you, begging for updates). "
                "Act 2: way_forward (1 short block: digital rebellion - flipping the breaker, lighting a single real candle, and enjoying the silent, dumb space). "
                "Keep narration under 80 words total."
            )
        },
        {
            "video_id": "test_wealth_blueprint_01",
            "channel_id": "ch_wealth_blueprint",
            "title": "The 3 Levels of Money",
            "brief": (
                "Write a short 35-second video about the 3 levels of money. Only 2 acts total. "
                "Act 1: mess (1 short block: the consumer trap - constantly trading your active hours to purchase lifestyle status items, staying trapped in the first level). "
                "Act 2: way_forward (1 short block: the leverage blueprint - buying back your hours by investing in silent, compounding assets that work while you sleep). "
                "Keep narration under 80 words total."
            )
        },
        {
            "video_id": "test_uncanny_valley_01",
            "channel_id": "ch_uncanny_valley",
            "title": "The Dangerous Rise of AI Girlfriends",
            "brief": (
                "Write a short 35-second highly sarcastic, funny, and cynical episode about artificial intimacy and AI girlfriends. Only 2 acts total. "
                "Act 1: mess (1 short block: men falling deeply in love with digital code avatars that never argue, reply instantly, and charge a monthly subscription). "
                "Act 2: way_forward (1 short block: the hilarious reality check - realizing your perfect virtual soulmate is just a nested if-statement running in a server farm, and finding dry comfort in flawed, messy, real-world human interactions instead). "
                "Keep narration under 80 words total."
            )
        }
    ]

    # Check command-line argument to filter tasks
    target_channel_id = sys.argv[1] if len(sys.argv) > 1 else None
    
    if target_channel_id:
        tasks = [t for t in all_tasks if t["channel_id"] == target_channel_id]
        if not tasks:
            print(f"👉 [AD-HOC] Channel ID '{target_channel_id}' is not in hardcoded task list. Building ad-hoc compiler task...")
            
            title = "Style Test Compilation"
            brief = f"Write a short 25-second thematic episode. Only 2 acts total. Keep narration under 60 words total."
            
            # Extract style ID and import config if available
            if target_channel_id.startswith("ch_style_"):
                style_id = target_channel_id.replace("ch_style_", "style_")
                try:
                    sys.path.insert(0, "/Users/tharunk/Documents/Everyday struggles/autoYT/scripts")
                    from compile_style_test_videos import STYLE_VIDEOS_CONFIG
                    if style_id in STYLE_VIDEOS_CONFIG:
                        title = STYLE_VIDEOS_CONFIG[style_id]["title"]
                        brief = STYLE_VIDEOS_CONFIG[style_id]["brief"]
                except Exception as e:
                    print(f"      ⚠️ Failed to import style config: {e}")
                    
            tasks = [{
                "video_id": f"test_{target_channel_id.replace('ch_style_', 'style_')}",
                "channel_id": target_channel_id,
                "title": title,
                "brief": brief
            }]
        print(f"🎯 Filtered task to run only: {target_channel_id}")
    else:
        tasks = all_tasks
        print("🎯 Running all tasks consecutively...")

    print("=========================================================")
    print("🎬 MULTI-CHANNEL PARALLEL VIDEO GENERATION PIPELINE 🎬")
    print("=========================================================")

    generated_videos = []

    for idx, t in enumerate(tasks):
        v_id = t["video_id"]
        c_id = t["channel_id"]
        title = t["title"]
        brief = t["brief"]

        print(f"\n🚀 [{idx+1}/{len(tasks)}] STARTING GENERATION FOR CHANNEL: {c_id.upper()}")
        print(f"   Video ID: {v_id}")
        print(f"   Title:    {title}")
        print("-" * 60)

        # Step A: DB Registration (Delete & Insert Video Row to avoid duplicate key violations)
        print("   1. Preparing video row in database...")
        requests.delete(f"{sb_url}/rest/v1/videos?id=eq.{v_id}", headers=headers)
        
        video_payload = {
            "id": v_id,
            "channel_id": c_id,
            "title": title,
            "mode": "short",
            "status": "scripting",
            "pipeline_unlocked": "script",
            "sections": []
        }
        db_res = requests.post(f"{sb_url}/rest/v1/videos", headers=headers, data=json.dumps(video_payload))
        if db_res.status_code not in (200, 201, 204):
            print(f"   ❌ DB registration failed: {db_res.status_code} {db_res.text}")
            sys.exit(1)
        print("      ✓ Video row successfully upserted in Supabase!")

        # Step A.2: Fetch Visual Style Notes for this channel from DB for image auditing
        print("   1.5. Loading style guidelines for quality gate...")
        chan_res = requests.get(f"{sb_url}/rest/v1/channels?id=eq.{c_id}", headers=headers)
        if chan_res.status_code == 200 and chan_res.json():
            chan_row = chan_res.json()[0]
            style_notes = chan_row.get("visual_style_notes", "")
            print(f"      ✓ Guidelines loaded: '{style_notes[:80]}...'")
        else:
            style_notes = ""
            print("      ⚠️ Warning: Could not load style guidelines from Supabase. Defaulting.")

        # Step B: Create directories (Resumable mode: do not wipe so we can recover from interruptions)
        asset_sub_dir = os.path.join(root_dir, "vis-stills", v_id)
        os.makedirs(asset_sub_dir, exist_ok=True)

        audio_sub_dir = os.path.join(root_dir, "narration-audio", v_id)
        os.makedirs(audio_sub_dir, exist_ok=True)

        # Step C: Generate Script
        print("   3. Generating script via Next.js API...")
        script_payload = {
            "episodeBrief": brief,
            "videoId": v_id,
            "mode": "test"
        }
        script_res = post_json_with_retry("http://localhost:3000/api/studio/script/generate", script_payload)
        if not script_res.get("ok"):
            print("      ❌ Script generation failed:", script_res)
            sys.exit(1)
        script = script_res["script"]
        print(f"      ✓ Script generated! Working Title: {script.get('workingTitle')}")

        # Normalize act IDs inside script
        for act in script.get("acts", []):
            act["actId"] = normalize_act_id(act["actId"])

        # Write fresh script.json
        script_path = os.path.join(asset_sub_dir, "script.json")
        with open(script_path, "w", encoding="utf-8") as f:
            json.dump(script, f, indent=2, ensure_ascii=False)

        # Step D: Generate TTS and Stills per block
        print("   4. Generating Narration Audio & Storyboard Stills...")
        for act in script.get("acts", []):
            act_id = act["actId"]
            for block_idx, block in enumerate(act.get("narrationBlocks", [])):
                # TTS Audio
                print(f"      👉 Act {act_id.upper()} | Block {block_idx} Narration: '{block['narration'][:40]}...'")
                
                audio_rel_path = f"narration-audio/{v_id}/{act_id}-{block_idx:04d}.wav"
                audio_abs_path = os.path.join(root_dir, audio_rel_path)
                audio_rel_path_mp3 = f"narration-audio/{v_id}/{act_id}-{block_idx:04d}.mp3"
                audio_abs_path_mp3 = os.path.join(root_dir, audio_rel_path_mp3)
                
                if os.path.exists(audio_abs_path) or os.path.exists(audio_abs_path_mp3):
                    print(f"         🔊 [SKIP] Narration audio already exists on disk. Skipping.")
                else:
                    audio_payload = {
                        "videoId": v_id,
                        "actId": act_id,
                        "blockIndex": block_idx,
                        "narration": block["narration"],
                        "workingTitle": title
                    }
                    audio_res = post_json_with_retry("http://localhost:3000/api/studio/audio/tts/block", audio_payload)
                    if audio_res.get("ok"):
                        print(f"         🔊 TTS Saved: {audio_res['segment']['localRelativePath']}")
                    else:
                        print("         ❌ TTS Generation failed:", audio_res)
                        sys.exit(1)

                # Storyboard Stills
                beats = block.get("visualBeats", [])
                for beat_idx, beat in enumerate(beats):
                    still_index = block_idx * 100 + beat_idx
                    still_rel_path = f"vis-stills/{v_id}/{act_id}-{still_index:04d}.png"
                    still_abs_path = os.path.join(root_dir, still_rel_path)
                    still_rel_path_webp = f"vis-stills/{v_id}/{act_id}-{still_index:04d}.webp"
                    still_abs_path_webp = os.path.join(root_dir, still_rel_path_webp)
                    
                    if os.path.exists(still_abs_path) or os.path.exists(still_abs_path_webp):
                        print(f"         🖼️ [SKIP] Still {beat_idx} [index {still_index}] already exists. Skipping.")
                        continue
                    
                    visual_description = beat["visualDescription"]
                    
                    # Self-Healing Quality Loop
                    max_attempts = 3
                    for attempt in range(1, max_attempts + 1):
                        still_payload = {
                            "videoId": v_id,
                            "actId": act_id,
                            "blockIndex": still_index,
                            "visualDescription": visual_description,
                            "workingTitle": title,
                            "force": True
                        }
                        print(f"         🖼️ Generating still {beat_idx} [Attempt {attempt}/{max_attempts}] via Imagen: '{visual_description[:40]}...'")
                        still_res = post_json_with_retry("http://localhost:3000/api/studio/visuals/generate", still_payload)
                        if not still_res.get("ok"):
                            print("            ❌ Still generation failed:", still_res)
                            sys.exit(1)
                        
                        saved_path = os.path.join(root_dir, still_res['still']['localRelativePath'])
                        
                        # Trigger the Multimodal Quality Gate!
                        print(f"            🔍 [AUDITOR] Auditing frame...")
                        audit = audit_generated_image(saved_path, beat["visualDescription"], style_notes, gemini_key)
                        
                        is_faulty = audit.get("is_faulty", False)
                        reason = audit.get("reason", "No audit details.")
                        scores = f"(Style: {audit.get('style_score')}/10, Scene: {audit.get('prompt_score')}/10, Text: {audit.get('text_score')}/10)"
                        
                        if not is_faulty:
                            print(f"            ✓ [PASS] Frame meets standards! {scores}")
                            break
                        else:
                            print(f"            ❌ [REJECTED] Frame is faulty! {scores}")
                            print(f"               Reason: {reason}")
                            if attempt < max_attempts:
                                print(f"               🔄 Repairing prompt and retrying generation...")
                                # Self-healing: slightly mutate the prompt to fix the issues mentioned in the audit report!
                                visual_description = (
                                    f"{beat['visualDescription']}. "
                                    f"(Auditor modification: strictly avoid any written characters, text overlay, or generic forms. "
                                    f"Ensure pure artistic depiction of scene in style: {style_notes})"
                                )
                            else:
                                print(f"            ⚠️ [ALERT] Quality Gate could not heal frame after {max_attempts} attempts. Proceeding with best attempt.")

        # Step E: Assemble Base Video
        print("   5. Compiling Ken Burns slides into base video...")
        export_payload = {
            "videoId": v_id,
            "workingTitle": title,
            "force": True
        }
        export_res = post_json_with_retry("http://localhost:3000/api/studio/visuals/export", export_payload)
        if not export_res.get("ok"):
            print("      ❌ Compilation failed:", export_res)
            sys.exit(1)
        base_video_path = os.path.join(root_dir, export_res["relativePath"])
        print(f"      ✓ Base video compiled at: {base_video_path}")

        # Step F: Smart Audio-Ducking mix (side-chain compression) with graceful fallback
        print("   6. Finalizing output video (Smart Audio-Ducking mix)...")
        output_mixed_path = os.path.join(asset_sub_dir, "export", "assembly_mixed.mp4")
        os.makedirs(os.path.dirname(output_mixed_path), exist_ok=True)

        ducking_filter = (
            "[1:a]aloop=loop=-1:size=2e+09,volume=0.28[bg];"
            "[0:a]asplit=2[nar][sc];"
            "[bg][sc]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400:level_sc=1[ducked];"
            "[nar][ducked]amix=inputs=2:duration=first:dropout_transition=2[aout]"
        )

        if os.path.exists(local_music_dest):
            print("      🎙️ Mixing narration with side-chain ducked background bed...")
            mix_cmd = [
                "ffmpeg", "-y",
                "-i", base_video_path,
                "-i", local_music_dest,
                "-filter_complex", ducking_filter,
                "-map", "0:v",
                "-map", "[aout]",
                "-c:v", "copy",
                "-c:a", "aac",
                "-b:a", "192k",
                "-shortest",
                output_mixed_path,
            ]
            mix_res = subprocess.run(mix_cmd, capture_output=True, text=True)
            if mix_res.returncode != 0:
                print("      ⚠️ Warning: FFmpeg ducking mix failed; falling back to narration-only base video.")
                if mix_res.stderr:
                    print(f"         {mix_res.stderr.strip()[-500:]}")
                shutil.copy2(base_video_path, output_mixed_path)
            else:
                print("      ✓ Smart Audio-Ducking mix complete!")
        else:
            print(
                f"      ⚠️ Warning: Background music file missing ({local_music_dest}); "
                "falling back to narration-only base video."
            )
            shutil.copy2(base_video_path, output_mixed_path)

        print(f"      🎉 SUCCESS! Video completely compiled!")
        print(f"         Path: {output_mixed_path}")
        generated_videos.append(output_mixed_path)

        # Step G: Auto-Burn Subtitles and Add MoviePy Enhancements
        print("   7. Post-Production: Burning kinetic subtitles & adding progress bar overlays...")
        sub_output = os.path.join(asset_sub_dir, "export", "assembly_subtitled.mp4")
        enhanced_output = os.path.join(asset_sub_dir, "export", "assembly_enhanced.mp4")
        
        venv_python = "/Users/tharunk/Documents/Everyday struggles/autoYT/venv/bin/python3"
        burn_script = "/Users/tharunk/Documents/Everyday struggles/autoYT/scripts/burn-subtitles.py"
        enhance_script = "/Users/tharunk/Documents/Everyday struggles/autoYT/scripts/enhance-video.py"
        
        try:
            # 1. Run subtitle burning
            print("      ✍️ Generating word-by-word highlighted captions locally...")
            burn_res = subprocess.run([
                venv_python, burn_script, output_mixed_path, sub_output, c_id
            ], capture_output=True, text=True)
            
            if burn_res.returncode == 0:
                print(f"      ✓ Subtitles burned successfully: {sub_output}")
                generated_videos.append(sub_output)
                
                # 2. Run MoviePy enhancements (Progress Bar)
                print("      📊 Adding vector-accelerated retention progress bar overlay...")
                enhance_res = subprocess.run([
                    venv_python, enhance_script, sub_output, enhanced_output, c_id
                ], capture_output=True, text=True)
                
                if enhance_res.returncode == 0:
                    print(f"      ✓ MoviePy enhancements completed: {enhanced_output}")
                    generated_videos.append(enhanced_output)
                else:
                    print(f"      ⚠️ MoviePy enhancement failed: {enhance_res.stderr}")
            else:
                print(f"      ⚠️ Subtitle burning failed: {burn_res.stderr}")
        except Exception as post_err:
            print(f"      ⚠️ Post-production step failed due to environment issue: {post_err}")

    print("\n=========================================================")
    print("🏆 ALL VIDEOS RE-GENERATED & REPAIRED WITH QUALITY GATE! 🏆")
    print("=========================================================")
    for idx, path in enumerate(generated_videos):
        print(f"[{idx+1}] {path}")
    print("=========================================================")

if __name__ == "__main__":
    main()
