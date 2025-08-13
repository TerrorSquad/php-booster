#!/usr/bin/env bash

# Strict mode
set -euo pipefail
IFS=$'\n\t'

# Source common library
PROJECT_ROOT="$(git rev-parse --show-toplevel)"
source "$PROJECT_ROOT/tools/git-hooks/lib/common.sh"

# --- Early Exit Conditions ---
should_skip_commit_checks() {
    if should_skip_during_merge; then
        return 0
    fi
    return 1
}

check_dependencies() {
    check_node_modules
}

# --- Validation Functions ---
validate_branch_name() {
    if ! run_command_quiet node_modules/.bin/validate-branch-name -t "$CURRENT_BRANCH"; then
        # Run again without suppression to show the error details
        bash "$RUNNER" node_modules/.bin/validate-branch-name -t "$CURRENT_BRANCH"
        error_exit "Branch name validation failed. See rules in validate-branch-name.config.cjs."
    fi
}

lint_commit_message() {
    local commit_file="$1"
    run_command "commitlint" node_modules/.bin/commitlint --edit "$commit_file"
}

append_ticket_footer() {
    local commit_file="$1"

    check_file_exists "$UTIL_SCRIPT" "commit-utils.py helper script"

    # Query NEED_TICKET & FOOTER_LABEL via helper script
    local need_ticket footer_label
    if ! need_ticket=$(bash "$RUNNER" python3 "$UTIL_SCRIPT" --need-ticket 2>/dev/null); then
        error_exit "Failed to determine ticket requirement."
    fi
    if ! footer_label=$(bash "$RUNNER" python3 "$UTIL_SCRIPT" --footer-label 2>/dev/null); then
        error_exit "Failed to determine footer label."
    fi

    if [ "${need_ticket}" = "yes" ]; then
        local ticket_id
        ticket_id=$(bash "$RUNNER" python3 "$UTIL_SCRIPT" --extract-ticket "$CURRENT_BRANCH" 2>/dev/null || true)
        if [ -z "${ticket_id:-}" ]; then
            error_exit "No ticket ID found in branch name."
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

    init_common

    if should_skip_commit_checks; then
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
