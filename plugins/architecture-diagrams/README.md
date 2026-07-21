# architecture-diagrams

Turn a plain description of a system — or an existing codebase — into a clean architecture diagram.
Outputs **Mermaid** (`.mmd` + rendered SVG/PNG) and **Gliffy** (`.gliffy` JSON you can import into
Confluence or the Gliffy app). Diagrams come out with real tech-stack icons, aligned labels, a
deliberate (non-default) visual style, and captions that read like a person wrote them.

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

- **Format:** Mermaid by default; Gliffy on request; both with `both`.
- **Diagram types:** architecture (logos + groups), flowchart, C4-style container/context, block, and
  sequence — chosen to fit what you're describing.
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
| Skill | `mermaid-diagrams` | Authoring elegant Mermaid and rendering it to SVG/PNG. |
| Skill | `gliffy-diagrams` | Authoring `.gliffy` JSON for Confluence / the Gliffy app. |
| Skill | `tech-stack-icons` | Resolving, fetching, and rasterizing technology logos. |
| Skill | `diagram-copywriter` | Making titles, labels, and captions read like a human wrote them. |

## Requirements

- **Mermaid rendering:** [`@mermaid-js/mermaid-cli`](https://github.com/mermaid-js/mermaid-cli) (`mmdc`).
  The render script checks for it and prints an install hint if it's missing. `.mmd` source is always
  written even when `mmdc` isn't installed.
- **Icon rasterization (optional):** `resvg` or `rsvg-convert` for SVG→PNG. Falls back to inline SVG or
  Iconify pack references when neither is present.

## License

[MIT](LICENSE) © Hasan Emre Tekce. Bundled/fetched icons keep their own licenses — see [`NOTICE`](NOTICE).
