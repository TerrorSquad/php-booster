#!/usr/bin/env bash

# Set -eu
# -e: Exit immediately if a command exits with a non-zero status.
# -u: Treat unset variables as an error and exit immediately.
# This ensures that the script fails fast and avoids silent errors.
set -eu

ROOT=$(git rev-parse --show-toplevel)
GIT_DIR=$(git rev-parse --git-dir)

# Check if MERGE_HEAD exists
if [ -f "$GIT_DIR/MERGE_HEAD" ]; then
    # Skip the hook during a merge
    exit 0
fi

runner="$ROOT/tools/runner.sh"
current_branch=$(git symbolic-ref --short HEAD)
branch_regex='^(feature|fix|chore|story|task|bug|sub-task)/(PRJ|ERM)-[0-9]+(-.+)?$'

if ! echo "$current_branch" | grep -qiE "$branch_regex"; then
    echo "ERROR: Invalid branch name format. Use <type>/<prefix>-<ticket_number>-<description>."
    echo "Example: feature/PRJ-1234-amazing-new-feature"
    exit 1
fi

bash "$runner" node_modules/.bin/commitlint --edit "$1"

# Extract ticket Id from the branch name
ticket_id=$(echo "$current_branch" | grep -oE '(PRJ|ERM)-[0-9]+') # Use -oE to extract ticket ID

# Append Ticket ID to Commit Body
commit_body=$(sed '1d;/^#/d' "$1") # Remove first line and comments
if ! echo "$commit_body" | grep -qE "$ticket_id"; then
    echo "" >>"$1"
    echo "Closes: $ticket_id" >>"$1"
fi
