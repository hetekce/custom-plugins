import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDirection } from "../scripts/lib/direction.mjs";
import { runGate, formatGaps, REQUIRED_STATES } from "../scripts/lib/gate.mjs";
import { knownMarkets, localeRules } from "../scripts/lib/locale.mjs";
import { frameworkContract } from "../scripts/lib/frameworks.mjs";

const PRODUCT = {
  name: "Ledger",
  domain: "reconciling supplier statements",
  audience: "a bookkeeper",
  nouns: ["statement", "supplier", "reconciliation"],
};

function direction(overrides = {}) {
  return buildDirection({
    product: PRODUCT,
    brand: { accentHue: 245, source: "derived", rationale: "test" },
    createdAt: "2026-07-26T00:00:00Z",
    ...overrides,
  });
}

/** A screen with nothing missing, used as the baseline the tests then break. */
function goodScreen() {
  return {
    title: "reconciliation screen",
    firstThing: "which statements are unmatched",
    feeling: "that the gap is small and closeable",
    reassurance: "that nothing was silently dropped",
    anxiety: "the fear of a missing supplier statement surfacing at year end",
    composition: { leads: "a", supports: "b", oneClickAway: "c", cut: "d" },
    states: {
      empty: "Every statement is reconciled; the screen says so and offers the next period.",
      loading: "Skeleton rows at real row height, no shimmer, nothing shifts when data lands.",
      error: "One line in the danger grade naming what failed, with a retry beside it.",
    },
    components: {
      badge: { never: "rely on colour alone", states: { default: "tint, border, glyph, word" } },
    },
  };
}

test("a freshly built direction passes its own gate", () => {
  const gate = runGate(direction());
  assert.ok(gate.ok, formatGaps(gate.items));
});

test("the direction ships both modes measured", () => {
  const d = direction();
  for (const mode of ["light", "dark"]) {
    assert.ok(d.color.measured.some((m) => m.mode === mode), `${mode} has no measurements`);
  }
  assert.equal(d.color.measured.filter((m) => !m.pass).length, 0);
});

test("a tampered ratio is caught by re-measuring, not trusted", () => {
  const d = direction();
  d.color.measured[0].ratio = 21;
  const gate = runGate(d);
  assert.ok(!gate.ok);
  assert.ok(gate.items.some((g) => g.problem.includes("does not match the colours")));
});

test("a colour pair with no measured ratio is a gap", () => {
  const d = direction();
  delete d.color.measured[0].ratio;
  const gate = runGate(d);
  assert.ok(gate.items.some((g) => g.problem.includes("no measured contrast ratio")));
});

test("a motion rule without duration and easing is a gap", () => {
  const d = direction();
  d.motion.animates.push({ what: "something appears" });
  const gate = runGate(d);
  assert.ok(gate.items.some((g) => g.check === "motion" && g.problem.includes("no duration and easing")));
});

test("removing the reduced-motion contract is a gap", () => {
  const d = direction();
  delete d.motion.reducedMotion;
  const gate = runGate(d);
  assert.ok(gate.items.some((g) => g.where.includes("reducedMotion")));
});

test("a component missing a state is named, state by state", () => {
  const screen = goodScreen();
  screen.components.button = { never: "use accent as a fill", states: { default: "x", hover: "y" } };
  const gate = runGate(direction(), screen);
  const gap = gate.items.find((g) => g.where === "components.button" && g.problem.startsWith("missing state"));
  assert.ok(gap, "expected a missing-state gap for button");
  for (const s of ["focus-visible", "active", "disabled", "loading"]) {
    assert.ok(gap.problem.includes(s), `${s} not reported`);
  }
});

test("a component with no 'never' rule is a gap", () => {
  const screen = goodScreen();
  delete screen.components.badge.never;
  const gate = runGate(direction(), screen);
  assert.ok(gate.items.some((g) => g.problem.includes("no stated 'never' rule")));
});

test("every listed component has a required state set worth enforcing", () => {
  for (const [name, states] of Object.entries(REQUIRED_STATES)) {
    assert.ok(states.length > 0, `${name} has no required states`);
    if (["button", "input", "select", "tabs", "nav", "link"].includes(name)) {
      assert.ok(states.includes("focus-visible"), `${name} must require focus-visible`);
    }
  }
});

test("a missing empty, loading or error composition is a gap", () => {
  for (const state of ["empty", "loading", "error"]) {
    const screen = goodScreen();
    delete screen.states[state];
    const gate = runGate(direction(), screen);
    assert.ok(
      gate.items.some((g) => g.where === `states.${state}`),
      `${state} was not reported as missing`
    );
  }
});

test("a one-word state description does not count as a composition", () => {
  const screen = goodScreen();
  screen.states.empty = "nothing";
  const gate = runGate(direction(), screen);
  assert.ok(gate.items.some((g) => g.where === "states.empty"));
});

test("a responsive rule naming a viewport where it means a container is a gap", () => {
  const screen = goodScreen();
  screen.responsive = ["the card reflows at a viewport width of 768px"];
  const gate = runGate(direction(), screen);
  assert.ok(gate.items.some((g) => g.check === "responsive"));
});

