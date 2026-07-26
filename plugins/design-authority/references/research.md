# What taught this plugin what

Every rule the plugin emits should be traceable to something observed, not to taste. This file is
where the tracing happens. A rule with no source here is a taste claim, and you are entitled to
argue with it.

Six studies were commissioned: Apple, Stripe + Linear, Vercel/Framer/Arc, money screens
(Revolut/Qonto/Monzo/Stripe), German-market SaaS, and the craft encoded in Figma/Adobe/Canva plus
WCAG contrast maths. **Five returned.** The Apple study failed on a session limit and was never
re-run — see *Gaps* at the end. Nothing in the plugin depends on it.

## Source quality, stated once

- **First-party** — the company's own published documentation, design system, or engineering blog.
  Trustworthy for both the value and the intent.
- **Measured** — third-party extraction of production CSS (Geist's own `vercel-brand.css` is
  first-party; teardowns of Stripe, Linear, Framer and Revolut are measured). Accurate for what
  ships, but not official token names, and marketing-site captures differ from product-app captures.
- **Norm** — a published standard: WCAG 2.2, DIN 1450, DIN 5008, W3C i18n.

Where a rule rests on a measured source alone, it says so.

---

## Colour

**Author in a perceptual space, never HSL.**
Equal HSL lightness is not equal perceived lightness — it is an RGB artifact. `hsl(60,100%,50%)`
reads near-white while `hsl(240,100%,50%)` reads near-black at identical L.
*Four systems arrived here independently:* Stripe rebuilt its palette in CIELAB (first-party,
"Designing accessible color systems"); Linear computes in LCH (first-party, "How we redesigned the
Linear UI"); Vercel Geist publishes in OKLCH (first-party, `vercel-brand.css`); Evil Martians'
OKLCH write-up supplies the maths. **The plugin authors in OKLCH.**

**The ramp is role-mapped, not a generic palette.**
Geist gives each of twelve steps a job: page, hover, active, border resting/hover/state,
high-contrast fill, then disabled/secondary/primary text. *First-party, vercel.com/geist/colors.*
**The plugin uses this structure verbatim.**

**A designed dark mode is provably not an inversion.**
In Geist's published tokens, mid-greys 700/800 are *identical* in both modes, dark gray-800 is
*darker* than gray-700 (the opposite of light), and accent chroma is retuned per mode — blue drops
7%, red 11%, green *gains* 14% because green reads dull on black. An inverted palette cannot
produce that asymmetry. *First-party, `vercel-brand.css`.*
**The plugin hand-tunes each mode's curve separately and scales accent chroma into dark by these
observed deltas.**

**Text is never pure black; dark-mode text is never pure white.**
Stripe `#0a2540`, Geist `#171717` light / `#ededed` dark, Linear `#f7f8f8`, Revolut `#191c1f`.
*Measured, four sources agreeing.* **Both ends of the plugin's ramp are pulled in.**

**Dark elevation is a surface step plus an alpha hairline, not a shadow.**
A drop shadow does not read on near-black. Geist uses white-alpha borders at 7–14% and demotes
shadows entirely; Linear uses `rgba(255,255,255,0.05–0.08)` plus an inset top edge-light; Framer
adds a 0.5px 10%-white top highlight; Revolut ships *zero* drop shadows and separates surfaces by
luminance alone. *Geist first-party; the others measured.*
**The plugin's dark elevation drops the shadow and carries a white-alpha ring.**

**One accent, and it is scarce. The primary action is ink.**
Vercel states it as policy — "design in monochrome first", and their own primary CTA is ink
`#171717`, not blue *(first-party, vercel.com/design.md)*. Revolut bans its accent as a button
surface; Framer reserves blue for "hyperlinks, focus rings, and selected indicators. Never as a
background or button fill"; Qonto's black is text-only. *Measured.*
**The plugin reserves accent for links, focus and selection — which also removes the hardest
constraint on the hue, since it never has to hold white text at button size.**

**Colour is never the only signal.**
Vercel: "Never rely on color alone… pair it with a non-color cue." A Stripe status badge carries
tinted fill *and* a same-hue border *and* darker text *and* the word — four encodings before colour
perception is needed. Monzo prefixes credits with "+" and colours them green, so the sign leads.
*Vercel first-party; Stripe and Monzo measured/observed.*

**A shortcut that does NOT transfer.** Stripe guarantees contrast by scale distance: five steps
apart clears 4.5:1, four steps clears 3:1 *(first-party)*. That holds on an evenly-spaced scale. On
a role-mapped ramp the surface steps are bunched within a few percent and the range is spent on the
text end — **measured on this plugin's own ladder, the worst pair five steps apart came to 1.36:1.**
There is no shortcut. Every pairing is measured individually.

---

## Typography

**No shipping system uses a single modular ratio.**
Stripe runs roughly 1.15 at reading sizes widening to ~1.5 at display — two regimes, openly. Geist
runs ~1.20–1.25 collapsing to ~1.14 at the small end. Adobe-lineage typographic practice sanctions
running two scales: tight (1.125–1.2) for UI chrome, wide (1.333–1.5) for editorial.
*Stripe and Geist measured; the two-scale principle from A List Apart, "More Meaningful Typography".*
**The plugin ships two declared regimes: 1.125 for UI, 1.333 for display.**

**There is a weight ceiling, and it is below bold.**
Geist stops at 600 and has no 700 *(first-party)*. Stripe sets display at weight 300 — at 56px.
Linear's signature is 510, between regular and medium. *Measured.*
**The plugin caps at 600 and states that nothing heavier exists.**

**Negative tracking at display, zero at body.**
Geist about −5% at display and 0 at 16px; Framer states it numerically as 5% of size at display and
about −1% at body; Stripe −1.4px at 56px; Linear −0.022em. Butterick's rule: never letterspace
lowercase body text. *Measured, plus a typographic norm.*
**The plugin applies this, with a locale override — see below.**

**Reading measure 68ch.** Geist's published `--vbg-reading-width`. *First-party.*

**Monospace is for identifiers only.** Vercel: mono is for "code, commands, paths, and operational
identifiers" and nothing else. *First-party.*

**Inputs never below 16px.** Anything smaller triggers zoom on iOS. *Stripe Elements docs,
first-party.*

---

## Space, shape, motion

**4px base.** Linear, Geist and Revolut run 4; Stripe runs 8. Four wins on count and gives finer
density control. *Geist first-party; others measured.*

**Small, square radii read as B2B trust; pills are for badges only.** Stripe uses 4px on buttons and
bans pill radii on actions. *Measured.*

**150–220ms, one easing, compositor properties only.** Vercel defaults to 150ms ease *(measured)*;
Stripe to 220ms `cubic-bezier(0.4,0,0.2,1)` *(measured)*; Motion's published tween default is 0.3s
*(first-party)*. Linear animates only `transform` and `opacity` — never layout properties. *Measured.*

**The deletion test.** Stripe's Checkout designer: "If you disable animations, the flow should feel
broken; if it is not, your animations are superfluous." *First-party (Villar).*
**The plugin states this as a rule the design must survive.**

**Celebration is rationed.** Monzo: "not every moment should hit a peak of magic… if everything is a
highlight then nothing is," with predictability named as the foundation *before* delight.
*First-party.* **The plugin allows one confirmation animation, at the peak, for a committed action.**

**Reduced motion is a designed state.** Motion's published contract — the cleanest of the three
studied — disables transform and layout animations while preserving opacity and colour.
*First-party, motion.dev.* **The plugin adopts it, plus: motion is never the only signal.**

**Values do not move under the reader.** None of the four money products count up a figure or reflow
one under the eye. **This has no first-party citation anywhere — it is observed practice across four
products, and it is labelled as such rather than presented as doctrine.**

---

## Composition

**One focal point, three stops, three hierarchy levels.** Canva's composition guidance: place the
focal point on a rule-of-thirds line rather than dead centre; plan the eye's path as three stops
(landing, secondary, endpoint); encode hierarchy three ways at once — size, contrast, position.
*Published guidance.* **The plugin caps competing elements and requires the screen to state what it
cut.**

**Removal is the mechanism.** Monzo produced the feeling of control by *deleting rows* — one
chronological stream, 40+ transfer types deduped to one row each, bills aggregated, account badges
shown only to multi-account users. Early feature-rich home screens tested as "overwhelming and
confusing" and were cut, across 1,000+ customers and six experiments. *First-party.*
**This is why `composition.cut` is a required field.**

**Structure should be felt, not seen.** Linear's 2026 refresh found borders had "quietly
proliferated" and responded with fewer separators and softer contrast. *First-party.*

---

## Accessibility, as maths

**Contrast ratio** `(L1 + 0.05) / (L2 + 0.05)`, relative luminance
`0.2126R + 0.7152G + 0.0722B` over linearized channels (`c ≤ 0.04045 → c/12.92`, else
`((c+0.055)/1.055)^2.4`). *Norm: W3C Understanding SC 1.4.3.*

**Thresholds.** 4.5:1 normal text, 3:1 large text (≥24px, or ≥18.66px bold) — SC 1.4.3. 3:1 for UI
component boundaries, focus rings and meaningful icons — SC 1.4.11. Disabled controls are exempt.
*Norm.*

**WCAG 2.x is polarity-blind** and overstates contrast for dark pairs; APCA scores polarity, size
and weight but is not a conformance standard today. **The plugin measures with WCAG 2.2 for
compliance and does not claim APCA compliance.**

**Chroma yields to contrast.** sRGB cannot deliver maximum saturation and AA text contrast at once —
at OKLCH hue 245 blue peaks at chroma 0.172, only at a lightness far too light to clear 4.5:1 on
white. *Derived, and verified in this plugin's own tests.*

---

## Locale — a pack, never a default

The German study is the deepest of the six, but German is **not** this plugin's default. The
market-agnostic rules below apply to every product; German is one pack among several.

**Universal.** Wrapping is the default and truncation the exception, recoverable on hover *and*
keyboard focus *(SAP Fiori)*. Never truncate a form label, a table header, or an identifier a person
may transcribe. Grid and flex children need `min-width: 0` or one long string forces the page wider.
Reserve 200–300% expansion for UI strings under 10 characters *(W3C, Text size in translation)*.
The `lang` attribute is required or `hyphens: auto` silently does nothing.

**German pack.** `hyphens: auto; overflow-wrap: break-word; word-break: normal` with
`hyphenate-limit-chars: 6 3 3`; never `break-all`. Compounds break between components, by soft
hyphen placed by the translator. Top-aligned labels. `1.234,56 €` with a non-breaking space,
`TT.MM.JJJJ` dates *(DIN 5008)*. Line-height floor 1.5 and typefaces carrying ß, ẞ and umlauts
*(DIN 1450 measures legibility by x-height)*. **And a genuine conflict:** every reference system
pulls about −5% tracking at display, and Framer says explicitly not to reduce it for accessibility —
but DIN 1450 requires adequate character spacing and German compounds already produce long unbroken
letter runs. **The plugin halves display tracking to −0.02em for German and forbids negative
tracking on any string over 20 characters.** That is a decision, not a finding, and it is recorded
as one.

**Verified first-hand:** sevdesk.de and personio.de both ship `hyphens: auto` with `lang="de"`.

---

## Gaps

- **Apple was never studied.** The agent hit a session limit. It was to be the reference for
  restraint and for motion that never decorates. The convergences above do not depend on it — Apple
  would have corroborated rather than introduced.
- **Several money-screen values are measured, not published.** Revolut's and Stripe's token values
  come from third-party extraction of production CSS. Accurate for what ships; not official names.
- **"Never animate a value" has no first-party source** in any of the four money products. Observed
  practice, labelled as such.
- **German-market SaaS publishes no design tokens.** Personio, sevDesk, Lexware, Qonto and DATEV
  document nothing public. The German rules lean deliberately on SAP Fiori, DIN 5008, DIN 1450 and
  W3C i18n rather than on inference about closed products.
- **Neither Stripe nor Linear publishes motion duration tokens.** Anyone quoting "Linear uses 120ms"
  is guessing. The citable facts are Linear's sub-50ms local-first latency and its compositor-only
  property rule.
