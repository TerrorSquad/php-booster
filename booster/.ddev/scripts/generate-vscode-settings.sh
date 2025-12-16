#!/bin/bash
# This script generates the local .vscode/settings.json file.

# 1. Get Project Root (Host)
HOST_ROOT="$PWD"

# 2. Get Project Name from DDEV config
# We use head -n 1 to ensure we only get the primary name entry
PROJECT_NAME=$(grep '^name:' .ddev/config.yaml | head -n 1 | awk '{print $2}')
CONTAINER_NAME="ddev-${PROJECT_NAME}-web"

# 3. Perform the replacements
# We use | as a delimiter in sed because paths contain slashes /
sed -e "s|{{PROJECT_ROOT}}|$HOST_ROOT|g" \
    -e "s|{{CONTAINER_NAME}}|$CONTAINER_NAME|g" \
    .vscode/settings.json.dist > .vscode/settings.json

echo "✅ Generated .vscode/settings.json for container: $CONTAINER_NAME"
