// The refusal gate.
//
// This is the part that makes the plugin an authority rather than a well-written brief. A
// prompt is never hand-written: it is rendered from direction.json, and rendering stops if
// any of the checks below finds a gap. A gap is reported and asked about — never smoothed
// over with an adjective.
//
// Every check here exists because the corresponding gap produces a mockup that cannot be
// judged, only admired.

import { contrast, reportRatio, WCAG } from "./color.mjs";

/** Every state an interactive component must define before a screen using it can be rendered. */
export const REQUIRED_STATES = {
  button: ["default", "hover", "focus-visible", "active", "disabled", "loading"],
  link: ["default", "hover", "focus-visible", "visited"],
  input: ["default", "hover", "focus-visible", "filled", "disabled", "error", "readonly"],
  select: ["default", "hover", "focus-visible", "open", "disabled", "error"],
  checkbox: ["default", "hover", "focus-visible", "checked", "indeterminate", "disabled", "error"],
  radio: ["default", "hover", "focus-visible", "checked", "disabled", "error"],
  card: ["default", "hover", "focus-within", "selected"],
  badge: ["default"],
  table: ["default", "row-hover", "row-selected", "sorted", "empty", "loading", "error"],
  pagination: ["default", "hover", "focus-visible", "current", "disabled"],
  modal: ["open", "closing"],
  drawer: ["open", "closing"],
  toast: ["entering", "visible", "leaving"],
  tabs: ["default", "hover", "focus-visible", "selected", "disabled"],
  nav: ["default", "hover", "focus-visible", "current"],
  skeleton: ["loading"],
};

/** A screen is not composed until all three of these are, and they must feel like one product. */
export const REQUIRED_SCREEN_STATES = ["empty", "loading", "error"];

// Sentences that survive being pasted into an unrelated product. If a phrase here appears in
// a prose field, the field is describing nothing.
const HOLLOW_PHRASES = [
  "modern and clean", "clean and modern", "sleek", "cutting-edge", "best-in-class",
  "user-friendly", "intuitive interface", "seamless experience", "visually appealing",
  "eye-catching", "stunning", "beautiful design", "professional look", "polished feel",
  "delightful experience", "engaging experience", "elevate the", "take it to the next level",
  "modern aesthetic", "contemporary design", "clean layout", "crisp and clear",
  "thoughtfully designed", "carefully crafted", "pixel-perfect", "world-class",
  "robust and scalable", "powerful and flexible", "simple yet powerful",
];

// Words that mean nothing on their own in a design instruction.
const EMPTY_ADJECTIVES = [
  "nice", "good", "great", "proper", "appropriate", "suitable", "reasonable",
  "adequate", "decent", "solid", "smooth", "slick",
];

const VIEWPORT_WORDS = /\b(viewport|screen width|window width|media quer(y|ies))\b/i;

class Gaps {
  constructor() { this.items = []; }
  add(check, where, problem, fix) { this.items.push({ check, where, problem, fix }); }
  get ok() { return this.items.length === 0; }
}

/** 1. Every colour pairing the screen relies on carries a measured ratio. */
function checkContrast(direction, gaps) {
  const measured = direction?.color?.measured;
  if (!Array.isArray(measured) || measured.length === 0) {
    gaps.add("contrast", "direction.color.measured",
      "no measured contrast ratios at all",
      "Rebuild the direction file — the colour system must ship with every pairing measured.");
    return;
  }
  for (const row of measured) {
    if (typeof row.ratio !== "number") {
      gaps.add("contrast", `${row.mode} / ${row.pair}`,
        "a colour pair with no measured contrast ratio",
        "Measure it with the SC 1.4.3 formula, or remove the pairing.");
      continue;
    }
    // Trust nothing: re-measure from the hex values rather than believing the stored number.
    if (row.fg && row.bg) {
      const actual = reportRatio(contrast(row.fg, row.bg));
      if (Math.abs(actual - row.ratio) > 0.02) {
        gaps.add("contrast", `${row.mode} / ${row.pair}`,
          `the stored ratio ${row.ratio}:1 does not match the colours (${row.fg} on ${row.bg} measures ${actual}:1)`,
          "The palette changed without re-measuring. Rebuild the direction file.");
      }
      if (actual < row.required) {
        gaps.add("contrast", `${row.mode} / ${row.pair}`,
          `${actual}:1 fails the ${row.required}:1 requirement (${row.rule})`,
          "Re-solve this colour against every surface it sits on.");
      }
    }
  }
  // Both modes must actually be present.
  for (const mode of ["light", "dark"]) {
    if (!measured.some((r) => r.mode === mode)) {
      gaps.add("contrast", `${mode} mode`,
        `${mode} mode has no measured pairings`,
        "Both modes are designed. A mode with no measurements has not been designed.");
    }
  }
}

/** 2. Every component the screen uses enumerates all of its states. */
function checkComponentStates(screen, gaps) {
  for (const [name, spec] of Object.entries(screen?.components ?? {})) {
    const required = REQUIRED_STATES[name];
    if (!required) continue; // unknown component: not our business to invent a state list
    const given = spec?.states ? Object.keys(spec.states) : [];
    const missing = required.filter((s) => !given.includes(s));
    if (missing.length) {
      gaps.add("component-states", `components.${name}`,
        `missing state${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`,
        `Define what ${name} looks like in ${missing.length > 1 ? "each of these states" : "this state"}, including its accessible name.`);
    }
    if (spec && !spec.never) {
      gaps.add("component-states", `components.${name}`,
        "no stated 'never' rule",
        `Say what ${name} must never do. A component without a prohibition drifts.`);
    }
  }
}

