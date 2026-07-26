// Assembles design/direction.json — the artifact every generated prompt is rendered FROM.
//
// Prose drifts; a file diffs. Anything stated here is a decision that can be changed in one
// place and shows up in every future prompt, and a decision that changed without a reason is
// visible in review. The `decisions` array is where the reason lives.

import { buildTokens, RAMP_ROLES } from "./tokens.mjs";
import { localeRules } from "./locale.mjs";

export const DIRECTION_VERSION = "1.0.0";

// Two regimes, stated openly. No shipping system uses a single clean modular ratio: Stripe
// runs ~1.15 at reading sizes widening to ~1.5 at display; Geist collapses from 1.25 to 1.14
// at the small end. Pretending one ratio covers both produces headings that are too small on
// desktop or body text that is too large on mobile.
function typeScale(loc) {
  const glyphs = loc.typography?.rule
    ? ` ${loc.typography.rule}`
    : " Must carry the full character set of every language the product ships in.";
  return {
    families: {
      ui: {
        role: "everything — prose, UI, headings",
        requirement:
          `one variable family, self-hosted, no CDN, with tabular numerals.${glyphs}`,
        fallback: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      },
      mono: {
        role: "identifiers and operational strings only — reference codes, IDs, paths, commands, keys",
        never: "prose, labels, or headings",
        fallback: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      },
    },
    regimes: {
      ui: {
        ratio: 1.125,
        use: "controls, labels, table cells, form fields, body copy",
        steps: [
          { name: "label", px: 13, lineHeight: 1.5 },
          { name: "compact", px: 15, lineHeight: 1.5 },
          { name: "body", px: 16, lineHeight: 1.55 },
          { name: "lede", px: 18, lineHeight: 1.5 },
          { name: "subsection", px: 20, lineHeight: 1.4 },
        ],
      },
      display: {
        ratio: 1.333,
        use: "page titles and section headings only",
        steps: [
          { name: "section", px: 24, lineHeight: 1.3 },
          { name: "title", px: 32, lineHeight: 1.15 },
          { name: "page-title", px: 43, lineHeight: 1.08 },
        ],
      },
    },
    weights: {
      available: [400, 500, 600],
      ceiling: 600,
      why: "Geist stops at 600 and has no 700; Stripe sets display at 300; Linear's signature is 510. Hierarchy comes from small weight shifts, not from shouting.",
    },
    tracking: loc.tracking,
    measure: {
      reading: "68ch",
      headline: "20ch",
      why: "Geist's published reading width. Beyond it the eye loses the line return.",
    },
    minimums: {
      bodyLineHeight: loc.bodyLineHeight,
      inputFontSize: 16,
      why: "Inputs stay at 16px because anything smaller triggers zoom on iOS.",
    },
  };
}

function space() {
  return {
    base: 4,
    scale: [4, 8, 12, 16, 24, 32, 48, 64],
    rhythm: { tight: 8, copy: 16, group: 32, section: 64 },
    why: "Linear, Geist and Revolut all run a 4px base; Stripe runs 8. Four gives finer density control and every reference section rhythm lands on it.",
    rule: "A screen never contains a spacing value that is not on the scale.",
  };
}

function shape() {
  return {
    radii: { control: 4, surface: 6, container: 8, pill: 9999 },
    pillRule: "Pills are for status badges only. Never on an action — Stripe bans pill radii on buttons.",
    elevation: [
      { name: "flat", light: "none", dark: "none", use: "page and canvas" },
      {
        name: "raised",
        light: "0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.06)",
        dark: "0 0 0 1px rgba(255,255,255,0.08)",
        use: "cards, table containers",
      },
      {
        name: "overlay",
        light: "0 8px 16px -4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.08)",
        dark: "0 0 0 1px rgba(255,255,255,0.12), 0 8px 24px rgba(0,0,0,0.6)",
        use: "modal, drawer, popover, toast",
      },
    ],
    bordersVsShadows:
      "Borders carry structure; shadows only mark what floats above the page. In dark the shadow is dropped and a white-alpha ring carries elevation, because a drop shadow does not read on near-black.",
  };
}

