#!/usr/bin/env bash

# Build script to compile the integration script from source

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

SRC_DIR="src"
OUTPUT_FILE="integrate_booster.sh"

echo "Building $OUTPUT_FILE..."

# Ensure output file is empty
> "$OUTPUT_FILE"

# Concatenate files in the correct order
cat "$SRC_DIR/header.sh" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

cat "$SRC_DIR/lib/version.sh" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

cat "$SRC_DIR/lib/logging.sh" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

cat "$SRC_DIR/lib/interactive.sh" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

cat "$SRC_DIR/lib/utils.sh" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

cat "$SRC_DIR/lib/files.sh" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

cat "$SRC_DIR/lib/ddev.sh" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

cat "$SRC_DIR/lib/composer.sh" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

cat "$SRC_DIR/lib/node.sh" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

cat "$SRC_DIR/main.sh" >> "$OUTPUT_FILE"

chmod +x "$OUTPUT_FILE"

echo "Build complete: $OUTPUT_FILE"
