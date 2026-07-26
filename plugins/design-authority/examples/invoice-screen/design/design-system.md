# Handwerk Leads — design system

buying qualified job leads, and the invoices for them. For: a self-employed German tradesman — Elektriker, Dachdecker, Sanitär — who buys leads between jobs, usually on a phone in a van or a laptop at the kitchen table after hours

Generated from `design/direction.json`. That file is the source of truth; this document and `tokens.css` are rendered from it. Edit the direction, not these.

## How to read the colour system

Equal HSL lightness is not equal perceived lightness. Stripe rebuilt in CIELAB, Linear in LCH, Geist in OKLCH — all for this reason.

The primary designed mode is **light**. The other mode is designed, not inverted — its ramp is tuned separately and its accents carry different chroma.

Each step has a job. It is not a generic palette:

| token | role |
| --- | --- |
| `background-100` | page |
| `background-200` | canvas behind the page |
| `gray-100` | raised surface |
| `gray-200` | hover surface |
| `gray-300` | active surface |
| `gray-400` | border, resting |
| `gray-500` | border, hover |
| `gray-600` | border carrying state |
| `gray-700` | high-contrast fill |
| `gray-800` | text, disabled |
| `gray-900` | text, secondary |
| `gray-1000` | text, primary |

### light

| token | value | role |
| --- | --- | --- |
| `background-100` | `#ffffff` | page |
| `background-200` | `#fbfaf9` | canvas behind the page |
| `gray-100` | `#f5f4f2` | raised surface |
| `gray-200` | `#eeedea` | hover surface |
| `gray-300` | `#e6e5e2` | active surface |
| `gray-400` | `#dfddda` | border, resting |
| `gray-500` | `#ceccc8` | border, hover |
| `gray-600` | `#97948e` | border carrying state |
| `gray-700` | `#838079` | high-contrast fill |
| `gray-800` | `#78746d` | text, disabled |
| `gray-900` | `#6a665f` | text, secondary |
| `gray-1000` | `#23201b` | text, primary |

| role | text | border / icon | tint |
| --- | --- | --- | --- |
| accent | `#0370b2` | `#2293e1` | `#e8f5ff` |
| info | `#0370b2` | `#2293e1` | `#e8f5ff` |
| success | `#027c37` | `#32a155` | `#eaf8ec` |
| warning | `#975f00` | `#c57e06` | `#fdf1e4` |
| danger | `#bf3f38` | `#e7645a` | `#ffeeec` |

### dark

| token | value | role |
| --- | --- | --- |
| `background-100` | `#0a0a09` | page |
| `background-200` | `#050504` | canvas behind the page |
| `gray-100` | `#1b1a18` | raised surface |
| `gray-200` | `#21201e` | hover surface |
| `gray-300` | `#2b2a27` | active surface |
| `gray-400` | `#33322f` | border, resting |
| `gray-500` | `#494744` | border, hover |
| `gray-600` | `#6b6964` | border carrying state |
| `gray-700` | `#898680` | high-contrast fill |
| `gray-800` | `#9b9892` | text, disabled |
| `gray-900` | `#aeaaa4` | text, secondary |
| `gray-1000` | `#efeeeb` | text, primary |

| role | text | border / icon | tint |
| --- | --- | --- | --- |
| accent | `#40a0e9` | `#0e7ec4` | `#0e1f2c` |
| info | `#40a0e9` | `#0e7ec4` | `#0e1f2c` |
| success | `#25b057` | `#028b3f` | `#102214` |
| warning | `#cf8c32` | `#a86b02` | `#271a09` |
| danger | `#ec776c` | `#c5544b` | `#2b1614` |

### Measured contrast

Every pairing below was measured with the WCAG 2.2 formula, not estimated. 52 pairings, 0 failing.

