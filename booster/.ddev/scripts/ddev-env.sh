#!/bin/bash

# Shared script to determine environment variables for DDEV scripts
# This script should be sourced by other scripts

# Resolve the directory of this script (ddev-env.sh)
# This allows us to find the project root relative to this script
# regardless of where the calling script is located.
ENV_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Project root is two levels up from .ddev/scripts/
# We use this method to ensure we get the absolute path to the project root
HOST_ROOT="$(cd "$ENV_SCRIPT_DIR/../.." && pwd)"

if [ ! -f "$HOST_ROOT/.ddev/config.yaml" ]; then
    # Fallback: if we can't find config relative to script, try PWD
    # This handles cases where the script might be moved or symlinked oddly
    if [ -f "$PWD/.ddev/config.yaml" ]; then
         HOST_ROOT="$PWD"
    else
         echo "Error: Could not find .ddev/config.yaml at $HOST_ROOT or $PWD" >&2
         exit 1
    fi
fi

# Extract project name; handle potential quotes in config.yaml
# We use head -n 1 to ensure we only get the primary name entry
PROJECT_NAME=$(grep '^name:' "$HOST_ROOT/.ddev/config.yaml" | head -n 1 | awk '{print $2}' | tr -d '"' | tr -d "'")
CONTAINER_NAME="ddev-${PROJECT_NAME}-web"

export HOST_ROOT
export PROJECT_NAME
export CONTAINER_NAME
