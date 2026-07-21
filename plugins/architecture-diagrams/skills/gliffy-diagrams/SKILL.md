---
name: gliffy-diagrams
description: Produce a best-effort .gliffy file from the diagram model. Use when the user asks for Gliffy output, a .gliffy file, or a diagram they can import into Gliffy (online or in Confluence).
---

# Gliffy diagrams

Turn a diagram-model JSON (see `${CLAUDE_PLUGIN_ROOT}/schema/diagram-model.schema.json`)
into a `.gliffy` file the user imports by hand.

## Know the limitations before promising anything

- The `.gliffy` format is undocumented. Our writer is reverse-engineered from
  exported files, the draw.io importer, and the excalidraw-converter project.
  Import can fail or lose fidelity on newer Gliffy versions.
- Output is restricted to basic shapes: rectangles, orthogonal lines, and text.
  Gliffy's stencil artwork (network, AWS, UML sets) is proprietary, so we do
  not bundle or emit it. No icons, no fancy shapes.
- There is no headless import. The user must open Gliffy (online, or the Gliffy
  app in Confluence), choose "Import a Diagram", and pick the file. Tell them
  this explicitly when you hand over the file.

If the user wants a richer, native-looking diagram in Confluence, recommend the
`.drawio` output instead — Gliffy for Confluence imports `.drawio` files, and
that path keeps full shape and icon fidelity. Only produce `.gliffy` when the
user asks for it knowingly.

## Procedure

1. Get the diagram model. If it does not exist yet, have the diagram-architect
   produce one first; do not hand-write Gliffy JSON.
2. Run the converter:

   ```sh
   node "${CLAUDE_PLUGIN_ROOT}/scripts/model-to-gliffy.mjs" <diagram-model.json> <name>.gliffy [--theme light|dark]
   ```

   It lays out nodes on a deterministic grid (by group and rank, following the
   model's `direction`), draws one rectangle per node with role-based colors,
   one orthogonal arrow per edge with anchored endpoints, and optional group
   background rectangles. `--theme` overrides the model's `theme`.
3. Sanity-check the output is valid JSON and mention the node/edge counts the
   script logs.
4. Tell the user how to deliver it: open Gliffy, "Import a Diagram", select the
   file. Set expectations — plain boxes and arrows, editable after import.

## Format detail

Object envelopes, the rectangle/line/text structures, constraint anchoring,
arrow codes, and a complete minimal example live in
`${CLAUDE_PLUGIN_ROOT}/skills/gliffy-diagrams/references/gliffy-format.md`.
Read it before touching the generated JSON by hand.
