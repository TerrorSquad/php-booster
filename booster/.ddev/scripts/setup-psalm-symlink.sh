#!/bin/bash

# Determine the project root on the host dynamically
# This script is in .ddev/scripts/, so we need to go up two levels to get to the project root
HOST_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Extract project name; handle potential quotes in config.yaml
PROJECT_NAME=$(grep '^name:' "$HOST_ROOT/.ddev/config.yaml" | awk '{print $2}' | tr -d '"' | tr -d "'")
CONTAINER_NAME="ddev-${PROJECT_NAME}-web"

echo "Setting up Psalm symlink for $PROJECT_NAME..."
echo "Host Root: $HOST_ROOT"
echo "Container Name: $CONTAINER_NAME"

# Create the directory structure for the symlink inside the container
# We need to create the parent directory of the host root path
PARENT_DIR=$(dirname "$HOST_ROOT")

# Create parent directory inside container
docker exec -u root "$CONTAINER_NAME" mkdir -p "$PARENT_DIR"

# Create the symlink: HOST_ROOT -> /var/www/html
# -s: symbolic link
# -f: force (remove existing destination file)
# -n: no dereference (treat destination as normal file if it is a symlink to a directory)
docker exec -u root "$CONTAINER_NAME" ln -sfn /var/www/html "$HOST_ROOT"

echo "Symlink created: $HOST_ROOT -> /var/www/html inside $CONTAINER_NAME"
