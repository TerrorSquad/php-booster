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
