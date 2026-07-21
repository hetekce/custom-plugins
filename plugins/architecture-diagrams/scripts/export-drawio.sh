#!/usr/bin/env bash
# export-drawio.sh — run draw.io's own layout engine on a .drawio file and export
# it, using the drawio-desktop CLI. Letting draw.io lay the diagram out (rather
# than shipping fixed coordinates) is what makes the result look draw.io-native.
#
# Usage: export-drawio.sh <input.drawio> <output.(svg|png|jpg|jpeg|pdf|drawio|xml)> [--layout <name>]
#
# Output format follows the output extension:
#   .svg           vector, and the only format that preserves flow animation
#   .drawio/.xml   an editable file with draw.io's layout baked in
#   .png/.jpg/.jpeg/.pdf   raster/document (a single static frame)
#
# --layout <name>  a draw.io preset applied on open, before export. Presets:
#                  horizontalFlow (default), verticalFlow, horizontalTree,
#                  verticalTree, radialTree, organic. Pass "none" to keep the
#                  coordinates already in the file.
#
# A diagram with animated flow edges must be exported as .svg — the animation is
# CSS the SVG export embeds, and raster formats freeze a single frame.

set -euo pipefail

layout="horizontalFlow"
args=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    --layout)
      layout="${2:-}"
      shift 2
      ;;
    *)
      args+=("$1")
      shift
      ;;
  esac
done

if [ "${#args[@]}" -ne 2 ]; then
  echo "usage: export-drawio.sh <input.drawio> <output.(svg|png|jpg|jpeg|pdf|drawio|xml)> [--layout <name>]" >&2
  exit 1
fi

in="${args[0]}"
out="${args[1]}"

if [ ! -f "$in" ]; then
  echo "error: input file not found: $in" >&2
  exit 1
fi

case "${out##*.}" in
  svg) fmt="svg" ;;
  png) fmt="png" ;;
  jpg | jpeg) fmt="jpg" ;;
  pdf) fmt="pdf" ;;
  drawio | xml) fmt="xml" ;;
  *)
    echo "error: unsupported output extension for '$out' (use svg, png, jpg, jpeg, pdf, drawio, or xml)" >&2
    exit 1
    ;;
esac

if ! command -v drawio >/dev/null 2>&1; then
  echo "error: the drawio CLI (drawio-desktop) is not on PATH." >&2
  echo "hint: install it from https://github.com/jgraph/drawio-desktop/releases" >&2
  echo "note: the .drawio file still opens at https://app.diagrams.net — run Arrange > Layout there." >&2
  exit 1
fi

layout_args=()
if [ -n "$layout" ] && [ "$layout" != "none" ]; then
  layout_args=(--layout "$layout")
fi

echo "exporting $in -> $out ($fmt${layout:+, layout: $layout})" >&2
drawio -x -f "$fmt" "${layout_args[@]}" --no-sandbox --disable-gpu -o "$out" "$in"
echo "wrote $out" >&2
