// Renders image-model prompts for brand assets, from the direction file.
//
// These target an image generation model (Gemini's image model, commonly called Nano Banana).
// The colour, the mark's job and the refusals all come from direction.json, so a brand asset
// cannot drift away from the interface it belongs to.
//
// Honest framing, and the skill repeats it to the user: a generated mark is a starting point,
// not a finished identity. It is worth generating because it gives a real thing to react to
// instead of a mood board, and because it stops the design tool defaulting to its own palette.
// It is not worth shipping unexamined — a logo is a legal and long-lived asset, and the parts
// an image model is worst at (optical balance at small sizes, a clean vector outline, being
// genuinely unlike an existing mark) are exactly the parts that matter most.

const CLEAR_SPACE = "clear space on all sides equal to the cap height of the mark";

// Refusals. Image models reach for these unprompted, and every one of them dates a mark.
const MARK_ANTI_GOALS = [
  "gradients of any kind, including subtle ones",
  "3D extrusion, bevels, embossing, or drop shadows",
  "a generic swoosh, orbit ring, or abstract leaf",
  "a globe, lightbulb, rocket, handshake, puzzle piece, or brain",
  "the letters rendered as a person or a building",
  "glossy highlights or an app-store style rounded-square backing plate",
  "more than one colour",
  "photographic or painterly texture",
  "an outline traced around the whole mark",
];

const IMAGERY_ANTI_GOALS = [
  "stock-photo people pointing at screens",
  "isometric illustration of tiny people on giant objects",
  "a purple-to-blue gradient background",
  "glassmorphism panels or blurred colour blobs",
  "literal depiction of the product's UI",
  "any readable text",
];

function palette(direction, mode) {
  const m = direction.color.modes[mode];
  return {
    page: m.ramp["background-100"].hex,
    ink: m.ramp["gray-1000"].hex,
    accent: m.semantic.accent.text,
  };
}

function article(word) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

function head(direction, asset) {
  const p = direction.product;
  return [
    `Generate ${article(asset)} ${asset} for ${p.name}, ${p.domain}.`,
    `The people who use it: ${p.audience}.`,
    "",
    "This is a design brief, not a mood description. Execute what is stated and nothing else.",
  ].join("\n");
}

function block(title, lines) {
  return `\n${title}\n${"─".repeat(title.length)}\n${lines.filter(Boolean).join("\n")}\n`;
}

function bullets(items) {
  return items.map((i) => `- ${i}`).join("\n");
}

/**
 * A mark: wordmark, lettermark or abstract symbol.
 * `identity.mark.kind` decides which; `identity.mark.idea` is the one substantive human input.
 */
