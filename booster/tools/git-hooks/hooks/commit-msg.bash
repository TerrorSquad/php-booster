#!/usr/bin/env bash

# Strict mode
set -euo pipefail
IFS=$'\n\t'

# --- Environment Setup ---
setup_environment() {
    ROOT=$(git rev-parse --show-toplevel)
    if [ -f "$ROOT/booster/tools/runner.sh" ]; then
        BASE="$ROOT/booster"
    else
        BASE="$ROOT"
    fi
    readonly ROOT BASE

    local git_dir
    git_dir=$(git rev-parse --git-dir)
    readonly GIT_DIR="$git_dir"
    readonly RUNNER="$BASE/tools/runner.sh"

    local current_branch
    current_branch=$(git symbolic-ref --short HEAD)
    readonly CURRENT_BRANCH="$current_branch"

    # Use relative path for DDEV compatibility
    readonly UTIL_SCRIPT="./tools/commit-utils.js"
}

# --- Early Exit Conditions ---
should_skip_hook() {
    # Skip during merge
    if [ -f "$GIT_DIR/MERGE_HEAD" ]; then
        echo "Merge in progress. Skipping commit message checks."
        return 0
    fi

    return 1
}

check_dependencies() {
    if [ ! -d "$BASE/node_modules" ]; then
        local install_cmd
        if [ -d "$ROOT/.ddev" ]; then
            install_cmd="ddev pnpm install"
        else
            install_cmd="pnpm install"
        fi
        echo "ERROR: No node_modules directory detected. Please run '$install_cmd' before committing." >&2
        exit 1
    fi
}

error() {
    echo "ERROR: $*" >&2
    exit 1
}

# --- Validation Functions ---
validate_branch_name() {
    if ! bash "$RUNNER" node_modules/.bin/validate-branch-name -t "$CURRENT_BRANCH" > /dev/null 2>&1; then
        # Run again without suppression to show the error details
        bash "$RUNNER" node_modules/.bin/validate-branch-name -t "$CURRENT_BRANCH"
        error "Branch name validation failed. See rules in validate-branch-name.config.cjs."
    fi
}

lint_commit_message() {
    local commit_file="$1"
    bash "$RUNNER" node_modules/.bin/commitlint --edit "$commit_file"
}

append_ticket_footer() {
    local commit_file="$1"

    if [ ! -f "$UTIL_SCRIPT" ]; then
        error "Missing commit-utils.js helper script."
    fi

    # Query NEED_TICKET & FOOTER_LABEL via helper script
    local need_ticket footer_label
    if ! need_ticket=$(bash "$RUNNER" node "$UTIL_SCRIPT" --need-ticket 2>/dev/null); then
        error "Failed to determine ticket requirement."
    fi
    if ! footer_label=$(bash "$RUNNER" node "$UTIL_SCRIPT" --footer-label 2>/dev/null); then
        error "Failed to determine footer label."
    fi

    if [ "${need_ticket}" = "yes" ]; then
        local ticket_id
        ticket_id=$(bash "$RUNNER" node "$UTIL_SCRIPT" --extract-ticket "$CURRENT_BRANCH" 2>/dev/null || true)
        if [ -z "${ticket_id:-}" ]; then
            error "No ticket ID found in branch name."
        fi

        local commit_body
        commit_body=$(sed '1d;/^#/d' "$commit_file") || commit_body=""
        if ! printf '%s' "$commit_body" | grep -qE "\\b${ticket_id}\\b"; then
            { echo ""; echo "${footer_label:-Closes}: $ticket_id"; } >> "$commit_file"
        fi
    fi
}

# --- Main Execution ---
main() {
    local commit_file="$1"

    setup_environment

    if should_skip_hook; then
        exit 0
    fi

    check_dependencies

    # 1. Branch validation (shows rich error if fails)
    validate_branch_name

    # 2. Commitlint (lint commit message before we mutate it)
    lint_commit_message "$commit_file"

    # 3. Append ticket footer if needed
    append_ticket_footer "$commit_file"
}

main "$@"
