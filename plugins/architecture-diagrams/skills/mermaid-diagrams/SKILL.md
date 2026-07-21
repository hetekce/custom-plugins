---
name: mermaid-diagrams
description: Turn the diagram-model JSON into elegant Mermaid source and a rendered image. Use when producing a Mermaid diagram or .mmd file from the diagram model — architecture, flowchart, sequence, C4 container, or ER views — including the .jpeg render.
---

# Mermaid diagrams

Input is one diagram-model JSON object (`${CLAUDE_PLUGIN_ROOT}/schema/diagram-model.schema.json`).
Turn it into Mermaid text, write `<name>.mmd`, then render `<name>.jpeg`. Full grammar, palettes,
and CLI detail live in [references/mermaid-style.md](references/mermaid-style.md).

## Map `kind` to a Mermaid type

- **architecture** → `architecture-beta`. Groups become `group id(cloud)[Label]` (nest with
  `in parentId`). Nodes become `service id(logos:postgresql)[Label] in groupId` — use the model's
  `icon` when set, else a built-in (`server`, `database` for datastore, `internet` for external).
  Edges use ports from `fromSide`/`toSide`: `api:R --> L:db`. Append `{group}` to an endpoint that
  crosses a group border. Add `junction` nodes for fan-outs and `align row a b c` to keep tiers
  straight. This grammar has no dashed arrows, so mark async edges in the label.
- **flowchart** → `flowchart LR` (take `direction` from the model). Use icon nodes:
  `api@{ icon: "logos:aws-lambda", form: "square", label: "Orders API", pos: "b", h: 60 }`.
  Edge kinds: sync `-->`, async `-.->`, data `---`, bidirectional `<-->`. Label edges as
  `a -->|"writes to"| b`.
- **sequence** → `sequenceDiagram`. Role `actor` becomes `actor`, everything else `participant`.
  Emit edges in array order: sync `A->>B: label`, async `A-)B: label`, and a dashed reply
  `B-->>A: ...` where the flow implies one. This is the right shape for auth and request flows.
- **c4-container / c4-context** → `C4Container` / `C4Context`. Role `actor` → `Person`,
  `datastore` → `ContainerDb`, `queue` → `ContainerQueue`, `external` → `System_Ext`, groups →
  `System_Boundary`. Pass `tech` as the technology argument. Edges become
  `Rel(from, to, "label", "tech")`.
- **er** → `erDiagram`. Nodes become entities and edges become relationships,
  `orders ||--o{ order_items : "contains"` — pick the cardinality the edge label implies.
- Other kinds (`block`, `class`) → fall back to `flowchart` unless the model clearly carries
  class members.

## The elegant style

Start every `.mmd` with a YAML frontmatter config block so the file renders well anywhere,
not only through our CLI config:

- `theme: base` plus explicit hex `themeVariables` — this kills the default purple. Copy the
  palette for the model's `theme` from `${CLAUDE_PLUGIN_ROOT}/assets/mermaid/config.light.json`
  or `config.dark.json`.
- `layout: elk` for orthogonal edge routing.
- Generous spacing: `nodeSpacing: 50`, `rankSpacing: 70`.
- In flowcharts, style by role with `classDef` and one `class n1,n2 datastore;` line per role —
  same hues as the config palette (indigo services, emerald datastores, amber queues, sky
  gateways, dashed slate externals).
- Backtick-markdown labels wrap and allow emphasis: ``db["`**Postgres**\norders, payments`"]``.
- Labels in sentence case; edge labels are a short verb or protocol ("writes to", "gRPC").

## Render (three artifacts per diagram)

1. Write `<name>.mmd` — `name` is the kebab-case slug of the model title.
2. Render the raster:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/render-mermaid.mjs" <name>.mmd <name>.jpeg --theme <theme>
   ```
   The script needs `mmdc` (`npm i -g @mermaid-js/mermaid-cli`). It renders a PNG at scale 3 with
   the logos and devicon icon packs, then converts to JPEG via ImageMagick or sharp; with neither
   present it keeps the PNG and warns.
3. `<name>.drawio` — produced by the **drawio-diagrams** skill (`mermaid-to-drawio.mjs`) from the
   same diagram model. Do not build it here.

Always write the `.mmd` first; a failed render must never cost the source artifact.