export function renderMarkPrompt(direction, identity) {
  const mode = direction.color.primaryMode;
  const { page, ink, accent } = palette(direction, mode);
  const m = identity.mark;
  const parts = [head(direction, `${m.kind} logo`)];

  parts.push(block("What the mark has to say", [
    `In one idea: ${m.idea}`,
    `It is standing next to an interface whose whole intent is: ${identity.feeling}`,
    m.kind === "wordmark" || m.kind === "lettermark"
      ? `The exact string to set, character for character: "${m.text}". No other text appears.`
      : "No letterforms and no text of any kind appear in the mark.",
  ]));

  parts.push(block("Form", [
    `Construction: ${m.construction ?? "built on a visible geometric grid, with consistent stroke weight throughout"}.`,
    "Flat, single colour, and closed — the shape reads as one object, not as a scene.",
    "Optically balanced rather than mathematically centred: a triangular or diagonal element sits slightly off geometric centre so it looks centred.",
    "Every curve is either a true circular arc or a single smooth transition. No wobbling bezier edges.",
    m.kind === "abstract"
      ? "The symbol is simple enough to be redrawn from memory after one look."
      : "Letterform spacing is even by eye, not by metric — the gaps between characters look equal rather than measure equal.",
  ]));

  parts.push(block("Colour", [
    `Render it in exactly one colour: ${ink} on ${page}.`,
    `It must also survive being recoloured to ${accent}, and inverted to ${page} on ${ink}, without redrawing.`,
    "Do not use the accent as the primary rendering — a mark that only works in its brand colour is a mark that fails on a fax, an invoice, and an embroidered jacket.",
  ]));

  parts.push(block("Composition and output", [
    `A single mark, centred, on a plain ${page} background, with ${CLEAR_SPACE}.`,
    "Square canvas. No lockup, no tagline, no container shape, no border.",
    "Flat vector appearance: hard edges, no anti-aliasing artefacts, no texture, no paper grain.",
    "One version only. Do not produce a sheet of variations.",
  ]));

  parts.push(block("Refuse these", [
    "If the mark would contain any of the following, draw something else instead:",
    bullets([
      ...MARK_ANTI_GOALS,
      m.kind === "abstract" ? "any text or letterform at all" : "any text other than the exact string given",
      ...(m.antiGoals ?? []),
    ]),
  ]));

  parts.push(block("It has to pass these", [
    "1. Legible as a 16px favicon — no detail that disappears below 24px.",
    "2. Recognisable in pure black on pure white, with no colour at all.",
    "3. Recognisable when inverted for dark mode.",
    "4. Redrawable by hand from memory in under ten seconds.",
    "5. Not resembling an existing well-known mark in the same market.",
    m.kind === "wordmark" || m.kind === "lettermark"
      ? `6. The string reads exactly "${m.text}" with no substituted or dropped characters.`
      : "6. Reads as one shape at a glance, not as several shapes arranged together.",
  ]));

  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/** Supporting imagery — empty-state art, backgrounds, texture. */
export function renderImageryPrompt(direction, identity) {
  const mode = direction.color.primaryMode;
  const { page, ink, accent } = palette(direction, mode);
  const im = identity.imagery;
  const parts = [head(direction, im.kind ?? "supporting illustration")];

  parts.push(block("Where it appears and what it is doing", [
    `Placement: ${im.placement}.`,
    `The person seeing it is: ${im.moment}`,
    `It must say: ${im.says}`,
    "An illustration that says nothing is worse than empty space. If the idea cannot be drawn, leave it out.",
  ]));

  parts.push(block("Form", [
    `Style: flat, geometric, drawn with the same stroke weight discipline as the mark.`,
    "Limited to two colours plus the page: the ink and one accent, nothing more.",
    "No perspective, no isometric projection, no depicted people, no depicted screens.",
    im.motif ? `The motif comes from the product's own world: ${im.motif}` : "",
  ]));

  parts.push(block("Colour", [
    `Page ${page}. Ink ${ink}. Accent ${accent}, used on at most a fifth of the drawn area.`,
    `It must also read on the other mode's page. Do not rely on the background being ${page}.`,
  ]));

  parts.push(block("Refuse these", [
    bullets([...IMAGERY_ANTI_GOALS, ...(im.antiGoals ?? [])]),
  ]));

  parts.push(block("It has to pass these", [
    "1. It communicates the stated idea without a caption.",
    "2. It reads at the size it will actually appear, not only at full resolution.",
    "3. Removing it would make the screen worse, not merely emptier.",
    "4. It contains no text.",
  ]));

  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/** What must be checked by a person, stated so it cannot be skipped quietly. */
export const HUMAN_REVIEW = [
  "Trademark search in every market the product ships in. An image model has no knowledge of what is already registered, and this is the failure that costs money.",
  "Redraw as real vector artwork. A generated raster is a sketch; the shipped mark is a path with deliberate curves and hinted small sizes.",
  "Check it at 16px, printed in one colour, and inverted — the three conditions where generated marks usually collapse.",
  "Check it against the market's existing marks by eye. Models regress toward what they have seen most.",
];
