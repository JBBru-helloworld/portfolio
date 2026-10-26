#!/bin/sh
# Entry point for `pnpm scene:build` and `pnpm scene:qa`. See docs/WINDOW-ASSETS.md.
set -eu
cd "$(dirname "$0")"
ROOT="$(cd ../.. && pwd)"

for f in window-v2.png fly-through.mp4; do
  if [ ! -f "$ROOT/assets/window-scene/$f" ]; then
    echo "scene:build: originals not found ($f); keeping the committed outputs in public/scene/."
    exit 0
  fi
done

for tool in ffmpeg ffprobe python3; do
  command -v "$tool" >/dev/null 2>&1 || { echo "scene:build: $tool is required but not installed." >&2; exit 1; }
done

if [ ! -x .venv/bin/python ]; then
  echo "scene:build: creating scripts/scene/.venv"
  python3 -m venv .venv
  .venv/bin/pip install --quiet --upgrade pip
  .venv/bin/pip install --quiet -r requirements.txt
fi

exec .venv/bin/python "${1:-build.py}"
