# The .gliffy JSON format (reverse-engineered)

Gliffy does not publish a spec for its `.gliffy` file format. Everything here is
reverse-engineered from files Gliffy itself exports, from the draw.io Gliffy
importer (Apache-2.0), and from the Go structs in
[sindrel/excalidraw-converter](https://github.com/sindrel/excalidraw-converter) (MIT).
Treat it as best-effort: Gliffy may reject or silently normalize fields, and the
format can change without notice.

## Top-level document

```json
{
  "contentType": "application/gliffy+json",
  "version": "1.1",
  "metadata": {
    "title": "Checkout flow",
    "revision": 0,
    "exportBorder": false,
    "loadPosition": "default",
    "libraries": []
  },
  "embeddedResources": { "index": 0, "resources": [] },
  "stage": { ... }
}
```

- `contentType` and `version` are load-bearing; keep them exactly as shown.
- `embeddedResources` carries embedded images. We leave it empty (see the IP note).

## Stage

```json
"stage": {
  "background": "#ffffff",
  "width": 900,
  "height": 500,
  "nodeIndex": 42,
  "gridOn": true,
  "snapToGrid": true,
  "objects": [ ... ]
}
```

`nodeIndex` must be greater than every object/child `id` in the file — Gliffy
uses it to hand out ids for shapes added after import. `width`/`height` should
cover the content bounding box.

## Objects

Every object shares this envelope:

```json
{
  "x": 40, "y": 40, "width": 160, "height": 60, "rotation": 0,
  "id": 10, "uid": "com.gliffy.shape.basic.basic_v1.default.rectangle",
  "order": 3,
  "lockAspectRatio": false, "lockShape": false,
  "graphic": { ... },
  "children": [ ... ],
  "linkMap": []
}
```

- `id` is a numeric id unique across the whole file (children included).
- `order` is the z-order: lower renders behind. Draw group backgrounds first,
  then node rectangles, then lines.
- `uid` names the stencil. We only ever use `com.gliffy.shape.basic.basic_v1.default.rectangle`
  and `com.gliffy.shape.basic.basic_v1.default.line`. Text lives in children and
  needs no `uid` (`"uid": null`).

### Rectangle with a text child

```json
{
  "x": 40, "y": 40, "width": 160, "height": 60, "rotation": 0,
  "id": 10, "uid": "com.gliffy.shape.basic.basic_v1.default.rectangle",
  "order": 3, "lockAspectRatio": false, "lockShape": false,
  "graphic": {
    "type": "Shape",
    "Shape": {
      "tid": "com.gliffy.stencil.rectangle.basic_v1",
      "strokeWidth": 2, "strokeColor": "#6366f1", "fillColor": "#eef2ff",
      "gradient": false, "dropShadow": false, "state": 0, "opacity": 1
    }
  },
  "children": [
    {
      "x": 0, "y": 0, "width": 160, "height": 60, "rotation": 0,
      "id": 11, "uid": null, "order": "auto",
      "graphic": {
        "type": "Text",
        "Text": {
          "tid": null, "valign": "middle",
          "overflow": "none", "vposition": "none", "hposition": "none",
          "html": "<p style='text-align: center;'><span style='font-family: Arial; font-size: 12px; color: #1e293b;'>Order service</span></p>"
        }
      },
      "children": []
    }
  ],
  "linkMap": []
}
```

The child's `x`/`y` are relative to the parent shape. Label styling lives in the
inline HTML, not in the graphic.

### Line with orthogonal routing and endpoint constraints

```json
{
  "x": 200, "y": 70, "width": 140, "height": 60, "rotation": 0,
  "id": 20, "uid": "com.gliffy.shape.basic.basic_v1.default.line",
  "order": 8, "lockAspectRatio": false, "lockShape": false,
  "graphic": {
    "type": "Line",
    "Line": {
      "strokeWidth": 2, "strokeColor": "#64748b", "fillColor": "none",
      "dashStyle": null,
      "startArrow": 0, "endArrow": 2,
      "startArrowRotation": "auto", "endArrowRotation": "auto",
      "ortho": true, "interpolationType": "linear", "cornerRadius": 10,
      "controlPath": [[0, 0], [70, 0], [70, 60], [140, 60]],
      "lockSegments": {}
    }
  },
  "children": [],
  "constraints": {
    "constraints": [],
    "startConstraint": {
      "type": "StartPositionConstraint",
      "StartPositionConstraint": { "nodeId": 10, "px": 1, "py": 0.5 }
    },
    "endConstraint": {
      "type": "EndPositionConstraint",
      "EndPositionConstraint": { "nodeId": 14, "px": 0, "py": 0.5 }
    }
  },
  "linkMap": []
}
```

- `controlPath` points are relative to the line object's own `x`/`y`. With
  `ortho: true` Gliffy re-routes after import, so the path only needs to be
  plausible.
- Constraints glue an endpoint to a shape: `nodeId` is the shape's numeric `id`,
  `px`/`py` are fractional anchors on its bounding box — `(0, 0.5)` left-middle,
  `(1, 0.5)` right-middle, `(0.5, 0)` top-middle, `(0.5, 1)` bottom-middle.
- Arrow codes: `0` none, `1` open, `2` filled block. A dashed line sets
  `dashStyle` to a dash pattern string such as `"4.0,4.0"`.

### Line label

A line label is a Text child of the line object with a `lineTValue` — its
position along the line from 0 (start) to 1 (end), 0.5 = midpoint:

```json
{
  "x": 0, "y": 0, "width": 80, "height": 14, "rotation": 0,
  "id": 21, "uid": null, "order": "auto",
  "lineTValue": 0.5, "linePerpValue": 0, "cardinalityType": null,
  "graphic": {
    "type": "Text",
    "Text": {
      "tid": null, "valign": "middle",
      "overflow": "none", "vposition": "none", "hposition": "none",
      "html": "<p style='text-align: center;'><span style='font-family: Arial; font-size: 11px; color: #64748b;'>writes to</span></p>"
    }
  },
  "children": []
}
```

## Minimal complete example

Two boxes and one labeled arrow — this imports cleanly:

```json
{
  "contentType": "application/gliffy+json",
  "version": "1.1",
  "metadata": { "title": "Minimal example", "revision": 0, "exportBorder": false, "loadPosition": "default", "libraries": [] },
  "embeddedResources": { "index": 0, "resources": [] },
  "stage": {
    "background": "#ffffff", "width": 500, "height": 200, "nodeIndex": 30,
    "gridOn": true, "snapToGrid": true,
    "objects": [
      { "x": 40, "y": 60, "width": 160, "height": 60, "rotation": 0, "id": 1,
        "uid": "com.gliffy.shape.basic.basic_v1.default.rectangle", "order": 0,
        "lockAspectRatio": false, "lockShape": false,
        "graphic": { "type": "Shape", "Shape": { "tid": "com.gliffy.stencil.rectangle.basic_v1", "strokeWidth": 2, "strokeColor": "#6366f1", "fillColor": "#eef2ff", "gradient": false, "dropShadow": false, "state": 0, "opacity": 1 } },
        "children": [
          { "x": 0, "y": 0, "width": 160, "height": 60, "rotation": 0, "id": 2, "uid": null, "order": "auto",
            "graphic": { "type": "Text", "Text": { "tid": null, "valign": "middle", "overflow": "none", "vposition": "none", "hposition": "none", "html": "<p style='text-align: center;'>API</p>" } },
            "children": [] }
        ], "linkMap": [] },
      { "x": 300, "y": 60, "width": 160, "height": 60, "rotation": 0, "id": 3,
        "uid": "com.gliffy.shape.basic.basic_v1.default.rectangle", "order": 1,
        "lockAspectRatio": false, "lockShape": false,
        "graphic": { "type": "Shape", "Shape": { "tid": "com.gliffy.stencil.rectangle.basic_v1", "strokeWidth": 2, "strokeColor": "#10b981", "fillColor": "#ecfdf5", "gradient": false, "dropShadow": false, "state": 0, "opacity": 1 } },
        "children": [
          { "x": 0, "y": 0, "width": 160, "height": 60, "rotation": 0, "id": 4, "uid": null, "order": "auto",
            "graphic": { "type": "Text", "Text": { "tid": null, "valign": "middle", "overflow": "none", "vposition": "none", "hposition": "none", "html": "<p style='text-align: center;'>Database</p>" } },
            "children": [] }
        ], "linkMap": [] },
      { "x": 200, "y": 90, "width": 100, "height": 0, "rotation": 0, "id": 5,
        "uid": "com.gliffy.shape.basic.basic_v1.default.line", "order": 2,
        "lockAspectRatio": false, "lockShape": false,
        "graphic": { "type": "Line", "Line": { "strokeWidth": 2, "strokeColor": "#64748b", "fillColor": "none", "dashStyle": null, "startArrow": 0, "endArrow": 2, "startArrowRotation": "auto", "endArrowRotation": "auto", "ortho": true, "interpolationType": "linear", "cornerRadius": 10, "controlPath": [[0, 0], [100, 0]], "lockSegments": {} } },
        "children": [
          { "x": 0, "y": 0, "width": 60, "height": 14, "rotation": 0, "id": 6, "uid": null, "order": "auto",
            "lineTValue": 0.5, "linePerpValue": 0, "cardinalityType": null,
            "graphic": { "type": "Text", "Text": { "tid": null, "valign": "middle", "overflow": "none", "vposition": "none", "hposition": "none", "html": "<p style='text-align: center;'>writes to</p>" } },
            "children": [] }
        ],
        "constraints": {
          "constraints": [],
          "startConstraint": { "type": "StartPositionConstraint", "StartPositionConstraint": { "nodeId": 1, "px": 1, "py": 0.5 } },
          "endConstraint": { "type": "EndPositionConstraint", "EndPositionConstraint": { "nodeId": 3, "px": 0, "py": 0.5 } }
        }, "linkMap": [] }
    ]
  }
}
```

## Why basic shapes only

Gliffy's stencil library (the `com.gliffy.shape.*` artwork beyond `basic`,
including its network, AWS, and UML sets) is proprietary. Bundling or
re-emitting that artwork would redistribute Gliffy's IP, so this generator
sticks to `com.gliffy.shape.basic.basic_v1` rectangles, lines, and text. The
result is plain but legal, and every element stays editable after import —
users can restyle with Gliffy's own stencils once the file is in their account.
