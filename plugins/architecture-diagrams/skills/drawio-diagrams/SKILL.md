---
name: drawio-diagrams
description: Produce an editable .drawio (mxGraph XML) diagram, laid out by draw.io's own engine, from a diagram-model JSON. This is the renderer for architecture (topology, C4 container/context, block, flowchart, ER) — never build a .drawio by translating a Mermaid diagram; always build it from the model. Use it for any architecture diagram, or when the user wants a draw.io file to edit or import into Confluence.
---

# Draw.io diagrams

Turn a diagram-model JSON (see `${CLAUDE_PLUGIN_ROOT}/schema/diagram-model.schema.json`)
into a native `.drawio` file and a `.jpeg` render. Both Gliffy for Confluence and the
draw.io Confluence app import `.drawio` files natively, so the output drops straight
into a Confluence page as an editable diagram.

## Path A — native mxGraph (default)

Translate the model into editable mxGraph XML. Every node becomes a movable vertex,
every relation an orthogonal edge, every group a container. Nothing is an image dump —
the reader can rearrange everything in draw.io.

```sh
node "${CLAUDE_PLUGIN_ROOT}/scripts/mermaid-to-drawio.mjs" model.json out.drawio --theme light
```

- `--theme light|dark` overrides the model's `theme` field; omit it to use the model's.
- Vertices are rounded rectangles with role-based fill and stroke colors (service,
  datastore, queue, cache, gateway, external, actor, client, job).
- Edges use `orthogonalEdgeStyle` with rounded corners: solid arrows for `sync`,
  dashed for `async`, open-arrow lines for `data`, double-headed for `bidirectional`.
- **Edges float by default** — no fixed exit/entry ports — so draw.io's layout
  engine (Path B) picks the optimal side and route after it repositions nodes.
  Pinning ports here would be computed from the fallback coordinates and go stale
  the moment the engine moves a node, which is what makes arrows attach at odd
  points. An explicit `fromSide`/`toSide` in the model is still honored. Pass
  `--pin-ports` only for a static file you will hand over *without* an auto-layout
  pass — it restores geometry-derived, fanned-out ports so sibling edges don't
  stack.
- **Nodes are sized to their label.** Plain vertices grow (within a clamp) and
  labels wrap so text never overflows the box; icon vertices stay square with the
  wrapped label beneath. Correct sizes also give the layout engine better spacing.
- **Flow edges animate.** `async` (events) and `data` (streams) carry
  `flowAnimation=1`, so they show draw.io's moving-dash "flow" animation;
  `sync` and `bidirectional` stay static. This is why the diagram-architect should
  mark real flows as `data`/`async` and two-way relationships as `bidirectional`.
- If `node.icon` is a PNG path or data URI (produced by the tech-stack-icons skill),
  the node renders as an image vertex with its label below; the PNG is embedded as a
  data URI so the file is self-contained. Run tech-stack-icons before this script when
  icons are wanted. Other icon values (Iconify ids) fall back to a plain vertex.
- The script gives every node a **fallback** position (group-major swimlane bands,
  no overlaps) so the raw file opens sensibly. For general architecture, replace
  this with draw.io's own layout in Path B — the fallback only matters when
  drawio-desktop is unavailable.

The script has no dependencies beyond Node; it always writes the `.drawio` file.

## Path B — let draw.io lay it out, then export

For general architecture, **do not ship the script's coordinates as the final
layout** — that reads as auto-generated. Run draw.io's own layout engine so the
diagram looks draw.io-native, then export. `export-drawio.sh` does both: it applies
a `--layout` preset on open and writes the output (format from the extension:
`svg`, `png`, `jpg`, `jpeg`, `pdf`, or `drawio`/`xml` for an editable file).

```sh
# editable .drawio with draw.io's own layout baked in (hand this to the user)
"${CLAUDE_PLUGIN_ROOT}/scripts/export-drawio.sh" raw.drawio out.drawio --layout horizontalFlow

# animated SVG of the same, laid out by draw.io
"${CLAUDE_PLUGIN_ROOT}/scripts/export-drawio.sh" raw.drawio out.svg --layout horizontalFlow
```

- **Presets** (draw.io's own): `horizontalFlow` (default, best for left-to-right
  architecture), `verticalFlow`, `horizontalTree`, `verticalTree`, `radialTree`,
  `organic`. Use `--layout none` only when you deliberately want the script's own
  coordinates (e.g. no drawio-desktop available downstream).
- **If the diagram has any `data`/`async` (flow) edges, export `.svg`** — the
  animation is CSS the SVG embeds; raster formats (`jpeg`/`png`) freeze one frame.
- Requires the drawio-desktop CLI (`drawio`) on PATH. If it is missing, the script
  exits non-zero — hand over the raw `.drawio` and tell the user to open it at
  https://app.diagrams.net and run **Arrange → Layout** there (same engine).

## Typical run

1. Get the diagram-model JSON from the diagram-architect agent.
2. If nodes carry `tech` slugs, resolve icons first with the tech-stack-icons skill
   so `node.icon` points at rasterized PNGs.
3. Run `mermaid-to-drawio.mjs` to produce `raw.drawio` (nodes, edges, containers;
   its coordinates are only a fallback).
4. Run `export-drawio.sh` with `--layout horizontalFlow` to produce the editable
   `<name>.drawio` (draw.io's layout baked in) and, if there are flow edges, an
   animated `<name>.svg`. Best effort — needs drawio-desktop.
5. Hand the files over; mention the Confluence import path when relevant.

## When output needs tweaking

Edit the `.drawio` XML directly — it is plain mxGraph. See
`references/mxgraph.md` for the file skeleton, cell styles, the role color palette
in both themes, how model fields map to cells, and the export CLI flags.

## Layout guarantees

The converter keeps diagrams readable without manual cleanup:

- **Routing is left to draw.io's engine by default** (floating edges), so arrows
  attach at the optimal side after layout. With `--pin-ports` (static files),
  edges sharing one node side fan out onto parallel ports so a node with two
  outgoing edges never stacks them into one overlapping line.
- **Nodes are sized to their label and labels wrap**, so text never overflows the
  box; edge labels are word-wrapped and drawn on an opaque background so long text
  neither overflows the line nor becomes unreadable where it crosses one.

If you hand-edit the XML, keep these invariants: `&lt;br&gt;` (never a raw
`<br>`) inside a `value="..."` attribute — a raw break makes draw.io drop the
whole cell — and, if you pin ports, distinct `exitX/exitY` + `entryX/entryY` per
sibling edge.