| mode | pairing | ratio | needs | rule |
| --- | --- | --- | --- | --- |
| light | text primary on page | 16.23:1 | 4.5 | SC 1.4.3 |
| light | text primary on raised | 14.76:1 | 4.5 | SC 1.4.3 |
| light | text secondary on page | 5.7:1 | 4.5 | SC 1.4.3 |
| light | text secondary on raised | 5.19:1 | 4.5 | SC 1.4.3 |
| light | text disabled on page | 4.64:1 | 3 | usability floor (1.4.3 exempts disabled) |
| light | border carrying state on page | 3.02:1 | 3 | SC 1.4.11 |
| light | accent text on page | 5.29:1 | 4.5 | SC 1.4.3 |
| light | accent text on raised | 4.81:1 | 4.5 | SC 1.4.3 |
| light | accent text on its own tint | 4.77:1 | 4.5 | SC 1.4.3 |
| light | accent boundary on page | 3.31:1 | 3 | SC 1.4.11 |
| light | info text on page | 5.29:1 | 4.5 | SC 1.4.3 |
| light | info text on raised | 4.81:1 | 4.5 | SC 1.4.3 |
| light | info text on its own tint | 4.77:1 | 4.5 | SC 1.4.3 |
| light | info boundary on page | 3.31:1 | 3 | SC 1.4.11 |
| light | success text on page | 5.32:1 | 4.5 | SC 1.4.3 |
| light | success text on raised | 4.84:1 | 4.5 | SC 1.4.3 |
| light | success text on its own tint | 4.85:1 | 4.5 | SC 1.4.3 |
| light | success boundary on page | 3.29:1 | 3 | SC 1.4.11 |
| light | warning text on page | 5.31:1 | 4.5 | SC 1.4.3 |
| light | warning text on raised | 4.83:1 | 4.5 | SC 1.4.3 |
| light | warning text on its own tint | 4.77:1 | 4.5 | SC 1.4.3 |
| light | warning boundary on page | 3.3:1 | 3 | SC 1.4.11 |
| light | danger text on page | 5.27:1 | 4.5 | SC 1.4.3 |
| light | danger text on raised | 4.79:1 | 4.5 | SC 1.4.3 |
| light | danger text on its own tint | 4.69:1 | 4.5 | SC 1.4.3 |
| light | danger boundary on page | 3.29:1 | 3 | SC 1.4.11 |
| dark | text primary on page | 17.07:1 | 4.5 | SC 1.4.3 |
| dark | text primary on raised | 14.98:1 | 4.5 | SC 1.4.3 |
| dark | text secondary on page | 8.56:1 | 4.5 | SC 1.4.3 |
| dark | text secondary on raised | 7.52:1 | 4.5 | SC 1.4.3 |
| dark | text disabled on page | 6.88:1 | 3 | usability floor (1.4.3 exempts disabled) |
| dark | border carrying state on page | 3.61:1 | 3 | SC 1.4.11 |
| dark | accent text on page | 7:1 | 4.5 | SC 1.4.3 |
| dark | accent text on raised | 6.14:1 | 4.5 | SC 1.4.3 |
| dark | accent text on its own tint | 5.93:1 | 4.5 | SC 1.4.3 |
| dark | accent boundary on page | 4.52:1 | 3 | SC 1.4.11 |
| dark | info text on page | 7:1 | 4.5 | SC 1.4.3 |
| dark | info text on raised | 6.14:1 | 4.5 | SC 1.4.3 |
| dark | info text on its own tint | 5.93:1 | 4.5 | SC 1.4.3 |
| dark | info boundary on page | 4.52:1 | 3 | SC 1.4.11 |
| dark | success text on page | 7:1 | 4.5 | SC 1.4.3 |
| dark | success text on raised | 6.14:1 | 4.5 | SC 1.4.3 |
| dark | success text on its own tint | 5.88:1 | 4.5 | SC 1.4.3 |
| dark | success boundary on page | 4.49:1 | 3 | SC 1.4.11 |
| dark | warning text on page | 7.02:1 | 4.5 | SC 1.4.3 |
| dark | warning text on raised | 6.16:1 | 4.5 | SC 1.4.3 |
| dark | warning text on its own tint | 6.01:1 | 4.5 | SC 1.4.3 |
| dark | warning boundary on page | 4.49:1 | 3 | SC 1.4.11 |
| dark | danger text on page | 6.99:1 | 4.5 | SC 1.4.3 |
| dark | danger text on raised | 6.14:1 | 4.5 | SC 1.4.3 |
| dark | danger text on its own tint | 6.04:1 | 4.5 | SC 1.4.3 |
| dark | danger boundary on page | 4.47:1 | 3 | SC 1.4.11 |

### The accent budget

**At most one accent visible per screen. The primary action is ink, not accent.**

- Accent is for: links, focus rings, selected state
- Accent is never for: button fills, section backgrounds, decorative panels

Vercel states it as policy — design in monochrome first, and their primary CTA is ink. Revolut bans its accent as a button surface; Framer reserves blue for links, focus and selection.

**Every status carries a word and a glyph as well as a colour. Remove colour entirely and the screen still parses.**

## Typography

- UI face: one variable family, self-hosted, no CDN, with tabular numerals. The typeface must carry ß and capital ẞ (U+1E9E) and well-drawn umlauts. All-caps headings need vertical headroom so Ä Ö Ü are not clipped.
- Mono: identifiers and operational strings only — reference codes, IDs, paths, commands, keys. Never for prose, labels, or headings.
- Weights 400, 500, 600; ceiling **600**. Geist stops at 600 and has no 700; Stripe sets display at 300; Linear's signature is 510. Hierarchy comes from small weight shifts, not from shouting.
- Tracking -0.02em at display, 0 at body. Never negative on any string over 20 characters, at any size.
- Reading measure 68ch; headline max 20ch.

**ui regime** — ratio 1.125, for controls, labels, table cells, form fields, body copy

