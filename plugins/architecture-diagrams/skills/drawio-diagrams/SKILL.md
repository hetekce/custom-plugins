---
name: drawio-diagrams
description: Produce an editable .drawio (mxGraph XML) diagram, plus a .jpeg export, from a diagram-model JSON. Use when the user wants a draw.io file, the .drawio artifact of a Mermaid diagram, or a diagram they can edit in draw.io or import into Confluence.
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
  `fromSide`/`toSide` hints become exit/entry points.
- **Flow edges animate.** `async` (events) and `data` (streams) carry
  `flowAnimation=1`, so they show draw.io's moving-dash "flow" animation;
  `sync` and `bidirectional` stay static. This is why the diagram-architect should
  mark real flows as `data`/`async` and two-way relationships as `bidirectional`.
- If `node.icon` is a PNG path or data URI (produced by the tech-stack-icons skill),
  the node renders as an image vertex with its label below; the PNG is embedded as a
  data URI so the file is self-contained. Run tech-stack-icons before this script when
  icons are wanted. Other icon values (Iconify ids) fall back to a plain vertex.
- Layout is deterministic layered placement: ranks flow left to right for `LR`
  (top-down for `TB`), group members stay adjacent, nothing overlaps.

The script has no dependencies beyond Node; it always writes the `.drawio` file.

## Path B — export an image

The output format follows the output extension (`svg`, `png`, `jpg`, `jpeg`, `pdf`):

```sh
"${CLAUDE_PLUGIN_ROOT}/scripts/export-drawio.sh" out.drawio out.svg    # animated flows preserved
"${CLAUDE_PLUGIN_ROOT}/scripts/export-drawio.sh" out.drawio out.jpeg   # single static frame
```

**If the diagram has any `data`/`async` (flow) edges, export `.svg`** — the animation
is CSS the SVG export embeds, and raster formats (`jpeg`/`png`) freeze one frame.
Export a raster only for a fully static diagram or a thumbnail.

Requires the drawio-desktop CLI (`drawio`) on PATH. If it is missing, the script
prints an install hint and exits non-zero — keep the `.drawio` anyway and tell the
user it opens at https://app.diagrams.net, where they can export the image themselves.

## Typical run

1. Get the diagram-model JSON from the diagram-architect agent.
2. If nodes carry `tech` slugs, resolve icons first with the tech-stack-icons skill
   so `node.icon` points at rasterized PNGs.
3. Run `mermaid-to-drawio.mjs` to produce `<name>.drawio`.
4. Export: `.svg` if the model has any `data`/`async` flow edges (keeps the
   animation), otherwise `.jpeg`/`.png` is fine. Best effort — needs drawio-desktop.
5. Hand the files over; mention the Confluence import path when relevant.

## When output needs tweaking

Edit the `.drawio` XML directly — it is plain mxGraph. See
`references/mxgraph.md` for the file skeleton, cell styles, the role color palette
in both themes, how model fields map to cells, and the export CLI flags.

## Layout guarantees

The converter keeps branchy diagrams readable without manual cleanup:

- **Edges leave and enter on the side that faces the other node**, and several
  edges sharing one node side fan out onto parallel ports — so a node with two
  outgoing edges (for example writes-to-database and publishes-to-bus) never
  stacks them into one overlapping line.
- **Edge labels are word-wrapped** and drawn on an opaque background, so long
  text neither overflows the line nor becomes unreadable where it crosses one.

If you hand-edit the XML, keep these invariants: distinct `exitX/exitY` +
`entryX/entryY` per sibling edge, and `&lt;br&gt;` (never a raw `<br>`) inside a
`value="..."` attribute — a raw break makes draw.io drop the whole cell.
