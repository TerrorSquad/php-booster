#!/bin/bash

# Determine the project root on the host dynamically
HOST_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Extract project name; handle potential quotes in config.yaml
PROJECT_NAME=$(grep '^name:' "$HOST_ROOT/.ddev/config.yaml" | awk '{print $2}' | tr -d '"' | tr -d "'")
CONTAINER_NAME="ddev-${PROJECT_NAME}-web"

# Initialize an array for the new arguments
NEW_ARGS=()

for arg in "$@"; do
  # Skip arguments that would confuse the Psalm Phar inside the container
  [[ "$arg" == *"psalm.phar" ]] && continue
  [[ "$arg" == *"vendor/bin/psalm" ]] && continue
  [[ "$arg" == -d* ]] && continue
  [[ "$arg" == -f* ]] && continue
  [[ "$arg" == "--" ]] && continue

  NEW_ARGS+=("$arg")
done

# Execute Psalm
# -i: keeps STDIN open (critical for Language Server Protocol)
# -w: sets the working dir to the HOST path (which is symlinked in the container)
# exec: replaces the bash process with docker so signals (like SIGTERM) are passed through
exec docker exec -i -w "$HOST_ROOT" "$CONTAINER_NAME" ./vendor/bin/psalm.phar "${NEW_ARGS[@]}"
