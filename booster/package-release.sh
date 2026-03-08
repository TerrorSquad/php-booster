#!/bin/sh

# Package script to create booster.zip for distribution
# This script creates a minimal booster package excluding unnecessary files
# Usage: bash package-release.sh [output_dir]

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="${1:-.}"

# Normalize output directory to an absolute path so ZIP_PATH stays valid after cd.
case "$OUTPUT_DIR" in
  /*) ;;
  *) OUTPUT_DIR="$(cd "$OUTPUT_DIR" 2>/dev/null && pwd)" ;;
esac

TEMP_DIR=$(mktemp -d)
ZIP_NAME="booster.zip"
ZIP_PATH="${OUTPUT_DIR}/${ZIP_NAME}"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Files/dirs to include in the package
INCLUDE_ITEMS=$(cat <<'EOF'
.editorconfig
.git-hooks.config.example.json
.git-hooks.config.schema.json
.github
.gitignore
.husky
.markdownlint-cli2.jsonc
.phpstorm
.ddev/config.yaml
.ddev/commands
.ddev/php
.ddev/web-build
.ddev/scripts
.prettierignore
.vscode
bin
commitlint.config.ts
composer.json
deptrac.yaml
ecs.php
manifest.json
openapi
package.json
phpstan.neon.dist
pnpm-lock.dist.yaml
pnpm-workspace.yaml
psalm.xml
rector.php
renovate.json
sonar-project.properties
src
validate-branch-name.config.cjs
README_SNIPPET.md
EOF
)

echo "Creating booster package..."
echo "Source directory: $SCRIPT_DIR"
echo "Output directory: $OUTPUT_DIR"
echo "Temporary directory: $TEMP_DIR"

# Create package structure
PACKAGE_DIR="$TEMP_DIR/booster"
mkdir -p "$PACKAGE_DIR"

# Copy include items
echo "$INCLUDE_ITEMS" | while IFS= read -r item; do
  [ -n "$item" ] || continue
  src_path="$SCRIPT_DIR/$item"
  dest_path="$PACKAGE_DIR/$item"
  dest_parent=$(dirname "$dest_path")

  mkdir -p "$dest_parent"

  if [ -e "$src_path" ]; then
    if [ -d "$src_path" ]; then
      cp -R "$src_path" "$dest_path"
      echo "  ✓ Copied directory: $item"
    else
      cp "$src_path" "$dest_path"
      echo "  ✓ Copied file: $item"
    fi
  else
    echo "  ✗ Not found (skipping): $item"
  fi
done

# Create .booster-package marker file
cat > "$PACKAGE_DIR/.booster-package" << 'EOF'
# This file marks the booster package (distributed as ZIP)
# It helps identify that this is a packaged distribution, not a git clone
PACKAGED=true
PACKAGE_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

echo "  ✓ Created .booster-package marker"

# Create ZIP file
ORIGINAL_DIR=$(pwd)
cd "$TEMP_DIR"
zip -r -q "$ZIP_PATH" booster/
cd "$ORIGINAL_DIR"

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✓ Package created successfully: $ZIP_PATH"
echo "  File size: $(du -h "$ZIP_PATH" | cut -f1)"
echo ""
echo "To use this package, upload it as a GitHub release asset."