/** 3. Every motion rule carries both a duration and an easing. */
function checkMotion(direction, gaps) {
  const m = direction?.motion;
  if (!m?.animates?.length) {
    gaps.add("motion", "direction.motion.animates",
      "no motion rules defined",
      "State what moves, with a duration and an easing for each.");
    return;
  }
  for (const rule of m.animates) {
    if (typeof rule.duration !== "number" || !rule.easing) {
      gaps.add("motion", `motion: ${rule.what ?? "unnamed rule"}`,
        "a motion rule with no duration and easing",
        "Give it a measured duration in ms and a named easing curve.");
    }
  }
  if (!m.neverAnimates?.length) {
    gaps.add("motion", "direction.motion.neverAnimates",
      "no list of what must not move",
      "An explicit do-not-animate list is part of the design, not an omission.");
  }
  if (!m.reducedMotion?.behaviour) {
    gaps.add("motion", "direction.motion.reducedMotion",
      "reduced-motion behaviour is undefined",
      "Reduced motion is a designed state. Say what survives and what stops.");
  }
}

/** 4. A screen defines its empty, loading and error compositions. */
function checkScreenStates(screen, gaps) {
  for (const state of REQUIRED_SCREEN_STATES) {
    const spec = screen?.states?.[state];
    if (!spec || (typeof spec === "string" && spec.trim().length < 20)) {
      gaps.add("screen-states", `states.${state}`,
        `no defined ${state} composition`,
        `Compose the ${state} state: what occupies the space, what the person reads first, and what they can do next. All three states must feel like the same product.`);
    }
  }
}

/** 5. Responsive rules name a container where the width is not the viewport's. */
function checkResponsive(screen, direction, gaps) {
  const rules = [...(screen?.responsive ?? []), ...(direction?.responsive?.rules ?? [])];
  for (const rule of rules) {
    const text = typeof rule === "string" ? rule : rule?.rule ?? "";
    if (!VIEWPORT_WORDS.test(text)) continue;
    // Naming the viewport is only correct for genuinely page-level rules.
    if (!/\b(page|body|document|full[- ]?bleed|root)\b/i.test(text)) {
      gaps.add("responsive", `responsive rule: "${truncate(text)}"`,
        "names a viewport where it should name a container",
        "A component's width is its container's, not the window's. Use a container query unless this rule genuinely governs the page.");
    }
  }
}

/** 6. No sentence that would survive being copied into an unrelated product. */
function checkProse(payload, product, gaps) {
  const nouns = productNouns(product);
  for (const { path, text } of walkStrings(payload)) {
    const lower = text.toLowerCase();

    for (const phrase of HOLLOW_PHRASES) {
      if (lower.includes(phrase)) {
        gaps.add("hollow-prose", path,
          `contains "${phrase}", which would survive being copied into an unrelated product`,
          "Replace it with something concrete enough to be wrong.");
      }
    }
    // Only judge sentences long enough to have made a claim.
    if (text.length < 40) continue;

    // A sentence carrying a number or a named standard is already concrete enough to be
    // wrong, which is the actual bar. "Adequate spacing" is hollow; "adequate spacing per
    // DIN 1450" is a citation someone can go and check.
    if (/\d/.test(text)) continue;

    const hasEmptyAdjective = EMPTY_ADJECTIVES.some((a) =>
      new RegExp(`\\b${a}\\b`, "i").test(text)
    );
    const mentionsProduct = nouns.some((n) => lower.includes(n));
    if (hasEmptyAdjective && !mentionsProduct) {
      gaps.add("hollow-prose", path,
        `leans on an empty adjective without naming anything in this product: "${truncate(text)}"`,
        "Name the thing on the screen, or state a number.");
    }
  }
}

/** Nouns that anchor a sentence to THIS product. */
function productNouns(product) {
  const src = [
    product?.name, product?.domain, product?.audience,
    ...(product?.nouns ?? []), ...(product?.screens ?? []),
  ].filter(Boolean).join(" ").toLowerCase();
  return src.split(/[^a-zäöüß0-9]+/i).filter((w) => w.length > 3);
}

function* walkStrings(node, path = "") {
  if (typeof node === "string") { yield { path: path || "(root)", text: node }; return; }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) yield* walkStrings(node[i], `${path}[${i}]`);
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      // `why` and `rationale` fields are argued prose by design; still checked for hollow
      // phrases above, but excluded from nothing here.
      yield* walkStrings(v, path ? `${path}.${k}` : k);
    }
  }
}

function truncate(s, n = 60) {
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

/**
 * Run every check. Returns { ok, items } — items is the list of gaps to report and ask about.
 * `screen` may be null when only the direction file is being validated.
 */
export function runGate(direction, screen = null) {
  const gaps = new Gaps();
  checkContrast(direction, gaps);
  checkMotion(direction, gaps);
  if (screen) {
    checkComponentStates(screen, gaps);
    checkScreenStates(screen, gaps);
    checkResponsive(screen, direction, gaps);
  }
  checkProse(screen ?? direction, direction?.product ?? {}, gaps);
  return { ok: gaps.ok, items: gaps.items };
}

/** Human-readable gap report. This is what the person sees instead of a prompt. */
export function formatGaps(items) {
  const byCheck = {};
  for (const g of items) (byCheck[g.check] ??= []).push(g);
  const lines = [
    `Refusing to emit a prompt: ${items.length} gap${items.length === 1 ? "" : "s"} found.`,
    "",
  ];
  for (const [check, group] of Object.entries(byCheck)) {
    lines.push(`${check} (${group.length})`);
    for (const g of group) {
      lines.push(`  ${g.where}`);
      lines.push(`    problem: ${g.problem}`);
      lines.push(`    fix:     ${g.fix}`);
    }
    lines.push("");
  }
  lines.push("Each of these is a decision, not a formatting error. Decide it, or say so and I will ask.");
  return lines.join("\n");
}
