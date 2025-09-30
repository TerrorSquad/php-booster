#!/usr/bin/env bash

# Generic runner script - handles DDEV container detection and command execution

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
    # Try to use docker exec -t for better color support
    # Get project name from .ddev/config.yaml to construct container name
    if [ -f ".ddev/config.yaml" ]; then
        project_name=$(grep "^name:" .ddev/config.yaml | sed 's/name: *//' | tr -d '"')
        container_name="ddev-${project_name}-web"

        if [ -n "$project_name" ] && command -v docker >/dev/null 2>&1; then
            # Use docker exec -t for TTY support and colors
            exec docker exec -t "$container_name" "$@"
        fi
    fi
else
    exec "$@"
fi
