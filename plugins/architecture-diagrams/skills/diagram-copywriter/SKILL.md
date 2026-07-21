---
name: diagram-copywriter
description: Polish the text of a diagram model — title, node labels, edge labels, and summary — so it reads like a person wrote it, not AI. Use whenever a diagram-model JSON exists and before any renderer skill runs.
---

# Diagram copywriter

Edit the diagram-model JSON in place (see `${CLAUDE_PLUGIN_ROOT}/schema/diagram-model.schema.json`).
Touch only `title`, `summary`, and the `label` fields on groups, nodes, and edges. Never rename ids,
change structure, or render — renderers run after this pass.

## Procedure

1. **Title.** Name the system and the view: "Checkout flow — container view", not "Architecture
   Diagram" or "System Overview". Sentence case, no trailing punctuation.
2. **Node labels.** Real names, not placeholders — `Payments API`, `Postgres (orders)`, `Redis cache`;
   never `Service A` or `Component 1`. Sentence case. Give siblings parallel grammar: if one node in a
   group is "Order service", its peers are "Billing service" and "Shipping service", not "Handles
   billing" and "The shipper".
3. **Edge labels.** A verb or a protocol/noun, a few words: `writes to`, `gRPC`, `publishes
   order.created`. Cut anything longer — long edge labels wreck routing.
4. **Summary.** Two or three plain sentences a reviewer would actually write. Delete "This diagram
   illustrates…" openers; start with the system.
5. **AI-tell sweep.** Grep every text field against the checklist in
   `${CLAUDE_PLUGIN_ROOT}/skills/diagram-copywriter/references/ai-tells.md` (banned words, banned
   phrases, banned structures). Rewrite every hit in plain words, active voice.

Then reread the whole model once. If any line could open a generic blog post, rewrite it.

## Example

Before:

```json
{
  "title": "System Architecture Diagram (AI-Generated)",
  "summary": "This diagram illustrates the seamless integration of robust microservices, leveraging cutting-edge technology to deliver a scalable, reliable, and efficient platform.",
  "kind": "architecture",
  "nodes": [
    { "id": "svc_a", "label": "Service A", "role": "service", "tech": "nodejs" },
    { "id": "db", "label": "Database Component", "role": "datastore", "tech": "postgresql" }
  ],
  "edges": [
    { "from": "svc_a", "to": "db", "label": "utilizes for persisting data seamlessly" }
  ]
}
```

After:

```json
{
  "title": "Order intake — container view",
  "summary": "The order API receives orders from the storefront and stores them in Postgres. It is the only writer; reporting reads a replica.",
  "kind": "architecture",
  "nodes": [
    { "id": "svc_a", "label": "Order API", "role": "service", "tech": "nodejs" },
    { "id": "db", "label": "Postgres (orders)", "role": "datastore", "tech": "postgresql" }
  ],
  "edges": [
    { "from": "svc_a", "to": "db", "label": "writes to" }
  ]
}
```

Full avoid/prefer reference with sources:
`${CLAUDE_PLUGIN_ROOT}/skills/diagram-copywriter/references/ai-tells.md`
