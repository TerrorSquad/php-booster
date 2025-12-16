#!/usr/bin/env bash

# Generic runner script - handles DDEV container detection and command execution

# Resolve the directory of the script and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Resolve the real path of the script to find the booster root (where dependencies are)
REAL_SCRIPT_PATH=$(realpath "${BASH_SOURCE[0]}")
REAL_SCRIPT_DIR="$(dirname "$REAL_SCRIPT_PATH")"
BOOSTER_ROOT="$(cd "$REAL_SCRIPT_DIR/../.." && pwd)"

# If running via symlink (PROJECT_ROOT != BOOSTER_ROOT), add booster dependencies to PATH
RELATIVE_BOOSTER_PATH=""
if [ "$PROJECT_ROOT" != "$BOOSTER_ROOT" ]; then
    export PATH="$BOOSTER_ROOT/node_modules/.bin:$BOOSTER_ROOT/vendor/bin:$PATH"
    export NODE_PATH="$BOOSTER_ROOT/node_modules:$NODE_PATH"
    RELATIVE_BOOSTER_PATH=$(realpath --relative-to="$PROJECT_ROOT" "$BOOSTER_ROOT")
fi

# Change to project root to ensure context is correct
cd "$PROJECT_ROOT" || exit 1

# Ensure psalm symlink exists if psalm.phar is present but psalm is not
# This allows using 'psalm' command consistently even if only psalm.phar is installed
if [ -f "vendor/bin/psalm.phar" ] && [ ! -f "vendor/bin/psalm" ]; then
    ln -s psalm.phar "vendor/bin/psalm"
fi

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
        whitelist=(
            "SKIP_PRECOMMIT" "SKIP_PREPUSH" "SKIP_COMMITMSG"
            "SKIP_ESLINT" "SKIP_PRETTIER" "SKIP_STYLELINT"
            "SKIP_RECTOR" "SKIP_ECS" "SKIP_PHPSTAN" "SKIP_PSALM" "SKIP_DEPTRAC"
            "SKIP_PHPUNIT" "SKIP_API_DOCS" "GIT_HOOKS_VERBOSE"
        )

        env_flags=()
        for var in "${whitelist[@]}"; do
            if [ -n "${!var+x}" ]; then
                env_flags+=("-e" "${var}=${!var}")
            fi
        done

        # Construct PATH to include project binaries
        # We need both node_modules/.bin (for zx, commitlint) and vendor/bin (for PHP tools)
        # These are located at the project root (/var/www/html) in the container
        local container_path="/var/www/html/node_modules/.bin:/var/www/html/vendor/bin"

        # If running from a subdirectory (e.g. dev mode), add those paths too
        if [ -n "$RELATIVE_BOOSTER_PATH" ]; then
            container_path="/var/www/html/$RELATIVE_BOOSTER_PATH/node_modules/.bin:/var/www/html/$RELATIVE_BOOSTER_PATH/vendor/bin:$container_path"
        fi

        # Execute command in container with updated PATH
        exec docker exec -t "${env_flags[@]}" "$container_name" \
            sh -c "export PATH=$container_path:\$PATH; exec \"\$@\"" -- "$@"
    fi
}

if [ "$DDEV_AVAILABLE" = true ] && [ -f "$DDEV_CONFIG_FILE" ] && [ "$DOCKER_AVAILABLE" = true ]; then
    run_in_ddev_container "$@"
else
    exec "$@"
fi
