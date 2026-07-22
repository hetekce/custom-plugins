// Structural tests that pin the plugin to the Claude Code plugin standard:
// manifest shape, component layout, skill/command/agent frontmatter, bundled
// role icons, and portable (non-hardcoded) paths in scripts.

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { PLUGIN_ROOT } from "./helpers.mjs";
import { CREDIT } from "../scripts/lib/tools.mjs";

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;

/** Return the YAML frontmatter block of a markdown file, or null. */
function frontmatter(file) {
  const text = readFileSync(file, "utf8");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : null;
}

test("plugin.json exists, is valid JSON, and has the required fields", () => {
  const manifestPath = path.join(PLUGIN_ROOT, ".claude-plugin", "plugin.json");
  assert.ok(existsSync(manifestPath), ".claude-plugin/plugin.json is missing");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.match(manifest.name, KEBAB, "plugin name must be kebab-case");
  assert.equal(manifest.name, path.basename(PLUGIN_ROOT), "name must match the directory");
  assert.match(manifest.version, SEMVER, "version must be semver");
  assert.ok(
    typeof manifest.description === "string" && manifest.description.length > 0,
    "description is required",
  );
});

test("component directories live at the plugin root, not under .claude-plugin/", () => {
  for (const comp of ["commands", "agents", "skills", "hooks"]) {
    assert.ok(
      !existsSync(path.join(PLUGIN_ROOT, ".claude-plugin", comp)),
      `${comp}/ must not live inside .claude-plugin/`,
    );
  }
  // The components this plugin ships must exist at the root.
  for (const comp of ["commands", "agents", "skills"]) {
    const dir = path.join(PLUGIN_ROOT, comp);
    assert.ok(existsSync(dir) && statSync(dir).isDirectory(), `${comp}/ missing at plugin root`);
  }
});

test("every skill has SKILL.md with name and description frontmatter", () => {
  const skillsDir = path.join(PLUGIN_ROOT, "skills");
  const skills = readdirSync(skillsDir).filter((d) =>
    statSync(path.join(skillsDir, d)).isDirectory(),
  );
  assert.ok(skills.length > 0, "no skills found");
  for (const skill of skills) {
    const file = path.join(skillsDir, skill, "SKILL.md");
    assert.ok(existsSync(file), `skills/${skill}/SKILL.md is missing`);
    const fm = frontmatter(file);
    assert.ok(fm, `skills/${skill}/SKILL.md has no frontmatter`);
    assert.match(fm, /^name:\s*\S/m, `skills/${skill}/SKILL.md frontmatter lacks name`);
    assert.match(fm, /^description:\s*\S/m, `skills/${skill}/SKILL.md frontmatter lacks description`);
  }
});

test("every command and agent has frontmatter with a description", () => {
  for (const comp of ["commands", "agents"]) {
    const dir = path.join(PLUGIN_ROOT, comp);
    const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
    assert.ok(files.length > 0, `no markdown files in ${comp}/`);
    for (const f of files) {
      const fm = frontmatter(path.join(dir, f));
      assert.ok(fm, `${comp}/${f} has no frontmatter`);
      assert.match(fm, /^description:\s*\S/m, `${comp}/${f} frontmatter lacks description`);
    }
  }
});

test("every role default resolves to a bundled icon (svg + 256px png)", () => {
  const defaults = JSON.parse(
    readFileSync(path.join(PLUGIN_ROOT, "assets", "icons", "role-defaults.json"), "utf8"),
  );
  const roles = Object.entries(defaults.roles);
  assert.ok(roles.length > 0, "role-defaults.json has no roles");
  for (const [role, iconId] of roles) {
    const name = iconId.includes(":") ? iconId.split(":")[1] : iconId;
    const svg = path.join(PLUGIN_ROOT, "assets", "icons", "svg", `${name}.svg`);
    const png = path.join(PLUGIN_ROOT, "assets", "icons", "png", "256", `${name}.png`);
    assert.ok(existsSync(svg), `role "${role}" default ${iconId}: missing bundled ${name}.svg`);
    assert.ok(existsSync(png), `role "${role}" default ${iconId}: missing bundled 256px ${name}.png`);
  }
});

test("the attribution line is identical everywhere it is duplicated", () => {
  // CREDIT is single-sourced in tools.mjs, but export-drawio.sh (shell, cannot
  // import it) and the mermaid skill (authored text) mirror the wording. Pin all
  // copies to CREDIT so they can never drift apart.
  assert.ok(!CREDIT.includes("--"), "CREDIT must not contain '--' (illegal in an XML comment)");
  const mirrors = [
    path.join(PLUGIN_ROOT, "scripts", "export-drawio.sh"),
    path.join(PLUGIN_ROOT, "skills", "mermaid-diagrams", "SKILL.md"),
  ];
  for (const file of mirrors) {
    assert.ok(
      readFileSync(file, "utf8").includes(CREDIT),
      `${path.relative(PLUGIN_ROOT, file)} must contain the exact CREDIT string`,
    );
  }
});

test("no script hardcodes an absolute path outside CLAUDE_PLUGIN_ROOT", () => {
  const scriptsDir = path.join(PLUGIN_ROOT, "scripts");
  const walk = (dir) => {
    const hits = [];
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules") continue;
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) hits.push(...walk(full));
      else if (/\.(mjs|js|sh)$/.test(entry)) hits.push(full);
    }
    return hits;
  };
  for (const file of walk(scriptsDir)) {
    const text = readFileSync(file, "utf8");
    assert.ok(
      !text.includes("/home/"),
      `${path.relative(PLUGIN_ROOT, file)} contains a hardcoded /home/ path`,
    );
  }
});
