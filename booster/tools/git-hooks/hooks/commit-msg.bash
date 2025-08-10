#!/usr/bin/env bash

# Strict mode
set -euo pipefail
IFS=$'\n\t'

ROOT=$(git rev-parse --show-toplevel)
# Determine whether we're running inside the booster repository (tools under booster/) or an integrated project (tools at root/tools)
if [ -f "$ROOT/booster/tools/runner.sh" ]; then
    BASE="$ROOT/booster"
else
    BASE="$ROOT"
fi
GIT_DIR=$(git rev-parse --git-dir)

# Check if MERGE_HEAD exists
if [ -f "$GIT_DIR/MERGE_HEAD" ]; then
    # Skip the hook during a merge
    exit 0
fi

runner="$BASE/tools/runner.sh"
current_branch=$(git symbolic-ref --short HEAD)

error() { echo "ERROR: $*" >&2; exit 1; }

# 1. Branch validation (shows rich error if fails)
if ! bash "$runner" node_modules/.bin/validate-branch-name -t "$current_branch"; then
    error "Branch name validation failed. See rules in validate-branch-name.config.cjs."
fi

# 2. Commitlint (lint commit message before we mutate it)
bash "$runner" node_modules/.bin/commitlint --edit "$1"

# 3. Determine if ticket required & extract via unified util
util_script="$BASE/tools/commit-utils.js"
if [ ! -f "$util_script" ]; then
    error "Missing commit-utils.js helper script."
fi

# Query NEED_TICKET & FOOTER_LABEL via helper script (no eval usage)
if ! NEED_TICKET=$(bash "$runner" node "$util_script" --need-ticket 2>/dev/null); then
    error "Failed to determine ticket requirement."
fi
if ! FOOTER_LABEL=$(bash "$runner" node "$util_script" --footer-label 2>/dev/null); then
    error "Failed to determine footer label."
fi

if [ "${NEED_TICKET}" = "yes" ]; then
    ticket_id=$(bash "$runner" node "$util_script" --extract-ticket "$current_branch" 2>/dev/null || true)
    if [ -z "${ticket_id:-}" ]; then
        error "No ticket ID found in branch name."
    fi
    commit_body=$(sed '1d;/^#/d' "$1") || commit_body=""
    if ! printf '%s' "$commit_body" | grep -qE "\\b${ticket_id}\\b"; then
        { echo ""; echo "${FOOTER_LABEL:-Closes}: $ticket_id"; } >> "$1"
    fi
fi

exit 0