test("a genuinely page-level viewport rule is allowed", () => {
  const screen = goodScreen();
  screen.responsive = ["the page never scrolls horizontally at a viewport width of 360px"];
  const gate = runGate(direction(), screen);
  assert.ok(!gate.items.some((g) => g.check === "responsive"), formatGaps(gate.items));
});

test("a sentence that would survive being copied into another product is a gap", () => {
  const screen = goodScreen();
  screen.intent = "A modern and clean layout that feels intuitive and delightful to use.";
  const gate = runGate(direction(), screen);
  assert.ok(gate.items.some((g) => g.check === "hollow-prose"));
});

test("a sentence carrying a number is not flagged as hollow", () => {
  // Regression: rationale citing a standard was flagged because it contained "adequate".
  const screen = goodScreen();
  screen.intent = "Adequate character spacing per DIN 1450, so tracking is halved to -0.02em.";
  const gate = runGate(direction(), screen);
  assert.ok(!gate.items.some((g) => g.check === "hollow-prose"), formatGaps(gate.items));
});

test("the gap report names a fix for every gap", () => {
  const screen = goodScreen();
  delete screen.states.error;
  screen.components.button = { states: { default: "x" } };
  const gate = runGate(direction(), screen);
  assert.ok(gate.items.length > 0);
  for (const g of gate.items) {
    assert.ok(g.fix && g.fix.length > 10, `no usable fix for: ${g.problem}`);
    assert.ok(g.where, "a gap with no location is not actionable");
  }
  assert.match(formatGaps(gate.items), /Refusing to emit a prompt/);
});

test("locale is a pack, and no market is the default", () => {
  assert.ok(knownMarkets().length > 1, "a single market means it is a default in disguise");
  // The universal rules survive even where no pack exists.
  const unknown = localeRules("ja-JP");
  assert.equal(unknown.formats, null);
  assert.ok(unknown.formatsUndeclared.includes("ja-JP"));
  assert.ok(unknown.universal.containment.rule.length > 0);
  // A pack adds without replacing.
  const de = localeRules("de-DE");
  assert.ok(de.formats.currency.includes("€"));
  assert.ok(de.universal.containment.rule.length > 0);
});

test("the direction carries no market-specific default", () => {
  const d = direction(); // no localeCode given
  assert.notEqual(d.locale.market, "de", "German must never be what you get by not choosing");
});

test("the token export carries both modes and consumes semantics, not primitives", async () => {
  const { renderTokensCss } = await import("../scripts/lib/export.mjs");
  const css = renderTokensCss(direction());

  // Both modes, and the theme attribute must be able to win over the media query in both
  // directions — otherwise a viewer's explicit choice loses to their OS setting.
  assert.match(css, /@media \(prefers-color-scheme: dark\)/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /:root\[data-theme="light"\]/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);

  // Semantic names alias primitives; that is what makes the second mode a remap.
  assert.match(css, /--text-primary: var\(--color-gray-1000\)/);
  assert.match(css, /--surface-page: var\(--color-background-100\)/);

  // Every semantic role that components consume must exist.
  for (const name of ["surface-raised", "border-subtle", "text-secondary", "accent-text", "danger-tint"]) {
    assert.ok(css.includes(`--${name}:`), `missing --${name}`);
  }
});

test("the export refuses a direction that does not hold", async () => {
  const scripts = path.resolve(fileURLToPath(new URL("../scripts", import.meta.url)));
  const dir = mkdtempSync(path.join(tmpdir(), "design-authority-export-"));
  const broken = direction();
  broken.color.measured[0].ratio = 21; // no longer matches its colours
  writeFileSync(path.join(dir, "direction.json"), JSON.stringify(broken));

  const run = spawnSync(
    process.execPath,
    [path.join(scripts, "direction.mjs"), "export", "--file", "direction.json", "--dir", "."],
    { cwd: dir, encoding: "utf8" }
  );

  assert.notEqual(run.status, 0, "a broken direction must not export");
  assert.match(run.stderr, /refusing to export/i);
});

test("a brand asset cannot be generated before the direction exists", () => {
  // The order is load-bearing: the direction is built FROM the accent hue, and assets are
  // rendered FROM the direction. Generating a mark first would invent a palette nobody agreed
  // to, and the mark and the interface would end up as two different brands.
  const scripts = path.resolve(fileURLToPath(new URL("../scripts", import.meta.url)));
  const dir = mkdtempSync(path.join(tmpdir(), "design-authority-order-"));
  writeFileSync(
    path.join(dir, "identity.json"),
    JSON.stringify({ feeling: "calm", mark: { kind: "abstract", idea: "a relay handing on" } })
  );

  const run = spawnSync(process.execPath, [path.join(scripts, "identity.mjs"), "mark", "--identity", "identity.json"], {
    cwd: dir,
    encoding: "utf8",
  });

  assert.notEqual(run.status, 0, "generating a mark without a direction must fail");
  assert.match(run.stderr, /no direction file/i);
  assert.equal(run.stdout.trim(), "", "nothing may be emitted when it refuses");
});

test("an unknown framework is reported, not silently ignored", () => {
  const fw = frameworkContract("svelte");
  assert.equal(fw.status, "unknown");
  assert.ok(fw.note.includes("svelte"));
  assert.equal(frameworkContract("angular").status, "supported");
  assert.equal(frameworkContract("react").status, "planned");
  assert.equal(frameworkContract(null), null);
});
