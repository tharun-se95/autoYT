#!/usr/bin/env python3
"""Force-regenerate narration audio, vis stills, and motion clips for one episode."""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request

BASE = "http://localhost:3000"
MIN_VIS_CHARS = 40
MIN_VIS_WORDS = 35


def to_vis_still_block_index(base: int, beat: int) -> int:
    return base * 100 + beat


def count_words(text: str) -> int:
    return len(text.strip().split())


def is_eligible(description: str, mode: str) -> bool:
    t = description.strip()
    if not t:
        return False
    if mode == "any":
        return True
    if mode == "min-chars":
        return len(t) >= MIN_VIS_CHARS
    if mode == "min-words":
        return len(t) >= MIN_VIS_CHARS and count_words(t) >= MIN_VIS_WORDS
    raise ValueError(f"Unknown eligibility mode: {mode}")


def post(path: str, body: dict, timeout: int = 600) -> dict:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("video_id", nargs="?", default="0cffcd7d-9ee3-4dc2-ace5-c64341ff1191")
    p.add_argument(
        "script_path",
        nargs="?",
        default=None,
        help="Path to script.json (default: vis-stills/<videoId>/script.json on assets disk)",
    )
    p.add_argument(
        "--skip-audio",
        action="store_true",
        help="Only regenerate stills and motion clips.",
    )
    p.add_argument(
        "--skip-stills",
        action="store_true",
        help="Only regenerate motion clips (requires existing stills).",
    )
    p.add_argument(
        "--skip-clips",
        action="store_true",
        help="Only regenerate stills (and audio unless --skip-audio).",
    )
    p.add_argument(
        "--eligible",
        choices=("min-chars", "min-words", "any"),
        default="min-chars",
        help="Beat filter for still generation (default: min-chars for force regen).",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()
    video_id = args.video_id
    script_path = args.script_path or (
        f"/Volumes/Seagate/upgrade-life-assets/vis-stills/{video_id}/script.json"
    )

    with open(script_path, encoding="utf-8") as f:
        script = json.load(f)

    working_title = script.get("workingTitle", "")
    audio_ok = 0
    still_ok = 0
    clip_data: dict = {}

    # --- Audio ---
    if not args.skip_audio and not args.skip_stills:
        audio_blocks = []
        for act in script["acts"]:
            for block_index, block in enumerate(act["narrationBlocks"]):
                n = (block.get("narration") or "").strip()
                if n:
                    audio_blocks.append(
                        {"actId": act["actId"], "blockIndex": block_index, "narration": n}
                    )

        print(f"\n=== Audio ({len(audio_blocks)} blocks) ===", flush=True)
        for i, b in enumerate(audio_blocks):
            t0 = time.time()
            try:
                data = post(
                    "/api/studio/audio/tts/block",
                    {
                        "videoId": video_id,
                        "actId": b["actId"],
                        "blockIndex": b["blockIndex"],
                        "narration": b["narration"],
                        "workingTitle": working_title,
                    },
                    timeout=300,
                )
                if data.get("ok"):
                    audio_ok += 1
                    print(
                        f"  [{i+1}/{len(audio_blocks)}] {b['actId']} block {b['blockIndex']+1} OK ({time.time()-t0:.1f}s)",
                        flush=True,
                    )
                else:
                    print(
                        f"  [{i+1}/{len(audio_blocks)}] FAIL: {data.get('error')}",
                        flush=True,
                    )
                    return 1
            except urllib.error.HTTPError as e:
                print(f"  HTTP {e.code}: {e.read().decode()[:300]}", flush=True)
                return 1
            except Exception as e:
                print(f"  ERROR: {e}", flush=True)
                return 1

    # --- Stills ---
    if not args.skip_stills:
        vis_queue = []
        for act in script["acts"]:
            for block_index, block in enumerate(act["narrationBlocks"]):
                beats = block.get("visualBeats") or []
                if beats:
                    for beat_index, beat in enumerate(beats):
                        vis_queue.append(
                            {
                                "actId": act["actId"],
                                "actTitle": act["displayTitle"],
                                "blockIndex": block_index,
                                "beatIndex": beat_index,
                                "visualDescription": beat["visualDescription"],
                            }
                        )
                elif (block.get("visualDescription") or "").strip():
                    vis_queue.append(
                        {
                            "actId": act["actId"],
                            "actTitle": act["displayTitle"],
                            "blockIndex": block_index,
                            "beatIndex": 0,
                            "visualDescription": block["visualDescription"],
                        }
                    )

        eligible = [
            v
            for v in vis_queue
            if is_eligible(v["visualDescription"], args.eligible)
        ]
        skipped = len(vis_queue) - len(eligible)

        print(
            f"\n=== Stills ({len(eligible)} beats, {skipped} skipped, mode={args.eligible}) ===",
            flush=True,
        )
        for i, item in enumerate(eligible):
            t0 = time.time()
            storage = to_vis_still_block_index(item["blockIndex"], item["beatIndex"])
            try:
                data = post(
                    "/api/studio/visuals/generate",
                    {
                        "videoId": video_id,
                        "actId": item["actId"],
                        "blockIndex": storage,
                        "visualDescription": item["visualDescription"].strip(),
                        "workingTitle": working_title,
                        "force": True,
                    },
                    timeout=300,
                )
                if data.get("ok"):
                    still_ok += 1
                    print(
                        f"  [{i+1}/{len(eligible)}] {item['actTitle']} b{item['blockIndex']+1} beat {item['beatIndex']+1} OK ({time.time()-t0:.1f}s)",
                        flush=True,
                    )
                else:
                    print(f"  [{i+1}/{len(eligible)}] FAIL: {data.get('error')}", flush=True)
                    return 1
            except Exception as e:
                print(f"  [{i+1}/{len(eligible)}] ERROR: {e}", flush=True)
                return 1

    # --- Clips ---
    if not args.skip_clips:
        print(f"\n=== Motion clips (force, all beats with still+audio) ===", flush=True)
        t0 = time.time()
        try:
            clip_data = post(
                "/api/studio/visuals/motion/render",
                {"videoId": video_id, "force": True},
                timeout=3600,
            )
            print(
                f"  total={clip_data.get('total')} rendered={clip_data.get('rendered')} "
                f"cached={clip_data.get('cached')} failed={clip_data.get('failed')} "
                f"({time.time()-t0:.1f}s)",
                flush=True,
            )
            if not clip_data.get("ok") or (clip_data.get("failed") or 0) > 0:
                for r in clip_data.get("results") or []:
                    if not r.get("ok"):
                        print(
                            f"    FAIL {r.get('actId')} block {r.get('baseBlockIndex')} "
                            f"beat {r.get('beatIndex')}: {r.get('error')}",
                            flush=True,
                        )
                return 1
        except Exception as e:
            print(f"  ERROR: {e}", flush=True)
            return 1

    print(
        f"\nDone: video={video_id} stills={still_ok} clips_rendered={clip_data.get('rendered', 0)}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
