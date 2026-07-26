// Renders the Claude Design prompt FROM direction.json. Nothing here is improvised.
//
// The prompt is generated, never hand-written, for one reason: a decision that lives in a
// file can be changed in one place and shows up in every future prompt, and a decision that
// changed without a reason is visible in a diff. Prose next to the file is rationale; prose
// instead of the file is drift.

import { REQUIRED_STATES } from "./gate.mjs";
import { frameworkContract } from "./frameworks.mjs";

const RULE = "─".repeat(72);

function section(title, body) {
  if (!body || (Array.isArray(body) && !body.length)) return "";
  const text = Array.isArray(body) ? body.filter(Boolean).join("\n") : body;
  return `\n${title.toUpperCase()}\n${RULE}\n${text}\n`;
}

function bullets(items) {
  return items.filter(Boolean).map((i) => `- ${i}`).join("\n");
}

function colourBlock(direction) {
  const out = [];
  const { modes, accentBudget, measured, primaryMode } = direction.color;

  out.push(`Colour is authored in OKLCH and stated as hex. ${direction.color.why}`);
  out.push(`The primary designed mode is ${primaryMode}. The other mode is designed, not inverted — its ramp is tuned separately and its accents carry different chroma.`);
  out.push("");

  for (const mode of ["light", "dark"]) {
    const m = modes[mode];
    if (!m) continue;
    out.push(`${mode.toUpperCase()} MODE`);
    for (const [token, v] of Object.entries(m.ramp)) {
      out.push(`  ${token.padEnd(15)} ${v.hex}   ${v.role}`);
    }
    out.push("");
    const seen = new Map();
    for (const [role, v] of Object.entries(m.semantic)) {
      // `info` deliberately reuses the accent hue. Print it as the alias it is rather than
      // as a second identical row, which reads as a mistake.
      const key = `${v.text}|${v.boundary}`;
      if (seen.has(key)) {
        out.push(`  ${role.padEnd(8)} — the same values as ${seen.get(key)}, by design`);
        continue;
      }
      seen.set(key, role);
      out.push(`  ${role.padEnd(8)} text ${v.text}   border/icon ${v.boundary}   tint ${v.tint}`);
    }
    out.push("");
  }

  out.push("MEASURED CONTRAST — every pairing, with the rule it satisfies:");
  for (const r of measured) {
    out.push(`  [${r.pass ? "pass" : "FAIL"}] ${r.mode.padEnd(5)} ${r.pair.padEnd(34)} ${r.fg} on ${r.bg}  ${r.ratio}:1  (needs ${r.required}, ${r.rule})`);
  }
  out.push("");
  out.push(`ACCENT BUDGET: ${accentBudget.rule}`);
  out.push(`  Accent is for: ${accentBudget.accentIsFor.join(", ")}.`);
  out.push(`  Accent is never for: ${accentBudget.accentIsNeverFor.join(", ")}.`);
  out.push(`  ${direction.color.colorIsNeverTheOnlySignal}`);
  return out.join("\n");
}

function typeBlock(t) {
  const out = [];
  out.push(`Families: ${t.families.ui.requirement} Fallback stack: ${t.families.ui.fallback}`);
  out.push(`Monospace is for ${t.families.mono.role}. Never for ${t.families.mono.never}.`);
  out.push("");
  for (const [name, r] of Object.entries(t.regimes)) {
    out.push(`${name.toUpperCase()} regime — ratio ${r.ratio}, for ${r.use}:`);
    for (const s of r.steps) out.push(`  ${s.name.padEnd(12)} ${String(s.px).padStart(3)}px / line-height ${s.lineHeight}`);
  }
  out.push("");
  out.push(`Weights: ${t.weights.available.join(", ")}. Ceiling ${t.weights.ceiling} — nothing heavier exists in this system. ${t.weights.why}`);
  out.push(`Tracking: ${t.tracking.display} at display, ${t.tracking.body} at body. ${t.tracking.rule} ${t.tracking.why}`);
  out.push(`Measure: reading text never exceeds ${t.measure.reading}; a headline never exceeds ${t.measure.headline}. ${t.measure.why}`);
  out.push(`Minimums: body line-height at least ${t.minimums.bodyLineHeight}; input font-size ${t.minimums.inputFontSize}px. ${t.minimums.why}`);
  return out.join("\n");
}

function motionBlock(m) {
  const out = [];
  out.push("What moves, and exactly how:");
  for (const r of m.animates) {
    out.push(`  ${r.what}`);
    out.push(`      ${r.duration}ms, ${r.easing}, animating ${r.properties.join(" and ")}`);
  }
  out.push("");
  out.push("What must NOT move:");
  out.push(bullets(m.neverAnimates));
  out.push("");
  out.push(`Reduced motion: ${m.reducedMotion.behaviour} ${m.reducedMotion.rule}`);
  out.push(`Deletion test: ${m.deletionTest}`);
  return out.join("\n");
}

