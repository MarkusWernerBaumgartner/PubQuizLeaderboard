#!/usr/bin/env bash
# Regenerates the screenshots and GIFs in docs/media from examples/sample-quiz.json.
# Needs a display (real or virtual), ffmpeg, and `npm install` to have been run.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=docs/media
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$OUT"

run_scenario() {   # <scenario.json> <outdir>
  local profile="$WORK/profile-$(basename "$1" .json)"
  mkdir -p "$profile"
  cp examples/sample-quiz.json "$profile/quiz.json"
  PUBQUIZ_DEV_SCENARIO="$1" PUBQUIZ_DEV_OUT="$2" \
    node_modules/.bin/electron . --no-sandbox --user-data-dir="$profile" >/dev/null 2>&1 || { echo "Scenario $1 failed:"; cat "$2/report.json"; exit 1; }
}

echo "Screenshots…"
run_scenario scripts/media/screenshots.json "$WORK/shots"
for f in "$WORK"/shots/*.png; do cp "$f" "$OUT/$(basename "$f")"; done

for s in score-update question-slideshow rules-intro theming; do
  echo "GIF: $s…"
  run_scenario "scripts/media/$s.json" "$WORK/rec"
  ffmpeg -v error -y -f concat -safe 0 -i "$WORK/rec/$s/concat.txt" \
    -vf "fps=10,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
    -loop 0 "$OUT/$s.gif"
done
ls -la "$OUT"
