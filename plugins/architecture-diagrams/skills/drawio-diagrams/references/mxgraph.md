# mxGraph / .drawio reference

A `.drawio` file is plain XML in the open mxGraph format (Apache-2.0). Everything
`mermaid-to-drawio.mjs` emits follows the patterns below; use them to hand-edit
output or extend the generator.

## File skeleton

```xml
<mxfile host="app.diagrams.net" type="device">
  <diagram id="diagram-1" name="Checkout flow — container view">
    <mxGraphModel dx="800" dy="600" grid="0" gridSize="10" guides="1" tooltips="1"
                  connect="1" arrows="1" fold="1" page="1" pageScale="1"
                  pageWidth="1169" pageHeight="826" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <!-- all vertices and edges go here, parent="1" or a container id -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

Cells `0` and `1` are mandatory scaffolding: `0` is the model root, `1` is the
default layer. For a dark canvas add `background="#0f172a"` to `<mxGraphModel>`.

## Vertex (rounded, role-colored)

```xml
<mxCell id="n_orders" value="Order service"
        style="rounded=1;whiteSpace=wrap;html=1;arcSize=8;fontSize=13;fillColor=#eef2ff;strokeColor=#6366f1;fontColor=#1e293b;"
        vertex="1" parent="1">
  <mxGeometry x="40" y="40" width="160" height="60" as="geometry"/>
</mxCell>
```

Add `dashed=1;` to the style for external systems. Geometry is absolute when
`parent="1"`, relative to the container's origin otherwise.

## Edge (orthogonal)

```xml
<mxCell id="e_0" value="writes to"
        style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;jettySize=auto;orthogonalLoop=1;endArrow=block;endFill=1;strokeColor=#64748b;fontSize=11;labelBackgroundColor=#ffffff;"
        edge="1" parent="1" source="n_orders" target="n_db">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

Variants by `edge.kind`:

| kind | style additions |
| --- | --- |
| `sync` | `endArrow=block;endFill=1;` (solid) |
| `async` | `endArrow=block;endFill=1;dashed=1;` |
| `data` | `endArrow=open;endFill=0;` |
| `bidirectional` | `startArrow=block;startFill=1;endArrow=block;endFill=1;` |

Side hints (`fromSide`/`toSide`) become fixed connection points:
`exitX=1;exitY=0.5;exitDx=0;exitDy=0;` pins the source to its right edge
(`entryX`/`entryY` do the same for the target). L=`0,0.5` R=`1,0.5` T=`0.5,0`
B=`0.5,1`.

## Image vertex (icon with label below)

```xml
<mxCell id="n_pg" value="Postgres"
        style="shape=image;html=1;image=data:image/png,iVBORw0KGgo...;imageBorder=none;verticalLabelPosition=bottom;verticalAlign=top;labelBackgroundColor=none;fontSize=12;fontColor=#1e293b;"
        vertex="1" parent="1">
  <mxGeometry x="240" y="40" width="72" height="72" as="geometry"/>
</mxCell>
```

Note the data URI: draw.io stores it as `data:image/png,<base64>` — a comma, not
`;base64,` — because `;` separates style keys. Embedding the PNG keeps the file
self-contained; a plain URL also works but breaks offline.

## Container (group)

```xml
<mxCell id="g_cloud" value="AWS account"
        style="rounded=1;container=1;collapsible=0;html=1;whiteSpace=wrap;verticalAlign=top;align=left;spacingLeft=12;spacingTop=4;fontSize=12;fontStyle=1;arcSize=6;fillColor=#f8fafc;strokeColor=#cbd5e1;fontColor=#475569;"
        vertex="1" parent="1">
  <mxGeometry x="16" y="16" width="420" height="240" as="geometry"/>
</mxCell>
```

Child cells set `parent="g_cloud"` and their geometry becomes relative to the
container's top-left corner. Containers nest: a child group's `parent` is the
enclosing group's cell id.

## Role color palette

| role | light fill / stroke | dark fill / stroke |
| --- | --- | --- |
| service | `#eef2ff` / `#6366f1` | `#312e81` / `#818cf8` |
| datastore | `#ecfdf5` / `#10b981` | `#064e3b` / `#34d399` |
| queue | `#fff7ed` / `#f97316` | `#7c2d12` / `#fb923c` |
| cache | `#fef2f2` / `#ef4444` | `#7f1d1d` / `#f87171` |
| gateway | `#f0f9ff` / `#0ea5e9` | `#0c4a6e` / `#38bdf8` |
| external | `#f8fafc` / `#94a3b8` | `#1e293b` / `#64748b` |
| actor | `#fdf4ff` / `#a855f7` | `#581c87` / `#c084fc` |
| client | `#f0fdfa` / `#14b8a6` | `#134e4a` / `#2dd4bf` |
| job | `#fefce8` / `#eab308` | `#713f12` / `#facc15` |
| (default) | `#f8fafc` / `#64748b` | `#1f2937` / `#94a3b8` |

Text: `#1e293b` light, `#e2e8f0` dark. Edges: `#64748b` light, `#94a3b8` dark.

## Model field → cell mapping

| model field | mxGraph result |
| --- | --- |
| `title` | `<diagram name="...">` |
| `theme` | palette choice + `background` on dark |
| `direction` | layout axis: `LR`/`RL` ranks as columns, `TB`/`BT` as rows |
| `groups[]` | container cells (`container=1`), nested via `parent` |
| `nodes[].role` | fill/stroke from the palette above |
| `nodes[].icon` (PNG) | `shape=image` vertex, label below |
| `edges[].kind` | arrow/dash variant (table above) |
| `edges[].label` | edge `value` attribute |
| `edges[].fromSide/toSide` | `exitX/exitY` / `entryX/entryY` connection points |

Generated cell ids are prefixed: `n_<id>` for nodes, `g_<id>` for groups, `e_<i>`
for edges, so the two id namespaces in the model can never collide.

## Export to raster

drawio-desktop ships a headless CLI:

```sh
drawio -x -f jpg --no-sandbox -o out.jpg in.drawio
```

`-x` exports, `-f` picks the format (`jpg`, `png`, `svg`, `pdf`), `--no-sandbox`
is required when running as root or in CI containers. If the CLI is missing, the
`.drawio` still opens at https://app.diagrams.net for a manual export.