function componentBlock(screen) {
  const out = [];
  for (const [name, spec] of Object.entries(screen.components ?? {})) {
    out.push(`${name.toUpperCase()}${spec.variants ? ` — variants: ${spec.variants.join(", ")}` : ""}`);
    const states = spec.states ?? {};
    for (const s of REQUIRED_STATES[name] ?? Object.keys(states)) {
      if (states[s]) out.push(`  ${s.padEnd(15)} ${states[s]}`);
    }
    if (spec.accessibleName) out.push(`  accessible name  ${spec.accessibleName}`);
    if (spec.never) out.push(`  NEVER            ${spec.never}`);
    out.push("");
  }
  return out.join("\n");
}

function localeBlock(l) {
  if (!l) return "";
  const u = l.universal ?? {};
  const out = [];

  if (l.label) out.push(`Content language: ${l.label} (${l.code}).${l.note ? " " + l.note : ""}`);
  else out.push(`Content locale: ${l.code}.`);
  out.push("");

  // Universal rules first — these hold in every market.
  if (u.lang) out.push(`${u.lang.rule} ${u.lang.why}`);
  if (u.containment) out.push(`${u.containment.rule} ${u.containment.why}`);
  if (u.truncation) out.push(`${u.truncation.default} ${u.truncation.rule}`);
  if (u.neverTruncate?.length) out.push(`Never truncate: ${u.neverTruncate.join("; ")}.`);
  if (u.identifiers) out.push(u.identifiers.rule);
  if (u.expansion) out.push(`${u.expansion.rule} ${u.expansion.why} (${u.expansion.source})`);

  // Market-specific additions.
  if (l.text?.css) {
    out.push("");
    const bits = [`Text containers: ${l.text.css}`];
    if (l.text.hyphenateLimitChars) bits.push(`hyphenate-limit-chars: ${l.text.hyphenateLimitChars}`);
    if (l.text.never) bits.push(`Never ${l.text.never}`);
    if (l.text.softHyphens) bits.push(l.text.softHyphens);
    out.push(bits.map((b) => b.replace(/\.$/, "")).join(". ") + ".");
  }
  if (l.typography?.rule) out.push(`Typeface: ${l.typography.rule}${l.typography.why ? " " + l.typography.why : ""}`);
  if (l.forms) out.push(`Forms: labels ${l.forms.labels}; required ${l.forms.required}; errors ${l.forms.errors}.`);

  if (l.formats) {
    out.push("");
    out.push(`Formats — currency: ${l.formats.currency}`);
    out.push(`          date: ${l.formats.date}`);
    out.push(`          numbers: ${l.formats.numbers}${l.formats.source ? ` (${l.formats.source})` : ""}`);
  } else if (l.formatsUndeclared) {
    out.push("");
    out.push(`FORMATS UNDECLARED: ${l.formatsUndeclared}`);
  }

  if (l.testCorpus?.length) {
    out.push("");
    out.push(`The layout must survive this corpus at 360px without horizontal scroll or a mid-word break: ${l.testCorpus.join(", ")}.`);
  }
  return out.join("\n");
}

/** Refusals stated so the design tool can decline them, not just avoid them. */
export const ANTI_GOALS = [
  "a purple-blue gradient hero",
  "a glassmorphism card",
  "an emoji standing in for an icon",
  "a shadow on everything",
  "more than one accent colour competing on a screen",
  "animation that delays a person doing their job",
  "an illustration that says nothing",
  "a dark mode that is the light mode with inverted values",
  "a centred hero over a grid of three feature cards",
  "placeholder copy — every string is the real string",
];

function acceptanceChecks(direction, screen) {
  const l = direction.locale;
  const checks = [
    "Every colour pairing on the screen matches a measured ratio above. Nothing was introduced that was not measured.",
    "At most one accent is visible. The primary action is ink, not accent.",
    "Remove all colour: every status is still readable from its word and glyph.",
    "Every interactive element has a visible focus state at 3:1 against its surface, and is reachable by keyboard.",
    `Touch targets are at least ${direction.density.minimumTouchTarget}x${direction.density.minimumTouchTarget}.`,
    "Nothing scrolls horizontally at 360px. Wide content scrolls inside its own container.",
    "Every spacing value is on the scale. There is no arbitrary pixel.",
    "The empty, loading and error states are visibly the same product as the populated one.",
    "Every animation carries a duration and an easing from the table above, and the deletion test was applied.",
    `Type never exceeds weight ${direction.type.weights.ceiling}, and reading text never exceeds ${direction.type.measure.reading}.`,
  ];
  if (l?.testCorpus?.length) {
    checks.push(`The ${l.label ?? l.code} corpus renders without clipping or horizontal scroll at 360px: ${l.testCorpus.slice(0, 3).join(", ")}.`);
  }
  if (l?.formats) {
    checks.push(`Numbers and dates follow the stated conventions: ${l.formats.date.split(" —")[0]}, ${l.formats.numbers.split(".")[0]}.`);
  }
  if (screen?.acceptance) checks.push(...screen.acceptance);
  return checks.map((c, i) => `${String(i + 1).padStart(2)}. ${c}`).join("\n");
}

