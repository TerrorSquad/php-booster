#!/usr/bin/env bash

# Generic runner script - handles DDEV container detection and command execution

# Force color output to preserve colors through shell layers and WSL
export FORCE_COLOR=1
export CLICOLOR_FORCE=1
export NO_COLOR=
export TERM=${TERM:-xterm-256color}
# Ensure Node.js tools output colors
export NPM_CONFIG_COLOR=always
export PNPM_CONFIG_COLOR=always

# Check if we're inside a DDEV container
is_inside_container() {
    [[ -n "$DDEV_HOSTNAME" || -n "$DDEV_PROJECT" || -n "$DDEV_SITENAME" ]]
}

# Main execution
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <command> [arguments...]" >&2
    exit 1
fi

if is_inside_container; then
    exec "$@"
elif command -v ddev >/dev/null 2>&1; then
    # Use bash -c to set environment variables and run command
    # Quote the entire command properly
    quoted_args=""
    for arg in "$@"; do
        quoted_args="$quoted_args $(printf '%q' "$arg")"
    done
    exec ddev exec bash -c "export FORCE_COLOR=1 CLICOLOR_FORCE=1 NO_COLOR= TERM=xterm-256color NPM_CONFIG_COLOR=always PNPM_CONFIG_COLOR=always; $quoted_args"
else
    exec "$@"
fi