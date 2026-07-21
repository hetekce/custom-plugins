#!/usr/bin/env bash
# Structural validation for the plugin marketplace.
# Checks that marketplace.json and every plugin.json are valid JSON with the required
# fields, names are kebab-case, and every listed plugin exists on disk with a README + LICENSE.
#
# Usage: ./scripts/validate-plugins.sh
# Exit code 0 = all good, 1 = one or more problems (printed below).

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required but not installed." >&2
  exit 1
fi

errors=0
fail() { echo "  FAIL: $1"; errors=$((errors + 1)); }
kebab='^[a-z][a-z0-9]*(-[a-z0-9]+)*$'

marketplace=".claude-plugin/marketplace.json"

echo "==> Validating $marketplace"
if ! jq empty "$marketplace" 2>/dev/null; then
  fail "$marketplace is not valid JSON"
  echo "Validation aborted."
  exit 1
fi

[ "$(jq -r '.name // empty' "$marketplace")" ] || fail "marketplace is missing 'name'"
[ "$(jq -r '.plugins // empty' "$marketplace")" ] || fail "marketplace is missing 'plugins'"

# Walk each plugin listed in the marketplace.
while IFS=$'\t' read -r name source; do
  echo "==> Validating plugin '$name' ($source)"

  [[ "$name" =~ $kebab ]] || fail "plugin name '$name' is not kebab-case"

  if [[ "$source" != ./* ]]; then
    fail "plugin '$name' source '$source' must be a local path starting with ./"
    continue
  fi

  dir="${source#./}"
  manifest="$dir/.claude-plugin/plugin.json"

  [ -d "$dir" ] || { fail "plugin directory '$dir' does not exist"; continue; }
  [ -f "$manifest" ] || { fail "missing manifest '$manifest'"; continue; }
  [ -f "$dir/README.md" ] || fail "plugin '$name' is missing README.md"
  [ -f "$dir/LICENSE" ] || fail "plugin '$name' is missing LICENSE"

  if ! jq empty "$manifest" 2>/dev/null; then
    fail "$manifest is not valid JSON"
    continue
  fi

  manifest_name="$(jq -r '.name // empty' "$manifest")"
  [ "$manifest_name" = "$name" ] || fail "manifest name '$manifest_name' != marketplace name '$name'"
  [[ "$manifest_name" =~ $kebab ]] || fail "manifest name '$manifest_name' is not kebab-case"
  [ "$(jq -r '.description // empty' "$manifest")" ] || fail "manifest '$name' is missing 'description'"
  [ "$(jq -r '.version // empty' "$manifest")" ] || fail "manifest '$name' is missing 'version'"

  # Component dirs must live at plugin root, not inside .claude-plugin/.
  for comp in commands agents skills hooks; do
    if [ -d "$dir/.claude-plugin/$comp" ]; then
      fail "plugin '$name' has '$comp/' inside .claude-plugin/ — it must be at the plugin root"
    fi
  done
done < <(jq -r '.plugins[] | [.name, (.source | if type=="string" then . else .path end)] | @tsv' "$marketplace")

echo
if [ "$errors" -eq 0 ]; then
  echo "All checks passed."
else
  echo "$errors problem(s) found."
  exit 1
fi