/**
 * Render the full Claude Design prompt.
 * Assumes the gate has already passed — call runGate first and refuse on gaps.
 */
export function renderPrompt(direction, screen) {
  const p = direction.product;
  const parts = [];

  parts.push(`Design ${screen.article ?? "a"} ${screen.title} for ${p.name}: ${p.domain}.`);
  parts.push("");
  parts.push("Every decision below is already made. Execute them; do not substitute your own.");
  parts.push("Two independent runs of this prompt should produce two executions of the same design.");

  parts.push(section("Intent — the first two seconds", [
    `The person: ${screen.audience ?? p.audience}.`,
    `They arrive from ${screen.arrivingFrom ?? "the main navigation"}, and what they need to know first is: ${screen.firstThing}`,
    `What this screen should make them feel: ${screen.feeling}`,
    `What it is reassuring them about: ${screen.reassurance}`,
    `The anxiety it removes: ${screen.anxiety}`,
    "",
    `This is not interchangeable with any other screen in the product. ${screen.distinctFrom ?? ""}`,
  ]));

  parts.push(section("Colour", colourBlock(direction)));
  parts.push(section("Typography", typeBlock(direction.type)));

  parts.push(section("Space", [
    `Base unit ${direction.space.base}px. Scale: ${direction.space.scale.join(", ")}.`,
    `Vertical rhythm — tight ${direction.space.rhythm.tight}, within copy ${direction.space.rhythm.copy}, between groups ${direction.space.rhythm.group}, between sections ${direction.space.rhythm.section}.`,
    direction.space.rule,
    "",
    `Density: ${Object.entries(direction.density.modes).map(([k, v]) => `${k} ${v.controlHeight}px controls (${v.use})`).join("; ")}.`,
    direction.density.rule,
  ]));

  parts.push(section("Shape and depth", [
    `Radii — controls ${direction.shape.radii.control}px, surfaces ${direction.shape.radii.surface}px, containers ${direction.shape.radii.container}px.`,
    direction.shape.pillRule,
    "",
    "Elevation:",
    direction.shape.elevation.map((e) => `  ${e.name.padEnd(8)} light: ${e.light}\n           dark:  ${e.dark}\n           for:   ${e.use}`).join("\n"),
    "",
    direction.shape.bordersVsShadows,
  ]));

  parts.push(section("Motion", motionBlock(direction.motion)));

  parts.push(section("Composition", [
    `What leads: ${screen.composition.leads}`,
    `What supports it: ${screen.composition.supports}`,
    `What is one click away: ${screen.composition.oneClickAway}`,
    `What was cut, and why: ${screen.composition.cut}`,
    "",
    `At most ${screen.composition.competingElements ?? 3} things may compete for attention. Everything else serves the path from first landing point to the action.`,
  ]));

  parts.push(section("The three states, composed as one product", [
    `EMPTY:   ${screen.states.empty}`,
    `LOADING: ${screen.states.loading}`,
    `ERROR:   ${screen.states.error}`,
  ]));

  parts.push(section("Components", componentBlock(screen)));

  parts.push(section("Responsive", [
    `Reference widths ${direction.responsive.referenceWidths.join(", ")}. ${direction.responsive.approach}.`,
    direction.responsive.containerQueries,
    "",
    bullets([...direction.responsive.rules, ...(screen.responsive ?? [])]),
  ]));

  const loc = localeBlock(direction.locale);
  if (loc.trim()) parts.push(section("Language and locale", loc));

  parts.push(section("Accessibility — a design constraint, not a review step", [
    `Target ${direction.accessibility.target}.`,
    bullets(Object.entries(direction.accessibility).filter(([k]) => k !== "target").map(([, v]) => v)),
  ]));

  // The implementation contract, if a stack is named. Design knowledge stays framework-agnostic;
  // only this section knows what is being built with.
  const fw = frameworkContract(screen.framework ?? direction.product?.framework);
  if (fw) {
    if (fw.status === "supported") {
      parts.push(section(`Implementation contract — ${fw.label}`, [
        "The design must be buildable in this stack without fighting it. This constrains what the design may assume, not how it looks:",
        "",
        bullets(fw.contract),
        "",
        "Styling:",
        bullets(fw.styling),
        "",
        "Assets:",
        bullets(fw.assets),
        "",
        "Accessibility mechanics:",
        bullets(fw.accessibilityMechanics),
      ]));
    } else {
      parts.push(section("Implementation contract", fw.note));
    }
  }

  parts.push(section("Refuse these", [
    "If the design would contain any of the following, do not produce it — choose a different solution:",
    bullets([...ANTI_GOALS, ...(screen.antiGoals ?? []), ...(fw?.refuse ?? [])]),
  ]));

  parts.push(section("Acceptance checks — judge the result against these", acceptanceChecks(direction, screen)));

  return parts.filter(Boolean).join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
