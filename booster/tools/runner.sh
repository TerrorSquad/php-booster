#!/usr/bin/env bash

# Runner script that executes commands either in a DDEV container or directly on the host
# Automatically detects the environment and routes commands appropriately

set -euo pipefail
IFS=$'\n\t'

# --- Environment Setup ---
setup_environment() {
    local root_dir
    root_dir=$(git rev-parse --show-toplevel)
    readonly ROOT_DIR="$root_dir"
    readonly DDEV_CONFIG="$ROOT_DIR/.ddev/config.yaml"
    
    local is_ddev
    is_ddev=$([ -d "$ROOT_DIR/.ddev" ] && echo true || echo false)
    readonly IS_DDEV_PROJECT="$is_ddev"
}

# --- Environment Detection ---
is_inside_ddev_container() {
    if [ "$IS_DDEV_PROJECT" = "false" ]; then
        return 1
    fi
    
    local project_name current_hostname
    
    # Extract project name from DDEV configuration
    if [ ! -f "$DDEV_CONFIG" ]; then
        return 1
    fi
    
    project_name=$(grep "name: " "$DDEV_CONFIG" | head -1 | cut -f 2 -d ' ' 2>/dev/null || echo "")
    current_hostname=$(hostname 2>/dev/null || echo "")
    
    # Check if we're already inside the DDEV web container
    [ "$current_hostname" = "${project_name}-web" ]
}

# --- Command Execution ---
execute_command_directly() {
    "$@"
}

execute_command_in_ddev() {
    if is_inside_ddev_container; then
        # Already inside container, execute directly
        execute_command_directly "$@"
    else
        # Outside container, use ddev exec to run command inside
        ddev exec "$@"
    fi
}

run_command() {
    if [ "$IS_DDEV_PROJECT" = "false" ]; then
        # DDEV not available, run command directly on host
        execute_command_directly "$@"
    else
        # DDEV available, run command in container
        execute_command_in_ddev "$@"
    fi
}

# --- Main Execution ---
main() {
    setup_environment
    run_command "$@"
}

main "$@"
