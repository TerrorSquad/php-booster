#!/usr/bin/env bash

# Generic runner script - handles DDEV container detection and command execution

# Resolve the directory of the script and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Change to project root to ensure context is correct
cd "$PROJECT_ROOT" || exit 1

# Load mise if available to ensure pnpm is found
if command -v mise &> /dev/null; then
eval "$(mise activate bash)"
fi

# Main execution
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <command> [arguments...]" >&2
    exit 1
fi

DDEV_AVAILABLE=false
if command -v ddev >/dev/null 2>&1; then
    DDEV_AVAILABLE=true
fi

DDEV_CONFIG_FILE=".ddev/config.yaml"
DDEV_PROJECT=false
if [ -f "$DDEV_CONFIG_FILE" ]; then
    DDEV_PROJECT=true
fi

DOCKER_AVAILABLE=false
if command -v docker >/dev/null 2>&1; then
    DOCKER_AVAILABLE=true
fi

run_in_ddev_container() {
    # Try to use docker exec -t for better color support
    # Get project name from .ddev/config.yaml to construct container name
    project_name=$(grep "^name:" "$DDEV_CONFIG_FILE" | sed 's/name: *//' | tr -d '"')
    container_name="ddev-${project_name}-web"

    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        echo "Error: DDEV container '${container_name}' is not running." >&2
        echo "Please run 'ddev start' to start the project and enable git hooks." >&2
        exit 1
    fi

    if [ -n "$project_name" ]; then
        # Use docker exec -t for TTY support and colors
        # Forward a conservative whitelist of environment variables from the host
        # into the container so ZX hooks and wrappers can honour skip flags and
        # verbosity settings without exposing unrelated host environment values.
        # Whitelist derived from hook/utility usage and documented in hook comments:
        whitelist=(
            "SKIP_PRECOMMIT"
            "SKIP_PREPUSH"
            "SKIP_COMMITMSG"
            "SKIP_ESLINT"
            "SKIP_PRETTIER"
            "SKIP_STYLELINT"
            "SKIP_RECTOR"
            "SKIP_ECS"
            "SKIP_PHPSTAN"
            "SKIP_PSALM"
            "SKIP_DEPTRAC"
            "SKIP_PHPUNIT"
            "SKIP_API_DOCS"
            "GIT_HOOKS_VERBOSE"
        )

        env_flags=()
        for var in "${whitelist[@]}"; do
            # Only forward if variable is set in the host environment
            if [ -n "${!var+x}" ]; then
                env_flags+=("-e" "${var}=${!var}")
            fi
        done

        if [ ${#env_flags[@]} -gt 0 ]; then
            exec docker exec -t "${env_flags[@]}" "$container_name" "$@"
        else
            exec docker exec -t "$container_name" "$@"
        fi
    fi
}

if [ "$DDEV_AVAILABLE" = true ] && [ -f "$DDEV_CONFIG_FILE" ] && [ "$DOCKER_AVAILABLE" = true ]; then
    run_in_ddev_container "$@"
else
    exec "$@"
fi
