# Plugin authoring guide

The standard every plugin in this repo follows. It condenses Anthropic's `plugin-dev` guidance into a
checklist plus the extra bar we hold ourselves to. Read this before creating or changing a plugin.

## Directory layout

```
plugins/<name>/
├── .claude-plugin/
│   └── plugin.json          # required manifest — this file, and only this, lives here
├── commands/                # slash commands (*.md), auto-discovered
├── agents/                  # subagents (*.md), auto-discovered
├── skills/<skill>/SKILL.md  # skills, auto-discovered by SKILL.md
├── hooks/hooks.json         # event handlers (optional)
├── scripts/                 # helper scripts referenced via ${CLAUDE_PLUGIN_ROOT}
├── assets/                  # bundled non-code assets (icons, templates)
├── README.md                # required — what/why/install/usage/examples
└── LICENSE                  # required — MIT
```

Component directories live at the plugin **root**, not inside `.claude-plugin/`. Only create the
directories a plugin actually uses.

## Manifest (`plugin.json`)

Keep it lean but complete enough to distribute:

```json
{
  "name": "kebab-case-name",
  "version": "0.1.0",
  "description": "One active-voice sentence, under 200 chars, saying what it does.",
  "author": { "name": "Hasan Emre Tekce", "url": "https://github.com/hetekce" },
  "homepage": "https://github.com/hetekce/custom-plugins/tree/main/plugins/kebab-case-name",
  "license": "MIT",
  "keywords": ["five", "to", "ten", "search", "terms"]
}
```

- `name` matches the directory name and validates against `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`.
- `version` is semver; bump it on any behavior change.
- Don't add custom `commands`/`agents`/`hooks` path fields unless you genuinely deviate from the
  default layout — auto-discovery covers the standard case.

## Components

**Commands** (`commands/<name>.md`) — a user-facing `/name` entry point. Front-matter:

```markdown
---
description: What the command does and when to reach for it.
argument-hint: "<optional> [args]"
---
Instructions Claude follows when the command runs. Use $ARGUMENTS / $1 for input.
```

**Agents** (`agents/<role>.md`) — a focused subagent. Give it a tight role, the minimum tool set, and
a clear "you do X, you do not do Y" boundary. Front-matter: `name`, `description` (say when to pick it),
optional `tools`, `model`.

**Skills** (`skills/<topic>/SKILL.md`) — knowledge/procedure Claude activates by context. The
front-matter `description` is a *trigger*: state the situations and phrasings that should invoke it.
Keep `SKILL.md` short; push detail into `references/`, `examples/`, `scripts/` and load it on demand.

## Portability

- Every intra-plugin path uses `${CLAUDE_PLUGIN_ROOT}` (e.g.
  `bash ${CLAUDE_PLUGIN_ROOT}/scripts/render.sh`). Never hardcode absolute, cwd-relative, or `~` paths.
- If a script needs a tool that may be missing (e.g. `mmdc`, `rsvg-convert`), check for it and fail
  with a clear, actionable message instead of a stack trace.
- Prefer POSIX-portable shell and standard Python (managed with `uv`) over system-specific features.

## Documentation

Every plugin ships a `README.md` covering: what it does, install command, a minimal usage example,
requirements/dependencies, and limitations. Match the tone in `docs/writing-style.md` — no marketing
gloss, no AI tells.

## Before you commit

1. `scripts/validate-plugins.sh` passes.
2. New plugin registered in `.claude-plugin/marketplace.json`.
3. `README.md` and `LICENSE` present in the plugin.
4. No empty or unreferenced files.
5. Version bumped if behavior changed.
