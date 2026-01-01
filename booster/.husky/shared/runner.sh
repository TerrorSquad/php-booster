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

# Load mise if available to ensure pnpm is found
if command -v mise &> /dev/null; then
  eval "$(mise activate bash)"
fi

# Prevent running hooks inside DDEV container
if [ "$IS_DDEV_PROJECT" == "true" ]; then
    echo "❌ Error: Git hooks are configured to run on the host machine." >&2
    echo "   Please run git commands from your host terminal, not inside the DDEV container." >&2
    exit 1
fi

# Main execution
if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <command> [arguments...]" >&2
    exit 1
fi

# Execute the command directly on the host
exec "$@"
