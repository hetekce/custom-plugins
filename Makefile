# Developer entry points for the plugin marketplace.
# Run `make help` (or just `make`) to see what is available.

SHELL := /bin/sh
.DEFAULT_GOAL := help

PLUGIN_SCRIPTS := plugins/architecture-diagrams/scripts

.PHONY: help validate test check build-icons clean

help: ## Show this list of targets
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  %-12s %s\n", $$1, $$2}'

validate: ## Check marketplace.json and every plugin manifest
	./scripts/validate-plugins.sh

test: ## Run every plugin test suite with the Node built-in test runner
	@files="$$(find plugins -path '*/node_modules' -prune -o -type f -path '*/test/*' -name '*.test.mjs' -print)"; \
	if [ -z "$$files" ]; then echo "no test files found under plugins/*/test/"; exit 1; fi; \
	env -u CLAUDE_PLUGIN_ROOT node --test $$files

check: validate test ## Run validation and tests (the CI gate)

build-icons: ## Regenerate the bundled icon set (needs network)
	cd $(PLUGIN_SCRIPTS) && (npm ci || npm install) && node build-icons.mjs

clean: ## Remove local diagram output and OS cruft (keeps node_modules and committed assets)
	rm -rf diagrams
	find . -path '*/node_modules' -prune -o -type f \( -name '.DS_Store' -o -name 'Thumbs.db' \) -print0 | xargs -0 -r rm -f
