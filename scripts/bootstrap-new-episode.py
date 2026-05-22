#!/usr/bin/env python3
"""Create a new episode: generate script (block-opening contract), then all assets."""

from __future__ import annotations

import json
import subprocess
import sys
import uuid
import urllib.error
import urllib.request

BASE = "http://localhost:3000"

DEFAULT_BRIEF = """
Upgrade Life test episode — brain reboot in one day.

The viewer's mental clutter is self-created. Argue for subtraction, not more hacks.
Four acts (~500 words narration each): mess, deep dive, mirror, way forward.
Concrete mini-scenes (tabs, notifications, junk drawer, calendar, group chat).
Big Brother warmth — witty, mentoring, no tech jargon or self-help buzzwords.
Each narration block: 3–6 sentences + enough visual beats (~5s max per beat; 2–4 on short blocks, more on long); first beat phrase must open each block.
""".strip()


def post(path: str, body: dict, timeout: int = 900) -> dict:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))


def main() -> int:
    brief = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_BRIEF
    video_id = sys.argv[2] if len(sys.argv) > 2 else str(uuid.uuid4())

    print(f"Video ID: {video_id}", flush=True)

    print("\n=== Script (Gemini + validation) ===", flush=True)
    try:
        gen = post(
            "/api/studio/script/generate",
            {"episodeBrief": brief, "videoId": video_id},
            timeout=900,
        )
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()[:500]}", flush=True)
        return 1

    if not gen.get("ok"):
        print(f"FAIL: {gen.get('error')}", flush=True)
        return 1

    script = gen.get("script") or {}
    title = script.get("workingTitle", "")
    print(f"OK: {title!r}", flush=True)

    from datetime import UTC, datetime

    now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    commission = {
        "id": video_id,
        "workingTitle": title,
        "idea": {
            "title": title,
            "hook": brief[:120],
            "thumbnailVisualDescription": "Mentor in calm split scene, mental clutter vs clarity.",
            "thumbnailTextOverlay": "BRAIN REBOOT",
            "thumbnailTextGlow": "cyan",
            "pillar": "overthinking",
        },
        "currentStage": "visuals",
        "createdAt": now,
        "updatedAt": now,
        "scriptCompletedAt": now,
        "audioCompletedAt": now,
    }

    script_path = None
    import os

    assets = os.environ.get("UPGRADE_LIFE_LOCAL_ASSETS_ROOT", "")
    if assets:
        script_path = f"{assets}/vis-stills/{video_id}/script.json"
        print(f"Script saved: {script_path}", flush=True)
        meta_path = f"{assets}/vis-stills/{video_id}/commission.meta.json"
        with open(meta_path, "w", encoding="utf-8") as mf:
            json.dump(commission, mf, indent=2)
        print(f"Commission meta: {meta_path}", flush=True)

    regen = subprocess.run(
        [
            sys.executable,
            "scripts/force-regenerate-episode.py",
            video_id,
        ]
        + ([script_path] if script_path else []),
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    )
    if regen.returncode != 0:
        return regen.returncode

    print("\n=== Assembly playlist check ===", flush=True)
    try:
        req = urllib.request.Request(
            f"{BASE}/api/studio/visuals/assembly-playlist?videoId={video_id}",
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=120) as res:
            pl = json.loads(res.read().decode("utf-8"))
        items = pl.get("items") or []
        gaps = [i for i in items if i.get("kind") == "gap"]
        clips = [i for i in items if i.get("kind") == "clip"]
        print(f"  items={len(items)} gaps={len(gaps)} clips={len(clips)}", flush=True)
        for i, x in enumerate(items[:6]):
            if x.get("kind") == "gap":
                print(
                    f"  [{i}] gap dur={x.get('durationSec'):.2f} from={x.get('audioStartSec'):.2f}",
                    flush=True,
                )
            else:
                print(
                    f"  [{i}] clip start={x.get('audioStartSec'):.2f} dur={x.get('durationSec'):.2f}",
                    flush=True,
                )
    except Exception as e:
        print(f"  (playlist check skipped: {e})", flush=True)

    out_commission = f"/tmp/upgrade-life-commission-{video_id}.json"
    with open(out_commission, "w", encoding="utf-8") as f:
        json.dump(commission, f, indent=2)
    print(f"\nCommission row (import in browser localStorage): {out_commission}", flush=True)
    print(f"Studio: {BASE}/studio/{video_id}/visuals", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