function motion() {
  return {
    durations: { state: 150, disclosure: 200, route: 220, confirmation: 400 },
    easings: {
      standard: "cubic-bezier(0.4, 0, 0.2, 1)",
      exit: "ease-out",
    },
    animates: [
      { what: "state change — hover, press, selection", duration: 150, easing: "ease-out", properties: ["opacity", "transform"] },
      { what: "disclosure — accordion, drawer, popover", duration: 200, easing: "cubic-bezier(0.4, 0, 0.2, 1)", properties: ["transform", "opacity"] },
      { what: "route transition", duration: 220, easing: "cubic-bezier(0.4, 0, 0.2, 1)", properties: ["opacity"] },
      { what: "confirmation that a committed, hard-to-undo action succeeded — once, at the peak", duration: 400, easing: "ease-out", properties: ["transform", "opacity"] },
    ],
    neverAnimates: [
      "a value the person is reading — figures do not count up or re-flow under the eye",
      "a row or item under the reader's cursor",
      "anything that delays the person completing their task",
      "layout properties (width, height, margin, padding) — transform and opacity only",
    ],
    reducedMotion: {
      behaviour: "Transform and layout animations are disabled; opacity and colour survive.",
      rule: "Motion is never the only signal that something happened. Every animated state change also changes text, icon, or shape.",
      why: "Motion's published contract, the cleanest of the systems studied. Reduced motion is a designed state, not a fallback.",
    },
    deletionTest:
      "Disable every animation. If the flow does not feel broken, the animation was decoration and is removed.",
  };
}

function density(loc) {
  return {
    modes: {
      compact: { controlHeight: 32, rowHeight: 32, use: "data tables on pointer devices" },
      default: { controlHeight: 36, rowHeight: 44, use: "forms and general UI on pointer devices" },
      touch: { controlHeight: 44, rowHeight: 48, use: "any touch input" },
    },
    minimumTouchTarget: 44,
    rule: "Density is one token swap, not a redesign. Touch targets never fall below 44x44 regardless of mode.",
    why: loc.density?.why ?? "44px is the WCAG target-size floor for a touch target.",
  };
}

function responsive() {
  return {
    referenceWidths: [360, 768, 1280],
    approach: "mobile-first; layout adapts rather than scales",
    containerQueries:
      "Anything whose width is not the viewport's is sized with container queries, not media queries. A card in a sidebar and the same card in a main column are the same component at different widths.",
    rules: [
      "Nothing scrolls horizontally at 360px. Wide content (tables, code) scrolls inside its own overflow-x container.",
      "Grid and flex children carry min-width: 0, so a long string cannot force the page wider.",
      "Touch targets are at least 44x44 at every width.",
      "A table becomes a stack of cards below 768px — it does not shrink into unreadable columns.",
    ],
  };
}

/**
 * Build a complete direction object.
 * Throws if the colour system cannot be solved — better to refuse than to ship a palette
 * whose contrast was never established.
 */
export function buildDirection({
  product,
  brand,
  localeCode = "en",
  primaryMode = "light",
  decisions = [],
  createdAt,
}) {
  const loc = localeRules(localeCode);

  const { modes, measured, failures } = buildTokens({
    accentHue: brand.accentHue,
    neutralHue: brand.neutralHue ?? 85,
  });

  if (failures.length) {
    throw new Error(
      `the colour system does not hold: ${failures.length} pairing(s) fail.\n` +
        failures.map((f) => `  ${f.mode} ${f.pair}: ${f.ratio}:1 (needs ${f.required})`).join("\n")
    );
  }

  return {
    $schema: "./direction.schema.json",
    directionVersion: DIRECTION_VERSION,
    createdAt,
    product,
    brand: {
      accentHue: brand.accentHue,
      neutralHue: brand.neutralHue ?? 85,
      source: brand.source,
      rationale: brand.rationale,
    },
    color: {
      space: "OKLCH",
      why: "Equal HSL lightness is not equal perceived lightness. Stripe rebuilt in CIELAB, Linear in LCH, Geist in OKLCH — all for this reason.",
      primaryMode,
      rampRoles: Object.fromEntries(RAMP_ROLES),
      modes,
      accentBudget: {
        rule: "At most one accent visible per screen. The primary action is ink, not accent.",
        accentIsFor: ["links", "focus rings", "selected state"],
        accentIsNeverFor: ["button fills", "section backgrounds", "decorative panels"],
        why: "Vercel states it as policy — design in monochrome first, and their primary CTA is ink. Revolut bans its accent as a button surface; Framer reserves blue for links, focus and selection.",
      },
      colorIsNeverTheOnlySignal:
        "Every status carries a word and a glyph as well as a colour. Remove colour entirely and the screen still parses.",
      measured,
    },
    type: typeScale(loc),
    space: space(),
    shape: shape(),
    motion: motion(),
    density: density(loc),
    responsive: responsive(),
    locale: loc,
    accessibility: {
      target: "WCAG 2.2 AA",
      contrast: "Measured with the SC 1.4.3 formula, never estimated. Every pairing above carries its ratio.",
      focus: "Visible focus on every interactive element, at 3:1 against the adjacent surface.",
      keyboard: "Every interactive element reachable and operable by keyboard.",
      colorIndependence: "Colour is never the only carrier of meaning.",
    },
    decisions,
  };
}