| step | size | line-height |
| --- | --- | --- |
| label | 13px | 1.5 |
| compact | 15px | 1.5 |
| body | 16px | 1.55 |
| lede | 18px | 1.5 |
| subsection | 20px | 1.4 |

**display regime** — ratio 1.333, for page titles and section headings only

| step | size | line-height |
| --- | --- | --- |
| section | 24px | 1.3 |
| title | 32px | 1.15 |
| page-title | 43px | 1.08 |

## Space, shape, density

- Base 4px. Scale 4, 8, 12, 16, 24, 32, 48, 64. A screen never contains a spacing value that is not on the scale.
- Radii: control 4px, surface 6px, container 8px, pill 9999px.
- Pills are for status badges only. Never on an action — Stripe bans pill radii on buttons.
- Borders carry structure; shadows only mark what floats above the page. In dark the shadow is dropped and a white-alpha ring carries elevation, because a drop shadow does not read on near-black.
- Density is one token swap, not a redesign. Touch targets never fall below 44x44 regardless of mode.

## Motion

| what | duration | easing | properties |
| --- | --- | --- | --- |
| state change — hover, press, selection | 150ms | `ease-out` | opacity, transform |
| disclosure — accordion, drawer, popover | 200ms | `cubic-bezier(0.4, 0, 0.2, 1)` | transform, opacity |
| route transition | 220ms | `cubic-bezier(0.4, 0, 0.2, 1)` | opacity |
| confirmation that a committed, hard-to-undo action succeeded — once, at the peak | 400ms | `ease-out` | transform, opacity |

**Never animates:**

- a value the person is reading — figures do not count up or re-flow under the eye
- a row or item under the reader's cursor
- anything that delays the person completing their task
- layout properties (width, height, margin, padding) — transform and opacity only

**Reduced motion.** Transform and layout animations are disabled; opacity and colour survive. Motion is never the only signal that something happened. Every animated state change also changes text, icon, or shape.

**The deletion test.** Disable every animation. If the flow does not feel broken, the animation was decoration and is removed.

## Responsive

Reference widths 360, 768, 1280. mobile-first; layout adapts rather than scales.

Anything whose width is not the viewport's is sized with container queries, not media queries. A card in a sidebar and the same card in a main column are the same component at different widths.

- Nothing scrolls horizontally at 360px. Wide content (tables, code) scrolls inside its own overflow-x container.
- Grid and flex children carry min-width: 0, so a long string cannot force the page wider.
- Touch targets are at least 44x44 at every width.
- A table becomes a stack of cards below 768px — it does not shrink into unreadable columns.

## Language and locale

Content language: German (de-DE).

German compounds break layouts tuned on English. These rules are not optional in this market.

Never truncate: form labels; table headers — a truncated header destroys the meaning of the whole column; identifiers a person may transcribe (account numbers, tax IDs, reference codes).

- Currency: 1.234,56 € — symbol after the amount, separated by a non-breaking space so they never split at a line break
- Date: TT.MM.JJJJ — two-digit day and month, four-digit year, a fixed 10 characters
- Numbers: Dot-grouped for money; space-grouped in threes for counts. Four-digit numbers are not grouped.

Layout must survive at 360px: Umsatzsteuer-Identifikationsnummer, Benachrichtigungseinstellungen, Gewährleistungsansprüche, Rechnungsempfänger, Leistungszeitraum.

## Accessibility

- **target** — WCAG 2.2 AA
- **contrast** — Measured with the SC 1.4.3 formula, never estimated. Every pairing above carries its ratio.
- **focus** — Visible focus on every interactive element, at 3:1 against the adjacent surface.
- **keyboard** — Every interactive element reachable and operable by keyboard.
- **colorIndependence** — Colour is never the only carrier of meaning.

## Why these decisions

A design system whose choices cannot be explained six months later is a stylesheet.

### The primary action is ink, not accent. Accent is reserved for links, focus rings and selection.

Vercel states it as policy and their own primary CTA is ink; Revolut bans its accent as a button surface; Framer reserves blue for links and focus. It also removes the hardest constraint on the accent — it never needs to carry white text at a large size, so it can stay dark enough to pass 4.5:1 as text.

*(`accent-is-not-a-fill`, recorded 2026-07-26)*

### The neutral ramp is warm (OKLCH hue 85) rather than the conventional cool grey.

Linear moved from a cool blue-ish grey to a warmer one in 2026 for exactly this reason. Accounting software read late in the day should not feel clinical.

*(`warm-neutral`, recorded 2026-07-26)*

### Display tracking is -0.02em, roughly half what the reference systems use, and never negative on strings over 20 characters.

Geist pulls about -5% at display and Framer says explicitly not to reduce it for accessibility. But DIN 1450 requires adequate character spacing and German compounds already produce long unbroken letter runs. Halving keeps the voice on a two-word heading without squeezing Umsatzsteuer-Identifikationsnummer.

*(`halved-display-tracking`, recorded 2026-07-26)*
