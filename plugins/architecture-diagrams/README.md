# architecture-diagrams

Turn a plain description of a system — or an existing codebase — into clean diagrams.
**Mermaid** for flows (auth, request lifecycles, sequences) and **draw.io** for general
architecture — laid out by draw.io's own engine, with animated flow edges — plus a
best-effort **Gliffy** export. Real tech-stack icons, a deliberate non-default style,
and copy that reads like a person wrote it.

## Examples

Mermaid for flows, draw.io for architecture — both built by the plugin:

| Auth flow — Mermaid sequence | Data platform — draw.io, animated |
| :---: | :---: |
| ![Auth flow](examples/auth-flow.png) | ![Data platform](examples/data-platform.gif) |

More, with the source and how to reproduce them, in [`examples/`](examples).

## Install

```bash
/plugin marketplace add hetekce/custom-plugins
/plugin install architecture-diagrams@custom-plugins
```

## Use

```
/diagram checkout service: React SPA -> API gateway -> orders service (Node) -> Postgres; orders published to Kafka
```

Or point it at code:

```
/diagram the payment module in ./src/payments as a container diagram, Mermaid, dark theme
```

The command asks the `diagram-architect` to work out the right diagram type and the node/edge model,
writes the diagram source, polishes every label with the `diagram-copywriter` skill, resolves
tech-stack icons, and renders the result.

## What you get

- **Format:** picked by what you're drawing. **Flows** (auth, logins, request lifecycles) render as
  **Mermaid**; **architecture** (topology, C4 container/context, block, flowchart, ER) renders as
  **draw.io**, laid out by draw.io's own engine. The two are never mixed. **Gliffy** is produced only
  when you ask for it (`--format gliffy`). Force any format with `--format mermaid|drawio|gliffy|all`.
- **Diagram types:** architecture (logos + groups), flowchart, C4-style container/context, block, ER,
  and sequence — chosen to fit what you're describing.
- **Icons:** ~250 tech logos bundled under [`assets/icons/`](assets/icons) (data engineering, data
  science, databases, cloud, languages, DevOps), generated from permissively licensed sets (Iconify
  `logos`, Devicon, Simple Icons). Nodes with no logo get a modern Lucide icon by role — including a
  clean user/actor icon. Missing ones fall back to a live fetch. See [`NOTICE`](NOTICE) for licensing.
- **Style:** a considered light/dark palette, ELK orthogonal routing, consistent spacing — not the
  default purple.

## Components

| Kind | Name | Role |
| --- | --- | --- |
| Command | `/diagram` | Entry point: description or code path → rendered diagram. |
| Agent | `diagram-architect` | Works out diagram type and the node/edge model from the system. |
| Skill | `mermaid-diagrams` | Authoring elegant Mermaid for flows and rendering it to JPEG. |
| Skill | `drawio-diagrams` | Building architecture as `.drawio`, laid out by draw.io's own engine. |
| Skill | `gliffy-diagrams` | Authoring `.gliffy` JSON for Confluence / the Gliffy app. |
| Skill | `tech-stack-icons` | Resolving, fetching, and rasterizing technology logos. |
| Skill | `diagram-copywriter` | Making titles, labels, and captions read like a human wrote them. |

## Requirements

- **Mermaid rendering:** [`@mermaid-js/mermaid-cli`](https://github.com/mermaid-js/mermaid-cli) (`mmdc`).
  The render script checks for it and prints an install hint if it's missing. `.mmd` source is always
  written even when `mmdc` isn't installed.
- **JPEG output (optional):** ImageMagick (`magick`) or `sharp` converts the rendered PNG to JPEG. With
  neither, a high-resolution PNG is kept instead — no failure.
- **draw.io JPEG (optional):** [`drawio-desktop`](https://github.com/jgraph/drawio-desktop) exports the
  `.drawio` to an image. Without it, the `.drawio` is still written and opens at diagrams.net.
- **Icon rasterization (optional):** `resvg` or `rsvg-convert` for SVG→PNG when embedding logos into
  draw.io/Gliffy. The bundled icons are pre-rasterized, so this only matters for icons fetched live.

## License

[MIT](LICENSE) © Hasan Emre Tekce. Bundled/fetched icons keep their own licenses — see [`NOTICE`](NOTICE).
