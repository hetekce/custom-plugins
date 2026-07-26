# Deriving a brand colour

Read this when a product has no brand colour and one has to be chosen. The goal is a hue you can
defend in a sentence, not a hue you liked.

The accent hue is the only genuinely arbitrary value in the whole direction. Everything else is
derived or measured. So it is the one place where the reasoning has to be written down.

## What the accent is actually for

Before choosing, be clear what the colour has to survive.

In this system the primary action is **ink**, not accent. The accent carries links, focus rings
and selection, and nothing else. That is a real constraint that makes the choice easier: the
accent never has to hold white text at button size, so it can stay dark enough to pass 4.5:1 as
text on the page. A hue that would fail as a button fill can still work here.

If a product genuinely needs an accent-filled primary button, say so explicitly and record it as
a decision — but know that it forces the accent lighter or the text heavier, and it is the reason
so many products end up with one more colour than they wanted.

## The four constraints, in order

Apply these in order. The first three are mechanical; only the fourth is taste.

### 1. It must be able to carry text

Not every hue survives the trip. In sRGB, chroma and contrast trade against each other: at OKLCH
hue 245 blue peaks at chroma 0.172, and only at a lightness far too light to clear 4.5:1 on white.

Yellow and yellow-green survive the arithmetic but not the intent. Hue 100 does produce a text
grade — `#867601` — which passes at 4.55:1 and is olive. If you picked a yellow because you
wanted a yellow brand, the accessible version of it is a colour you did not choose. That is worth
knowing before it is in the file, not after.

Check it rather than guessing:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/brand.mjs probe --hue 245
node ${CLAUDE_PLUGIN_ROOT}/scripts/brand.mjs scan          # every hue, with verdicts
```

If a hue cannot produce a text grade, it is not disqualified — it can still be a
boundary-and-icon colour. But that has to be a stated decision, not a discovery made later.

### 2. It must not collide with the status roles

Success is hue 150, warning 70, danger 27. An accent within about 25 degrees of any of those will
be read as a status signal, especially at small sizes and especially by someone glancing rather
than reading.

This matters most on status-dense products — dashboards, monitoring, anything where most of the
pixels are already carrying state. On a content product it matters less.

The scan command flags collisions automatically.

### 3. It must survive both modes

The hue is shared across light and dark; only chroma and lightness are retuned. A hue that reads
well on white and turns muddy on near-black is a hue you will fight forever. Green gains chroma
into dark, blue and red lose it — that asymmetry is already handled by the solver, but a hue at
the edge of the gamut has less room to be retuned.

### 4. Then, and only then, taste

Now the arbitrary part, and the place to spend one sentence of judgement.

**Which bands are exhausted.** Hue 260-290 is saturated with fintech and developer-tool brands —
Stripe, Linear, Qonto and a hundred others sit there. Choosing it is choosing to look like them.
That is occasionally the right call in a market where looking established matters more than
looking distinct; say so if it is.

**What the emotional job needs.** This is where the direction's stated feeling does real work:

- A surface someone must **trust with money or records** wants restraint. The accent should be
  scarce and slightly dark. Avoid anything that reads as promotional.
- A surface someone **watches for problems** wants the accent far from every status hue, so the
  interface's own chrome never looks like an alert.
- A surface someone **browses for opportunity** can carry a warmer, more forward accent, because
  the job is to invite rather than to settle.
- A surface used **for hours in dark** benefits from a cooler neutral and a lower-chroma accent;
  saturated colour on near-black vibrates, which is why Geist desaturates its accents about 7%
  for dark.

**What the market already means.** Colour meaning is not universal. Red is loss in most Western
markets and can read as fortune in parts of East Asia; white carries mourning associations in
some. If the product ships somewhere you do not know, say you do not know rather than assuming.

## The neutral is a decision too

The neutral hue is not "grey". A pure grey reads as unconsidered; a neutral with a slight bias
reads as chosen.

- **Warm** (hue 60-100, chroma under 0.013) — softens a dense or administrative product. Linear
  moved from cool to warm in 2026 for exactly this reason. Good when the product is read for a
  long time by someone who is tired.
- **Cool** (hue 230-270, chroma under 0.013) — recedes further behind status colours, and sits
  better under a dark-first design. Good when the screen is instrumentation.
- Keep chroma under about 0.013 either way. Above that it stops being a neutral and starts being
  a colour, and every status badge then has to fight it.

## Write down what you chose

One sentence in `brand.rationale`, and an entry in `decisions` if the choice was close. Name what
you rejected and why — "not 265, because that is where every fintech already sits" is a sentence
someone can argue with in six months. "A calm, trustworthy blue" is not.
