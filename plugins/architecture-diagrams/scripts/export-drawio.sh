#!/usr/bin/env bash
# export-drawio.sh — export a .drawio file to an image with the drawio-desktop CLI.
# The output format is taken from the output file extension:
#   .svg        vector, and the only format that preserves flow animation
#   .png        raster with transparency
#   .jpg/.jpeg  raster
#   .pdf        document
#
# Usage: export-drawio.sh <input.drawio> <output.(svg|png|jpg|jpeg|pdf)>
#
# A diagram with animated flow edges must be exported as .svg — the animation is
# carried by CSS the SVG export embeds, and raster formats capture a single frame.

set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: export-drawio.sh <input.drawio> <output.(svg|png|jpg|jpeg|pdf)>" >&2
  exit 1
fi

in="$1"
out="$2"

if [ ! -f "$in" ]; then
  echo "error: input file not found: $in" >&2
  exit 1
fi

case "${out##*.}" in
  svg) fmt="svg" ;;
  png) fmt="png" ;;
  jpg | jpeg) fmt="jpg" ;;
  pdf) fmt="pdf" ;;
  *)
    echo "error: unsupported output extension for '$out' (use svg, png, jpg, jpeg, or pdf)" >&2
    exit 1
    ;;
esac

if ! command -v drawio >/dev/null 2>&1; then
  echo "error: the drawio CLI (drawio-desktop) is not on PATH." >&2
  echo "hint: install it from https://github.com/jgraph/drawio-desktop/releases" >&2
  echo "note: the .drawio file still opens at https://app.diagrams.net — only the image export is skipped." >&2
  exit 1
fi

echo "exporting $in -> $out ($fmt)" >&2
drawio -x -f "$fmt" --no-sandbox --disable-gpu -o "$out" "$in"
echo "wrote $out" >&2
