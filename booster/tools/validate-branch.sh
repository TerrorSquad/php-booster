#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
if [ -f "$ROOT/booster/tools/runner.sh" ]; then
  BASE="$ROOT/booster"
else
  BASE="$ROOT"
fi
runner="$BASE/tools/runner.sh"
branch="${1:-}"

if [ -z "$branch" ]; then
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    branch=$(git symbolic-ref --short HEAD 2>/dev/null || true)
  fi
fi

if [ -z "$branch" ]; then
  echo "Usage: pnpm validate:branch <branch-name> (or run inside a git repo)" >&2
  exit 2
fi

echo "Validating branch: $branch"
if bash "$runner" node_modules/.bin/validate-branch-name -t "$branch"; then
  echo "✔ Branch is valid"
else
  echo "✖ Branch is INVALID" >&2
  exit 1
fi
