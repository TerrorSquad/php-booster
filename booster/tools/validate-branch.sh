#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

# --- Environment Setup ---
setup_environment() {
    local root
    root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
    readonly ROOT="$root"
    
    if [ -f "$ROOT/booster/tools/runner.sh" ]; then
        readonly BASE="$ROOT/booster"
    else
        readonly BASE="$ROOT"
    fi
    
    readonly RUNNER="$BASE/tools/runner.sh"
    readonly VALIDATOR_BIN="node_modules/.bin/validate-branch-name"
}

# --- Branch Detection ---
get_branch_name() {
    local branch="${1:-}"
    
    # Use provided branch name or detect current branch
    if [ -z "$branch" ]; then
        if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
            branch=$(git symbolic-ref --short HEAD 2>/dev/null || true)
        fi
    fi
    
    echo "$branch"
}

# --- Validation ---
validate_branch() {
    local branch="$1"
    
    if [ -z "$branch" ]; then
        echo "Usage: $0 <branch-name> (or run inside a git repo)" >&2
        echo "No branch name provided and not inside a git repository." >&2
        exit 2
    fi
    
    echo "Validating branch: $branch"
    
    if ! [ -f "$BASE/$VALIDATOR_BIN" ]; then
        echo "ERROR: validate-branch-name not found at $BASE/$VALIDATOR_BIN" >&2
        echo "Please run 'npm install' or 'pnpm install' first." >&2
        exit 1
    fi
    
    if bash "$RUNNER" "$VALIDATOR_BIN" -t "$branch"; then
        echo "✔ Branch is valid"
        return 0
    else
        echo "✖ Branch is INVALID" >&2
        echo "See validation rules in validate-branch-name.config.cjs" >&2
        return 1
    fi
}

# --- Main Execution ---
main() {
    setup_environment
    
    local branch
    branch=$(get_branch_name "${1:-}")
    
    validate_branch "$branch"
}

main "$@"
