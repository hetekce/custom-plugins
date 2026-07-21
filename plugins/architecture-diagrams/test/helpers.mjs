// Shared test helpers. Node built-ins only — no dependencies.

import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

/** Absolute path to the plugin root (the directory above test/). */
export const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Run a plugin script with node, synchronously, and capture its output.
 * `relPath` is relative to the plugin root (e.g. "scripts/fetch-icon.mjs").
 * CLAUDE_PLUGIN_ROOT is pinned to the plugin root so scripts resolve bundled
 * assets the same way they would when installed.
 * @returns {{code: number, stdout: string, stderr: string}}
 */
export function runScript(relPath, args = [], { cwd } = {}) {
  const result = spawnSync(process.execPath, [path.join(PLUGIN_ROOT, relPath), ...args], {
    cwd: cwd ?? PLUGIN_ROOT,
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN_ROOT },
  });
  if (result.error) throw result.error;
  return { code: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

/** Create a unique temporary directory and return its absolute path. */
export function tmpdir() {
  return mkdtempSync(path.join(os.tmpdir(), "architecture-diagrams-test-"));
}
