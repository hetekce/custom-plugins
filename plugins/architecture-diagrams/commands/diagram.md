---
description: Design an architecture diagram from a description or codebase and render it as Mermaid, draw.io, and Gliffy artifacts
argument-hint: <description or path> [--format mermaid|drawio|gliffy|all] [--type <kind>] [--theme light|dark] [--out <dir>]
---

Produce a polished architecture diagram end to end: design the model, polish
the wording, resolve icons, render every requested format, and report exactly
what was written.

## 1. Parse the arguments

Read `$ARGUMENTS` and split it into a subject and flags:

- **Subject** — everything that is not a flag. If it is an existing directory
  or file path, treat it as a codebase to analyze; otherwise treat it as a
  prose description of the system.
- `--format` — `mermaid`, `drawio`, `gliffy`, or `all`. Default `all`.
- `--type` — force the diagram kind (`architecture`, `sequence`,
  `c4-container`, `c4-context`, `er`, `flowchart`, `block`, `class`). If
  omitted, the architect picks it.
- `--theme` — `light` or `dark`. Default `light`.
- `--out` — output directory. Default `./diagrams`. Create it if missing.

If there is no subject at all, ask the user what to diagram and stop.

## 2. Design the model

Invoke the `diagram-architect` agent. Give it the subject, the theme, the
forced `--type` if any, and tell it to write its result to
`<out>/diagram-model.json`. The agent explores the codebase (or models the
description), picks the kind, assigns roles and tech slugs, and emits one JSON
object validating against
`${CLAUDE_PLUGIN_ROOT}/schema/diagram-model.schema.json`. It designs; it does
not render.

## 3. Polish the wording

Run the `diagram-copywriter` skill on `<out>/diagram-model.json`. It rewrites
the title, node labels, edge labels, and summary to the plain-language bar
(sentence case, active voice, no filler) and saves the model back in place.
This happens before any rendering so every format gets the same clean text.

## 4. Resolve icons

Run the `tech-stack-icons` skill on the model. For each node with a `tech`
slug it fills the `icon` field: an Iconify id (for Mermaid) and, for formats
that embed images, a rasterized PNG produced via
`${CLAUDE_PLUGIN_ROOT}/scripts/fetch-icon.mjs`. Nodes without a known tech
keep their role-based styling and no icon — that is fine.

## 5. Render each requested format

Derive the base name by slugging the model title (the `slug` helper in
`${CLAUDE_PLUGIN_ROOT}/scripts/lib/tools.mjs` shows the rule). Then, for each
format selected by `--format`:

- **mermaid** — best for flows (auth, request lifecycles, sequences) and quick
  architecture. Run the `mermaid-diagrams` skill: it writes `<name>.mmd`
  (source), `<name>.drawio`, and `<name>.jpeg` (rendered raster).
- **drawio** — best for general architecture, drawn the draw.io way. Run the
  `drawio-diagrams` skill: it emits a raw `.drawio`, then lets **draw.io's own
  layout engine** arrange it (`--layout horizontalFlow`) and writes the editable
  `<name>.drawio` with that layout baked in. If the model has any `data`/`async`
  flow edges, also write an animated `<name>.svg` (draw.io animates flows and the
  SVG keeps the animation); otherwise a `<name>.jpeg` is fine.
- **gliffy** — run the `gliffy-diagrams` skill. It writes `<name>.gliffy`,
  a best-effort basic-shapes JSON the user imports manually in Gliffy via
  "Import a Diagram".

With `--format all`, use distinct base names per format (for example
`<name>-mermaid.drawio` and `<name>.drawio`) so nothing overwrites.

Each skill's scripts check for their external tools (`mmdc`, `drawio`, an
SVG rasterizer) before rendering. **Source artifacts are always written even
when a renderer is missing** — a missing tool only skips the derived raster,
and the script prints a one-line install hint instead of a stack trace. Do
not treat a missing renderer as a failure; note it and continue.

## 6. Report

Finish with a short summary:

- The absolute path of every file written, grouped by format, including
  `diagram-model.json`.
- Any renderer that was missing, with the install hint the script printed
  (for example: `mmdc` missing — `npm install -g @mermaid-js/mermaid-cli`).
- One sentence on what the diagram shows, taken from the model summary.

No decoration, no restating the procedure — just the results.
