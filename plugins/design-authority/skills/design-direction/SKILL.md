---
name: design-direction
description: Establish a product's design direction once, as a committed file — the colour system with measured contrast ratios, the type scale, spacing, motion and locale rules. Use this the first time a product needs UI, before any screen is designed. Every later screen prompt is rendered from this file.
argument-hint: [what the product is, in one line]
---

# Establish the design direction

One product, one direction file. Screen five is consistent with screen one only because both were rendered from the same file — not because anyone remembered.

## Before you start

Check whether a direction already exists:

```bash
ls design/direction.json 2>/dev/null && node ${CLAUDE_PLUGIN_ROOT}/scripts/direction.mjs show
```

If it exists, **stop**. Do not create a second one. The user wants either a new screen (use `design-screen`) or a change to an existing decision — and a change is an edit to the file plus an entry in its `decisions` array, never a fresh direction.

## What you must find out

Ask only what you genuinely cannot infer from `$ARGUMENTS`, the repository, or the conversation. Most of this is inferable; asking about all of it is a tell that you did not look.

Genuinely cannot be inferred, and must be asked if not stated:

- **The market and content language.** This is a real constraint, not metadata: it decides how much a translated string may expand, where a long word is allowed to break, and how money, dates and numbers are written. If no pack exists for the market, the direction says so explicitly rather than guessing conventions.
- **The emotional job.** What should someone feel in the first two seconds, and what anxiety is being removed. A browsing surface and a settling surface are not the same job and must not look interchangeable.
- **The brand colour**, if one exists. If it does not, say you will derive one and explain the reasoning — do not silently pick blue.
- **Light-first or dark-first.** Both get designed either way; this decides which is tuned first.

Infer, and state what you inferred so it can be corrected:

- the framework, from the repository
- the audience and domain, from the one-line request
- density, from whether the product is data-heavy

## Deriving the brand colour

The direction is built **from** the accent hue — `spec.json` needs `brand.accentHue` before this
skill can write anything. So the hue is settled here, first, not afterwards.

If the product has no brand colour, derive one rather than defaulting. Read
`${CLAUDE_PLUGIN_ROOT}/skills/design-direction/references/brand-colour.md` for the method — it
covers which hue bands are exhausted in which markets, how the emotional job narrows the choice,
and why the accent never needs to survive as a button fill.

Interrogate rather than pick. `brand-identity` wraps this, but the tool is the same:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/brand.mjs scan --step 15   # every hue, with verdicts
node ${CLAUDE_PLUGIN_ROOT}/scripts/brand.mjs probe --hue 245  # one hue in detail
```

If the user already has a brand colour, probe it anyway. It may turn out to carry borders and
icons but not text, which is a real finding worth reporting before it is baked into the file.

State the hue you chose and why in one sentence, before writing anything.

**A mark is a separate job, and it comes later.** Logos and illustrations are rendered from the
colours in `direction.json`, so they cannot be generated until this file exists. Finish the
direction, then use `brand-identity` for assets.

## Writing the file

Write a spec, then build. The spec carries only the decisions; everything else is derived and measured.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/direction.mjs init --spec design/spec.json --out design/direction.json
```

The build **refuses** and exits non-zero if the colour system does not hold — for example if the chosen hue cannot produce an accessible text grade on every surface it must sit on. That is not a bug to work around. Report the failure and pick a different hue, or accept the role as boundary-only.

Spec shape, with a worked example at `${CLAUDE_PLUGIN_ROOT}/examples/invoice-screen/spec.json`:

```json
{
  "product": { "name": "...", "domain": "...", "audience": "...", "nouns": ["..."], "screens": ["..."] },
  "brand": { "accentHue": 245, "neutralHue": 85, "source": "derived|provided", "rationale": "..." },
  "localeCode": "de-DE",
  "primaryMode": "light",
  "decisions": [ { "id": "...", "date": "YYYY-MM-DD", "what": "...", "why": "..." } ]
}
```

`decisions` is not optional padding. A design system whose choices cannot be explained six months later is a stylesheet. Every non-obvious call gets an entry with its reason.

## Then write the rationale beside it

Create `design/direction.md` — prose next to the file, never instead of it. It explains *why*, links each rule to what it came from, and is where a future reader argues with a decision. The file holds the values; the markdown holds the arguments.

## Report back

Tell the user, briefly:

- the three or four decisions you made on their behalf, and why
- how many colour pairings were measured and that they all pass
- what you deliberately left open for them

Then stop. Do not generate a screen prompt in the same breath — the direction is worth reviewing on its own, and a screen built on an unreviewed direction wastes a Claude Design run.
