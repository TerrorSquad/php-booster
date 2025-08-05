#!/usr/bin/env bash

# Set -eu
# -e: Exit immediately if a command exits with a non-zero status.
# -u: Treat unset variables as an error and exit immediately.
# This ensures that the script fails fast and avoids silent errors.
set -eu

ROOT=$(git rev-parse --show-toplevel)
GIT_DIR=$(git rev-parse --git-dir)

# Check if MERGE_HEAD exists
if [ -f "$GIT_DIR/MERGE_HEAD" ]; then
    # Skip the hook during a merge
    exit 0
fi

ALLOW_ANALYSIS_VAR="BYPASS_PHP_ANALYSIS"

if [ "${!ALLOW_ANALYSIS_VAR}" == "1" ]; then
    echo "BYPASS_PHP_ANALYSIS is set to 1. Skipping code quality checks."
    exit 0
fi

runner="$ROOT/tools/runner.sh"

# Filter for only .php files (using grep)
STAGED_FILES=$(git diff --diff-filter=ACMR --cached --name-only -- . ":(exclude)vendor/*" HEAD)

# Filter for only PHP files and store in a new variable
PHP_FILES=""
for FILE in $STAGED_FILES; do
    if [[ "$FILE" =~ \.php$ ]]; then
        PHP_FILES="$PHP_FILES $FILE"
    fi
done

# Trim whitespace from the list of PHP files
PHP_FILES=$(echo "$PHP_FILES" | xargs)

# Check if there are any staged PHP files
if [ -z "$PHP_FILES" ]; then
    echo "No staged PHP files found. Skipping PHP checks..."
    exit 0
fi

echo "--- Running PHP Checks on Staged Files ---"

# --- PHP Lint Check ---
echo "Checking PHP Lint..."
for FILE in $PHP_FILES; do
    bash "$runner" php -l -d display_errors=0 "$FILE"
    if [ $? -ne 0 ]; then
        echo "PHP Lint failed in $FILE. Please fix the error before commit."
        exit 1 # Always exit for basic lint errors, as they prevent code execution
    fi
done
echo "PHP Lint check passed."

# --- Rector (Run FIRST among modifiers) ---
if [ -f "$ROOT/vendor/bin/rector" ]; then
    echo "Running Rector..."
    # Run Rector on staged files and automatically fix issues
    bash "$runner" "./vendor/bin/rector" process -- $PHP_FILES
    # Re-add files to staging area after Rector might have modified them
    bash "$runner" git add $PHP_FILES
    echo "Rector finished. Files re-added to staging."
fi

# --- EasyCodingStandard (ECS) (Run SECOND among modifiers) ---
if [ -f "$ROOT/vendor/bin/ecs" ]; then
    echo "Running EasyCodingStandard..."
    # Run ECS on staged files and automatically fix issues
    bash "$runner" "./vendor/bin/ecs" check --fix $PHP_FILES
    # Re-add files to staging area after ECS might have modified them
    bash "$runner" git add $PHP_FILES
    echo "EasyCodingStandard finished. Files re-added to staging."
fi

if [ -f "$ROOT/vendor/bin/deptrac" ]; then
    echo "Running Deptrac..."
    # Run Deptrac on the relevant code paths (often the whole src directory)
    bash "$runner" composer deptrac
    DEPTRAC_RESULT=$?
    if [ $DEPTRAC_RESULT -ne 0 ]; then
        echo "Deptrac failed. Please fix the architectural issues before committing."
        exit $DEPTRAC_RESULT # Usually, deptrac failures should block commits
    fi
    # Optional: Generate and add deptrac image if configured
    bash "$runner" composer deptrac:image
    bash "$runner" git add deptrac.png # Add generated image if applicable
    echo "Deptrac check passed."
fi

# --- PHPStan ---
if [ -f "$ROOT/vendor/bin/phpstan" ]; then
    echo "Running PHPStan..."
    # Run PHPStan analysis on staged files
    bash "$runner" "vendor/bin/phpstan" analyse -c phpstan.neon.dist $PHP_FILES
    PHPSTAN_RESULT=$?
    if [ $PHPSTAN_RESULT -ne 0 ]; then
        echo "PHPStan failed. Please fix the issues before commit."
        exit $PHPSTAN_RESULT # Exit if errors and bypass is not enabled
    fi
    echo "PHPStan check passed."
fi

# --- Psalm ---
# Check for psalm first, then psalm.phar
PSALM_BIN="vendor/bin/psalm"
if [ ! -f "$ROOT/vendor/bin/psalm" ]; then
    PSALM_BIN="vendor/bin/psalm.phar"
fi

if [ -f "$PSALM_BIN" ]; then
    echo "Running Psalm..."
    # Run Psalm analysis on staged files
    bash "$runner" "$PSALM_BIN" --show-info=false $PHP_FILES
    PSALM_RESULT=$?

    if [ $PSALM_RESULT -ne 0 ]; then
        echo "Psalm failed. Please fix the issues before commit."
        exit $PSALM_RESULT # Exit if errors and bypass is not enabled
    fi
    echo "Psalm check passed."
fi

echo "--- All staged PHP file checks completed. ---"
exit 0
