#!/bin/bash
# This script generates the local .vscode/settings.json file.

# Source the shared environment script to get HOST_ROOT, PROJECT_NAME, and CONTAINER_NAME
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/ddev-env.sh"

# 3. Perform the replacements
# We use | as a delimiter in sed because paths contain slashes /
sed -e "s|{{PROJECT_ROOT}}|$HOST_ROOT|g" \
    -e "s|{{CONTAINER_NAME}}|$CONTAINER_NAME|g" \
    .vscode/settings.json.dist > .vscode/settings.json

echo "✅ Generated .vscode/settings.json for container: $CONTAINER_NAME"
