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

# Safely remove the destination if it exists to ensure symlink creation works.
# We use 'rmdir' for directories to ensure we NEVER delete a non-empty directory
# (which could happen if the path was accidentally mounted).
docker exec -u root "$CONTAINER_NAME" sh -c "
    if [ -L \"$HOST_ROOT\" ] || [ -f \"$HOST_ROOT\" ]; then
        rm -f \"$HOST_ROOT\"
    elif [ -d \"$HOST_ROOT\" ]; then
        rmdir \"$HOST_ROOT\" || (echo 'Error: $HOST_ROOT is a non-empty directory inside the container. Aborting to prevent data loss.' && exit 1)
    fi
"

# Create the symlink: HOST_ROOT -> /var/www/html
# This "Symlink Hack" allows Psalm running inside the container to use the same absolute paths
# as the host machine. This enables VS Code to map errors back to the correct files without
# complex path mapping configurations in the extension.
#
# -s: symbolic link
# -f: force (remove existing destination file)
# -n: no dereference (treat destination as normal file if it is a symlink to a directory)
docker exec -u root "$CONTAINER_NAME" ln -sfn /var/www/html "$HOST_ROOT"

echo "Symlink created: $HOST_ROOT -> /var/www/html inside $CONTAINER_NAME"

# Ensure psalm symlink exists if psalm.phar is present but psalm is not
# This allows using 'psalm' command consistently even if only psalm.phar is installed
if [ -f "vendor/bin/psalm.phar" ] && [ ! -f "vendor/bin/psalm" ]; then
    ln -s psalm.phar "vendor/bin/psalm"
fi
