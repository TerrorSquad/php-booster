#!/bin/bash

# Source the shared environment script to get HOST_ROOT, PROJECT_NAME, and CONTAINER_NAME
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/ddev-env.sh"

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
