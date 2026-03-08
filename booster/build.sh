#!/usr/bin/env bash

# Build script to compile the integration script from source

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

SRC_DIR="src"
OUTPUT_FILE="integrate_booster.sh"

TMP_FILE="${OUTPUT_FILE}.tmp.$$"

# Clean up temporary file on error
trap 'rm -f "$TMP_FILE"' ERR

echo "Building $OUTPUT_FILE..."

# Validate manifest.json exists and is valid JSON
if [ ! -f "manifest.json" ]; then
    echo "ERROR: manifest.json not found in booster directory."
    echo "The manifest file is required for the integration script to function."
    exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
    echo "WARNING: jq is not installed. Cannot validate manifest.json syntax."
else
    if ! jq empty manifest.json 2>/dev/null; then
        echo "ERROR: manifest.json is not valid JSON."
        exit 1
    fi
    if ! jq -e '.version' manifest.json >/dev/null 2>&1; then
        echo "ERROR: manifest.json is missing required 'version' field."
        exit 1
    fi
    echo "  ✓ manifest.json is valid (version: $(jq -r '.version' manifest.json))"
fi

# Ensure temporary output file is empty
> "$TMP_FILE"

# Concatenate files in the correct order
cat "$SRC_DIR/header.sh" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"

cat "$SRC_DIR/lib/version.sh" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"

cat "$SRC_DIR/lib/logging.sh" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"

cat "$SRC_DIR/lib/interactive.sh" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"

cat "$SRC_DIR/lib/utils.sh" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"

cat "$SRC_DIR/lib/files.sh" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"

cat "$SRC_DIR/lib/ddev.sh" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"

cat "$SRC_DIR/lib/composer.sh" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"

cat "$SRC_DIR/lib/node.sh" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"

cat "$SRC_DIR/main.sh" >> "$TMP_FILE"

chmod +x "$TMP_FILE"
mv "$TMP_FILE" "$OUTPUT_FILE"

echo "Build complete: $OUTPUT_FILE"
