#!/bin/bash
# This script generates the local .vscode/settings.json file.

set -euo pipefail

trap 'echo "ERROR: generate-vscode-settings.sh failed at line ${LINENO}" >&2' ERR

# Source the shared environment script to get HOST_ROOT, PROJECT_NAME, and CONTAINER_NAME
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/ddev-env.sh"

mkdir -p .vscode

if [ ! -f ".vscode/settings.json.dist" ]; then
    echo "ERROR: required file .vscode/settings.json.dist not found" >&2
    exit 1
fi

TMP_SETTINGS_FILE=".vscode/settings.json.tmp"

# 3. Perform the replacements
# We use | as a delimiter in sed because paths contain slashes /
sed -e "s|{{PROJECT_ROOT}}|$HOST_ROOT|g" \
    -e "s|{{CONTAINER_NAME}}|$CONTAINER_NAME|g" \
    .vscode/settings.json.dist > "$TMP_SETTINGS_FILE"

mv "$TMP_SETTINGS_FILE" .vscode/settings.json

echo "✅ Generated .vscode/settings.json for container: $CONTAINER_NAME"
