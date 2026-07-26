---
name: brand-identity
description: Choose a product's brand colour on mechanical grounds, and generate image-model prompts for a logo, mark or supporting illustration. Use when a product has no brand colour, when an existing one needs checking against the interface it has to survive in, or when brand assets are needed.
argument-hint: [what the brand is for, or a hue to check]
---

# Brand identity

Two jobs, and they are different. The colour is a decision the plugin can make and defend. The
mark is a decision a person makes, which the plugin can only give them something to react to.

## Say this before generating a mark

Do not let the user believe a generated logo is a logo. State it plainly, once, in your own words:

> A generated mark is a starting point, not an identity. It is worth doing because reacting to a
> real shape beats staring at a mood board, and because it stops the design tool inventing its own
> brand. It is not worth shipping unexamined — trademark clearance, redrawing as real vector
> artwork, and checking it at 16px are things only a person can do, and they are exactly where
> generated marks fail.

The script prints this on stderr after every render so it survives being piped to a file. Do not
suppress it.

## Choosing the colour

Read `${CLAUDE_PLUGIN_ROOT}/skills/design-direction/references/brand-colour.md` first. It sets out
the four constraints in order — three mechanical, one taste.

Then interrogate hues rather than picking one:

```bash
# every hue with a verdict; --status-dense if most of the product's pixels already carry state
node ${CLAUDE_PLUGIN_ROOT}/scripts/brand.mjs scan --step 15

# one hue in detail: what it can carry in both modes, and what it collides with
node ${CLAUDE_PLUGIN_ROOT}/scripts/brand.mjs probe --hue 245
```

The scan tells you which hues clear the mechanical constraints. It does **not** tell you which to
pick — that is the one sentence of judgement you owe the user, and it belongs in
`brand.rationale`.

Two things worth knowing before you commit:

- **A hue can pass the arithmetic and fail the intent.** Hue 100 produces an accessible text grade
  of `#867601`, which is olive. If the user asked for yellow, the accessible version is a colour
  they did not choose. Say so before it is in the file.
- **An existing brand colour may not survive as text.** If the user has one, probe it. If it can
  only hold borders and icons, that is a real finding — report it and propose using ink for the
  primary action, which is what this system does anyway.

## Generating brand assets

Assets are rendered from the direction file, so they cannot drift away from the interface's
palette. Write an `identity.json` next to it:

```json
{
  "feeling": "what the product should make someone feel — the same sentence as the direction",
  "mark": {
    "kind": "wordmark | lettermark | abstract",
    "text": "required for wordmark and lettermark — the exact string",
    "idea": "one sentence: what the mark has to communicate",
    "construction": "optional: the grid and stroke discipline",
    "antiGoals": ["shapes to refuse, specific to this product"]
  },
  "imagery": {
    "kind": "empty-state illustration",
    "placement": "exactly where it appears",
    "moment": "who is looking at it and why",
    "says": "the idea it must communicate without a caption",
    "motif": "optional: where the visual language comes from in the product's own world"
  }
}
```

Then:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/identity.mjs mark    --identity identity.json > brand/mark.prompt.txt
node ${CLAUDE_PLUGIN_ROOT}/scripts/identity.mjs imagery --identity identity.json > brand/imagery.prompt.txt
```

Hand the prompt to the image model. The user runs it; you do not.

## What the generated prompt already decides

So you do not repeat it, and do not weaken it: the prompt already fixes the single colour and its
inversion, the grid and stroke discipline, optical rather than metric centring, clear space, a
square canvas with no lockup, and a refusal list covering gradients, bevels, swooshes, globes,
lightbulbs, rockets, handshakes, puzzle pieces, gloss, and any second colour. It ends with five
pass conditions including legibility at 16px and redrawability from memory.

Add to that list when the product has a specific shape to avoid. Do not remove from it.

## The one field that matters

`mark.idea` is the only genuinely human input, and a vague one produces a generic mark. Push for
something with a subject:

- weak: "modern, trustworthy, tech"
- workable: "a relay handing something on — the moment of transfer, not the runner"

If the user cannot say what the mark is *of*, say so rather than generating something that will
look like every other mark in the category.
