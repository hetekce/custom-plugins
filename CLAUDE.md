# Repository working agreement

This repo is a **marketplace of Claude Code plugins** — a monorepo where each plugin lives under
`plugins/<name>/` and is listed in `.claude-plugin/marketplace.json`. It inherits the global working
agreement in `~/.claude/CLAUDE.md`; the rules below are additive and specific to building plugins here.

## What we are building

- **Community-grade plugins, not enterprise products.** Optimize for something a stranger can install
  in one command and understand in five minutes. Favor a small, sharp feature set over a broad one.
- **MIT-licensed and self-contained.** No paid dependencies, no accounts, no telemetry. A plugin should
  work offline where it reasonably can, and degrade gracefully when it can't.
- **Everything shipped is in English** (code, docs, skill/agent/command text, commit messages). Turkish
  stays in conversation only. See the global agreement.

## Repository layout

```
custom-plugins/
├── .claude-plugin/marketplace.json   # lists every plugin (source, category, keywords)
├── plugins/<name>/                    # one directory per plugin
│   └── .claude-plugin/plugin.json     # per-plugin manifest
├── docs/                              # authoring standards shared across plugins
├── scripts/validate-plugins.sh        # structural validation (also run in CI)
└── .github/                           # CI, issue/PR templates
```

## Plugin authoring standard

Follow Anthropic's `plugin-dev` conventions. In short:

- **Manifest** lives at `plugins/<name>/.claude-plugin/plugin.json`. Component directories
  (`commands/`, `agents/`, `skills/`, `hooks/`) sit at the plugin root, **never** inside
  `.claude-plugin/`. Rely on auto-discovery; keep the manifest lean but complete for distribution
  (`name`, `version`, `description`, `author`, `homepage`, `license: "MIT"`, `keywords`).
- **Naming:** kebab-case for every file and directory. Commands are 2–3 words, agents name a role,
  skills name a topic.
- **Portability:** reference intra-plugin paths with `${CLAUDE_PLUGIN_ROOT}` — never hardcoded,
  relative-to-cwd, or `~` paths. Assume install on macOS, Linux, and Windows.
- **Skills** are a directory with `SKILL.md` (front-matter `name` + `description` that says *when* to
  use it). Keep `SKILL.md` short and load detail from `references/`, `scripts/`, `examples/` on demand.
- **Metadata completeness** matters because these are published: every plugin has its own `README.md`,
  its own `LICENSE` (MIT), and an entry in the root `marketplace.json`.

See `docs/plugin-authoring.md` for the full checklist and `docs/writing-style.md` for the prose bar.

## Quality bar

- A skill/agent/command earns its place only if it changes behavior for the better. No filler files,
  no "utils" catch-alls, no scaffolding that isn't used.
- Prefer a few well-documented capabilities over many shallow ones.
- Anything the plugin generates (diagrams, docs, labels) must look **hand-made, not machine-stamped** —
  aligned, consistently styled, and written in plain human English. Read `docs/writing-style.md` before
  writing any user-facing text and apply it to generated output too.

## Validation and CI

- `make check` is the gate: it runs `scripts/validate-plugins.sh` plus every plugin test suite
  (`node --test` over `plugins/*/test/`), and is exactly what CI runs.
- Run `scripts/validate-plugins.sh` before proposing a commit. It checks that every `plugin.json` and
  the `marketplace.json` are valid JSON with the required fields, names are kebab-case, and every
  plugin listed in the marketplace exists on disk.
- CI (`.github/workflows/validate.yml`) runs the same script on every push and PR. Green CI is a
  precondition for merging.

## Versioning and releases

- Each plugin is versioned independently with semver in its own `plugin.json`.
- Bump the plugin version on any behavior change and keep its `README.md` current.
- The root `marketplace.json` is the index; update it when adding, renaming, or removing a plugin.

## Adding a new plugin (checklist)

1. `plugins/<name>/.claude-plugin/plugin.json` with complete metadata (`license: "MIT"`).
2. Components under `commands/`, `agents/`, `skills/` as needed — nothing empty.
3. `plugins/<name>/README.md` (what it does, install, usage, examples) and `plugins/<name>/LICENSE`.
4. Register it in `.claude-plugin/marketplace.json` (`source: "./plugins/<name>"`, category, keywords).
5. `scripts/validate-plugins.sh` passes.

## Version control

Per the global agreement: **never run `git commit` or `git push`.** Prepare changes, run validation,
generate the commit message with the `commit-message` skill, and hand over the exact git commands.
