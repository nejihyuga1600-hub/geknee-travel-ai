"""
Meshy Skin Generator
====================
Takes an approved base .glb monument model and generates
retextured skins for each rarity tier via Meshy's Retexture API.

Usage:
  python meshy_skins.py eiffel_tower
  python meshy_skins.py eiffel_tower --skin gold
  python meshy_skins.py --list-skins

Requires: MESHY_API_KEY in .env.local
"""

import os
import sys
import time
import json
import base64
import requests
import subprocess
from pathlib import Path

# ── Load .env.local ──────────────────────────────────────────────────────────
def _load_env():
    env_path = Path(__file__).parent / ".env.local"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())
_load_env()

# ── Config ───────────────────────────────────────────────────────────────────
MESHY_API_KEY = os.environ.get("MESHY_API_KEY", "")
MODELS_DIR = Path(__file__).parent / "public" / "models"
RETEXTURE_URL = "https://api.meshy.ai/openapi/v1/retexture"
HEADERS = {"Authorization": f"Bearer {MESHY_API_KEY}", "Content-Type": "application/json"}
POLL_INTERVAL = 10
MAX_WAIT = 900

# ── Skin Definitions by Rarity ───────────────────────────────────────────────
SKINS = {
    # Common (default - awarded for visiting location)
    "stone":        {"rarity": "common",    "prompt": "Repaint every single polygon the exact same flat medium grey color #808080, zero variation between parts, the tower and the base must be identical grey, no lighter areas, no darker areas, no color difference anywhere, flat uniform matte grey stone on 100% of surfaces"},
    # Uncommon
    "bronze":       {"rarity": "uncommon",  "prompt": "Entire model covered uniformly in polished bronze metal, warm copper-brown patina, slightly oxidized, metallic sheen, every surface including tower and base is solid bronze metal"},
    # Rare
    "silver":       {"rarity": "rare",      "prompt": "Entire model covered uniformly in polished sterling silver metal, highly reflective mirror surface, cool blue-grey tone, pristine metallic, every part is solid silver"},
    # Epic
    "gold":         {"rarity": "epic",      "prompt": "Entire model covered uniformly in solid 24 karat gold, highly polished, warm rich yellow gold, mirror reflective surface, luxurious metallic, every surface is solid gold"},
    # Legendary
    "diamond":      {"rarity": "legendary", "prompt": "Entire model covered uniformly in diamond encrusted surface, thousands of tiny brilliant cut diamonds, sparkling crystalline facets, prismatic light refraction, every surface is diamonds"},
    # Mythic
    "aurora":       {"rarity": "mythic",    "prompt": "Entire model covered uniformly in northern lights aurora borealis material, flowing green and purple and blue translucent energy, cosmic shimmer on every surface"},
    "celestial":    {"rarity": "mythic",    "prompt": "Entire model covered uniformly in deep space cosmic nebula material, swirling purple and blue galaxies visible inside translucent surface, tiny stars and constellations on every surface"},
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_progress(monument: str) -> dict:
    p = Path(f"meshy_skins_progress_{monument}.json")
    return json.loads(p.read_text()) if p.exists() else {}

def save_progress(monument: str, progress: dict):
    Path(f"meshy_skins_progress_{monument}.json").write_text(json.dumps(progress, indent=2))

def get_model_data_uri(glb_path: Path) -> str:
    raw = glb_path.read_bytes()
    b64 = base64.b64encode(raw).decode("ascii")
    return f"data:application/octet-stream;base64,{b64}"

def submit_retexture(model_data_uri: str, skin_name: str, prompt: str):
    body = {
        "model_url": model_data_uri,
        "text_style_prompt": prompt,
        "enable_pbr": True,
    }
    for attempt in range(3):
        try:
            r = requests.post(RETEXTURE_URL, headers=HEADERS, json=body, timeout=300)
            if r.status_code in (200, 201, 202):
                task_id = r.json().get("result")
                print(f"  [SUBMIT] {skin_name} → task {task_id}")
                return task_id
            else:
                print(f"  [ERROR]  {skin_name} → {r.status_code} {r.text[:200]}")
                return None
        except requests.exceptions.ConnectionError as e:
            print(f"  [RETRY]  {skin_name} attempt {attempt+1}/3 — connection error")
            time.sleep(5)
    print(f"  [FAILED] {skin_name} — all retries exhausted")
    return None

def poll_and_download(task_id: str, skin_name: str, monument: str) -> bool:
    deadline = time.time() + MAX_WAIT
    while time.time() < deadline:
        r = requests.get(f"{RETEXTURE_URL}/{task_id}", headers=HEADERS, timeout=15)
        data = r.json()
        status = data.get("status", "")
        if status == "SUCCEEDED":
            glb_url = data.get("model_urls", {}).get("glb")
            if glb_url:
                out_path = MODELS_DIR / f"{monument}_{skin_name}.glb"
                dl = requests.get(glb_url, timeout=120, stream=True)
                out_path.write_bytes(dl.content)
                print(f"  [SAVED]  {out_path.name} ({len(dl.content)//1024} KB)")
                subprocess.run(["code", str(out_path)], check=False)
                return True
            return False
        elif status in ("FAILED", "EXPIRED"):
            err = data.get("task_error", {}).get("message", "unknown")
            print(f"  [FAIL]   {skin_name} → {status}: {err}")
            return False
        else:
            pct = data.get("progress", 0)
            print(f"  [WAIT]   {skin_name} ({status} {pct}%)")
            time.sleep(POLL_INTERVAL)
    print(f"  [TIMEOUT] {skin_name}")
    return False

# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    if not MESHY_API_KEY:
        print("ERROR: MESHY_API_KEY not set. Add to .env.local")
        sys.exit(1)

    auto_approve = "--auto" in sys.argv

    if "--list-skins" in sys.argv:
        print("\nAvailable skins:")
        for rarity in ["common", "uncommon", "rare", "epic", "legendary", "mythic"]:
            names = [k for k, v in SKINS.items() if v["rarity"] == rarity]
            print(f"  {rarity.upper():12s} {', '.join(names)}")
        sys.exit(0)

    if len(sys.argv) < 2:
        print("Usage: python meshy_skins.py <monument_name> [--skin <skin_name>]")
        print("       python meshy_skins.py --list-skins")
        sys.exit(1)

    monument = sys.argv[1]
    glb_path = MODELS_DIR / f"{monument}.glb"
    if not glb_path.exists():
        print(f"ERROR: {glb_path} not found. Drop the approved base model there first.")
        sys.exit(1)

    # Filter to specific skin if requested
    if "--skin" in sys.argv:
        idx = sys.argv.index("--skin")
        skin_filter = sys.argv[idx + 1] if idx + 1 < len(sys.argv) else None
        if skin_filter not in SKINS:
            print(f"ERROR: Unknown skin '{skin_filter}'. Use --list-skins to see options.")
            sys.exit(1)
        skins_to_generate = {skin_filter: SKINS[skin_filter]}
    else:
        skins_to_generate = SKINS

    progress = load_progress(monument)

    # Skip already completed
    pending = {k: v for k, v in skins_to_generate.items() if progress.get(k) != "done"}
    print(f"\n{monument}: {len(skins_to_generate)} skins total — {len(pending)} remaining\n")

    if not pending:
        print("All skins already generated!")
        sys.exit(0)

    # Load model as data URI once
    print(f"Loading {glb_path.name} ({glb_path.stat().st_size // 1024 // 1024} MB)...")
    model_uri = get_model_data_uri(glb_path)
    print(f"Base64 encoded. Submitting retexture jobs...\n")

    for skin_name, skin_info in pending.items():
        # Check if we have an in-progress task to resume
        if skin_name in progress and progress[skin_name] not in ("done",):
            task_id = progress[skin_name]
            print(f"  [RESUME] {skin_name} → task {task_id}")
        else:
            task_id = submit_retexture(model_uri, skin_name, skin_info["prompt"])
            if not task_id:
                continue
            progress[skin_name] = task_id
            save_progress(monument, progress)
            time.sleep(2)

        success = poll_and_download(task_id, skin_name, monument)
        if success:
            progress[skin_name] = "done"
            save_progress(monument, progress)

            if auto_approve:
                print(f"\n  ✓ {skin_name} skin auto-approved.")
            else:
                print(f"\n  ✓ {skin_name} skin opened in VS Code.")
                resp = input(f"  Approve {skin_name}? (y/n/q): ").strip().lower()
                if resp == "q":
                    print("Stopping. Run again to continue from where you left off.")
                    sys.exit(0)
                elif resp == "n":
                    out_path = MODELS_DIR / f"{monument}_{skin_name}.glb"
                    out_path.unlink(missing_ok=True)
                    del progress[skin_name]
                    save_progress(monument, progress)
                    print(f"  Rejected. {skin_name} will retry next run.")

    done_count = sum(1 for v in progress.values() if v == "done")
    print(f"\n✓ {monument}: {done_count}/{len(skins_to_generate)} skins complete.")
    print(f"  Models saved to {MODELS_DIR}/")


if __name__ == "__main__":
    main()
