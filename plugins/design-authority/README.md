# design-authority

Turn a one-line request into a Claude Design prompt that has already made every decision the
design tool would otherwise make badly.

You type *"an invoice screen for a tradesman buying leads"*. You get back three hundred lines
specifying the colour system with every contrast ratio measured, the type scale and its two
ratios, what moves and what must never move, every component state, and the checks the mockup has
to pass. You run it in Claude Design, export, and hand it to Claude Code to build.

The bar it is built to: **two independent runs of the generated prompt should produce two
executions of the same design.** If they produce two different designs, the prompt was not
decisive enough.

## Install

```
/plugin marketplace add hetekce/custom-plugins
/plugin install design-authority@custom-plugins
```

No dependencies, no accounts, no network calls. Everything runs on the Node that ships with your
machine.

## Use

```
/design-authority:design-direction   a product for reconciling supplier statements
/design-authority:design-screen      the reconciliation screen
/design-authority:brand-identity     we have no brand colour yet
```

The first run writes `design/direction.json` in your repo — the product's design system as a file.
Every later screen is rendered from it, so screen five is consistent with screen one because both
read the same file, not because anyone remembered.

### Order matters, in one place

The direction file is built **from** the accent hue, and brand assets are rendered **from** the
direction. So the two halves of `brand-identity` sit on opposite sides of it:

```
1. brand-identity   choose the hue          ─┐  only if you have no brand colour
2. design-direction write direction.json    ─┘  needs brand.accentHue to exist
3. design-screen    render a screen prompt      one per screen, all inherit the direction
4. brand-identity   generate a mark             needs direction.json for its colours
```

Ask for a logo before a direction exists and the plugin will decline rather than invent a palette
— otherwise the mark and the interface end up as two different brands.

You run the outputs yourself: the screen prompt goes into Claude Design, the mark prompt goes into
the image model. The plugin generates; it does not call them.

### Seeding a design tool's own design system

Claude Design keeps a design system at the organization level: set it up once and later projects
inherit it, from inputs including a codebase or a document. Export both from the direction:

```
direction.mjs export
```

- `design/tokens.css` — CSS custom properties for both modes, primitives aliased to semantic
  names. This is a codebase-shaped input for the design tool **and** the exact artifact the
  Angular contract requires, so it does double duty.
- `design/design-system.md` — the rules a token file cannot carry: the accent budget, what must
  never move, and why each decision was made.

Both are generated, never edited. `direction.json` stays the single source of truth, which is what
keeps the repo and the design tool from drifting into two different systems. Re-export whenever a
decision changes.

The export refuses if the direction no longer holds — a token file that quietly fails contrast is
worse than none, because everything downstream inherits it.

## What it decides for you

- **The whole colour system.** A twelve-step role-mapped neutral ramp and five semantic roles, in
  light and dark, each mode tuned separately rather than inverted. Authored in OKLCH, because
  equal HSL lightness is not equal perceived lightness.
- **Every contrast ratio, measured.** Not estimated, not assumed — computed with the WCAG 2.2
  formula against every surface a colour actually sits on. A recent build measures 52 pairings.
- **The type scale**, as two declared regimes rather than one ratio pretending to cover both,
  with a weight ceiling, tracking rules, and a reading measure.
- **Space, shape and elevation**, including what carries depth in dark mode where a shadow does
  not read.
- **Motion**: named durations and easings, what animates, and an explicit list of what must never
  move — plus the reduced-motion contract.
- **Locale mechanics** for the market you name: how much a translated string may expand, where a
  long word may break, and how money, dates and numbers are written.

## What it deliberately leaves open

- **The brand hue.** It will derive one and defend it, or check one you already have — but it is
  the only genuinely arbitrary value in the system and it says so.
- **The emotional job of each screen.** What someone should feel in the first two seconds is the
  one thing the plugin cannot infer, and it asks rather than inventing.
- **What the mark is *of*.** For a logo, the one substantive human input is the idea. "Modern and
  trustworthy" produces a mark that looks like everyone else's.
- **The actual visual execution.** Claude Design still designs. This decides the constraints it
  designs within.

## It refuses

Prompts are rendered from the direction file, never hand-written, and rendering stops when
something is underspecified. It exits non-zero and names each gap with a fix rather than filling
it with an adjective. It fails on:

- a colour pair with no measured ratio, or a stored ratio that no longer matches its colours
- a component missing any of its states, or with no stated `never`
- a motion rule without both a duration and an easing
- a screen with no defined empty, loading or error composition
- a responsive rule naming a viewport where it should name a container
- a sentence that would survive being copied into an unrelated product

That last check caught its own author: three status colours passed on the page and then failed at
4.04:1, 4.00:1 and 3.96:1 on their badge tints, because the pairing had never been enumerated.

## The direction file

`design/direction.json` is committed to your repo. Change a decision there and every future
prompt changes; change one without a reason and it shows up in a diff. Prose belongs beside it in
`design/direction.md` as rationale, never instead of it — and every non-obvious call gets an entry
in the file's `decisions` array with its reason, because a design system whose choices cannot be
explained six months later is a stylesheet.

A later screen may **extend** the direction but never silently contradict it. When a screen needs
a rule the direction lacks, the plugin adds it and tells you what it added and why.

## Frameworks

Design knowledge is framework-agnostic; only the implementation contract is per-stack.

- **Angular — supported.** Standalone components, signals, zoneless, OnPush, native control flow,
  Tailwind with tokens as CSS custom properties, self-hosted fonts, separate template and style
  files.
- **React — planned.** Deliberately unwritten until the Angular layer has been used on a real
  screen, because writing it now would mean guessing at what actually causes friction.

Naming an unknown framework is reported, not ignored.

## Brand assets

`brand-identity` also renders prompts for an image model (Gemini's image model, commonly called
Nano Banana) covering a wordmark, lettermark, abstract mark, or supporting illustration — in your
own colours, with a refusal list that image models otherwise walk straight into.

**A generated mark is a starting point, not an identity.** Trademark clearance, redrawing as real
vector artwork, and checking at 16px are things only a person can do, and they are exactly where
generated marks fail. The tool prints that reminder on every render and does not let you suppress it.

## Where the rules come from

`references/research.md` traces every rule to what taught it — Stripe, Linear, Vercel Geist,
Framer, Arc, Revolut, Qonto, Monzo, SAP Fiori, DIN 1450, DIN 5008, W3C, WCAG 2.2 — and marks
whether each source is first-party, measured from production CSS, or a published norm. It also
lists what was **not** established, including one study that failed and never ran.

The colour maths is verified against Geist's published tokens at zero channel deviation.

## Examples

Two, from deliberately unrelated domains, each with its spec, screen, direction file and rendered
prompt:

- `examples/invoice-screen/` — a German B2B money screen, light-first, warm neutral, Angular
- `examples/deploy-dashboard/` — an English developer tool, dark-first, cool neutral, cyan accent

They share no domain-specific code. The market is a pack; nothing is the default.

## Licence

MIT.
