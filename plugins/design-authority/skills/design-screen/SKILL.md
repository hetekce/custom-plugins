---
name: design-screen
description: Turn a one-line screen request into a complete Claude Design prompt, rendered from the product's direction file. Use for any screen, flow, empty state or component set once a direction exists. Refuses to emit an underspecified prompt.
argument-hint: [the screen, in one line]
---

# Design a screen

The request is one line. The prompt is three hundred. Everything between the two is decisions, and
the point of this skill is that they get made here rather than by the design tool.

## First, read the direction

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/direction.mjs show
```

No direction file means no screen. Say so and run `design-direction` first — a screen designed
against nothing is the drift this plugin exists to stop.

The direction is **inherited, not re-decided**. Colour, type, space, shape, motion, density,
responsive and locale are already settled. Do not restate them in your own words and do not
contradict them. If the screen genuinely needs a rule the direction does not have, add it to the
direction file with an entry in `decisions` saying what and why, then tell the user what you added.
That is how the system grows deliberately instead of drifting per screen.

## What you decide here

Write `screen.json`. Every field below is required — the renderer refuses without them, and each
one is something the design tool would otherwise invent.

**The intent.** Not a description, an argument.

- `firstThing` — what the person must know before anything else on the page
- `feeling` — what the first two seconds should produce
- `reassurance` — what it is reassuring them about
- `anxiety` — what fear it removes
- `distinctFrom` — why this is not interchangeable with the product's other screens

A screen whose emotional job is unstated ends up looking like every other screen in the product.
That is the single most common reason a mockup is admired and then thrown away.

**The composition.** `leads`, `supports`, `oneClickAway`, `cut`. The last one is the one people
skip and the one that does the work — naming what you removed, and why, is what stops the screen
becoming noise. Cap what may compete for attention at three, and lower for a screen that is
glanced at rather than read.

**The three states.** `empty`, `loading`, `error`, each composed so all three read as the same
product. Say what occupies the space, what is read first, and what can be done next. A skeleton
that shifts when data arrives, or an error that becomes a full-page takeover, are failures you can
prevent here.

**The components**, with every state and a `never`. The renderer knows the required state list per
component and will name what is missing. The `never` is not decoration — a component without a
prohibition drifts the first time someone is in a hurry.

## Render it

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/prompt.mjs --screen screen.json --out screen.prompt.txt
```

**You do not write the prompt.** It is rendered from the direction plus the screen spec, so a
change to a decision changes every future prompt and a decision that changed shows up in a diff.

If it exits non-zero it has refused, and the output names each gap with a fix. Do not work around
it, do not hand-write the missing part, and do not soften a gap with an adjective. Each gap is a
decision: make it, or ask the user. The checks are contrast without a measured ratio, a component
missing a state, a motion rule without duration and easing, a missing empty/loading/error
composition, a responsive rule naming a viewport where it should name a container, and prose that
would survive being copied into an unrelated product.

## Hand it over

Give the user the prompt as a copy-paste block and nothing else in the way. Then, briefly:

- the three or four decisions you made on their behalf, and why
- anything you added to the direction file, and why
- what you deliberately left to Claude Design

Worked examples in two different domains: `${CLAUDE_PLUGIN_ROOT}/examples/invoice-screen/` and
`${CLAUDE_PLUGIN_ROOT}/examples/deploy-dashboard/`.
