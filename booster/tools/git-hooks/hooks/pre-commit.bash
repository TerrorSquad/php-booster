#!/usr/bin/env bash

# Strict + safe bash
set -euo pipefail
IFS=$'\n\t'

ROOT=$(git rev-parse --show-toplevel)
if [ -f "$ROOT/booster/tools/runner.sh" ]; then
    BASE="$ROOT/booster"
else
    BASE="$ROOT"
fi
GIT_DIR=$(git rev-parse --git-dir)

# Check if MERGE_HEAD exists
if [ -f "$GIT_DIR/MERGE_HEAD" ]; then
    # Skip the hook during a merge
    exit 0
fi

if [ "${BYPASS_PHP_ANALYSIS:-0}" = "1" ]; then
    echo "BYPASS_PHP_ANALYSIS=1 -> skipping PHP analysis checks." >&2
    exit 0
fi

runner="$BASE/tools/runner.sh"

mapfile -t PHP_FILES < <(git diff --diff-filter=ACMR --cached --name-only -- '*.php' ':!vendor/*') || true

if [ ${#PHP_FILES[@]} -eq 0 ]; then
    echo "No staged PHP files. Skipping PHP checks."
    exit 0
fi

echo "--- Running PHP checks on ${#PHP_FILES[@]} staged PHP file(s) ---"

# --- PHP Lint Check ---
echo "Running php -l syntax checks..."
for FILE in "${PHP_FILES[@]}"; do
    if ! bash "$runner" php -l -d display_errors=0 "$FILE" >/dev/null; then
        echo "PHP lint failed in $FILE" >&2
        exit 1
    fi
done
echo "Syntax OK for all staged PHP files."

# --- Rector (Run FIRST among modifiers) ---
if [ -f "$BASE/vendor/bin/rector" ]; then
    echo "Running Rector (auto-fix)..."
    bash "$runner" ./vendor/bin/rector process -- "${PHP_FILES[@]}"
    bash "$runner" git add "${PHP_FILES[@]}"
fi

# --- EasyCodingStandard (ECS) (Run SECOND among modifiers) ---
if [ -f "$BASE/vendor/bin/ecs" ]; then
    echo "Running ECS (auto-fix)..."
    bash "$runner" ./vendor/bin/ecs check --fix "${PHP_FILES[@]}"
    bash "$runner" git add "${PHP_FILES[@]}"
fi

if [ -f "$BASE/vendor/bin/deptrac" ]; then
    echo "Running Deptrac..."
    if ! bash "$runner" composer deptrac; then
        echo "Deptrac failed." >&2
        exit 1
    fi
    if bash "$runner" composer deptrac:image >/dev/null 2>&1; then
        [ -f deptrac.png ] && bash "$runner" git add deptrac.png
    fi
fi

# --- PHPStan ---
if [ -f "$BASE/vendor/bin/phpstan" ]; then
    echo "Running PHPStan..."
    bash "$runner" vendor/bin/phpstan analyse -c phpstan.neon.dist "${PHP_FILES[@]}" || { echo "PHPStan failed." >&2; exit 1; }
fi

# --- Psalm ---
# Check for psalm first, then psalm.phar
PSALM_BIN="vendor/bin/psalm"
if [ ! -f "$BASE/vendor/bin/psalm" ]; then
    PSALM_BIN="vendor/bin/psalm.phar"
else
    PSALM_BIN="vendor/bin/psalm"
fi

if [ -f "$BASE/$PSALM_BIN" ]; then
    echo "Running Psalm..."
    bash "$runner" "$PSALM_BIN" --show-info=false "${PHP_FILES[@]}" || { echo "Psalm failed." >&2; exit 1; }
fi

echo "--- PHP pre-commit checks completed successfully. ---"
exit 0
