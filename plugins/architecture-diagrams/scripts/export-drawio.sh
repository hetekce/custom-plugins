#!/usr/bin/env bash
# export-drawio.sh — export a .drawio file to JPEG with the drawio-desktop CLI.
#
# Usage: export-drawio.sh <input.drawio> <output.jpeg>

set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: export-drawio.sh <input.drawio> <output.jpeg>" >&2
  exit 1
fi

in="$1"
out="$2"

if [ ! -f "$in" ]; then
  echo "error: input file not found: $in" >&2
  exit 1
fi

if ! command -v drawio >/dev/null 2>&1; then
  echo "error: the drawio CLI (drawio-desktop) is not on PATH." >&2
  echo "hint: install it from https://github.com/jgraph/drawio-desktop/releases" >&2
  echo "note: the .drawio file still opens at https://app.diagrams.net — only the JPEG export is skipped." >&2
  exit 1
fi

echo "exporting $in -> $out" >&2
drawio -x -f jpg --no-sandbox -o "$out" "$in"
echo "wrote $out" >&2
