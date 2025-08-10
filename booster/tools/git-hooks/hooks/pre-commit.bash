#!/usr/bin/env bash

if [ "${BYPASS_PHP_ANALYSIS:-0}" == "1" ]; then
    echo "🚫 BYPASS_PHP_ANALYSIS is set. Skipping code quality checks."
    exit 0
fi

# Check if MERGE_HEAD exists
if [ -f "$GIT_DIR/MERGE_HEAD" ]; then
    echo "🔀 Merge in progress. Skipping pre-commit hook."
    exit 0
fi

runner="./tools/runner.sh"

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
    echo "ℹ️  No staged PHP files found. Skipping PHP checks..."
    exit 0
fi

echo "📋 Running PHP Checks on Staged Files"

# --- PHP Lint Check ---
echo "🔍 Checking PHP syntax..."
for FILE in $PHP_FILES; do
    bash "$runner" php -l -d display_errors=0 "$FILE"
    if [ $? -ne 0 ]; then
        echo "❌ PHP syntax error in: $FILE"
        echo "💡 Fix the syntax error and try again."
        exit 1 # Always exit for basic lint errors, as they prevent code execution
    fi
done
echo "✅ PHP syntax check passed"

# --- Rector (Run FIRST among modifiers) ---
if [ -f "./vendor/bin/rector" ]; then
    echo "🔧 Running Rector (auto-fix)..."
    # Run Rector on staged files and automatically fix issues
    bash "$runner" "./vendor/bin/rector" process -- $PHP_FILES
    # Re-add files to staging area after Rector might have modified them
    bash "$runner" git add $PHP_FILES
    echo "✅ Rector completed. Files re-added to staging."
fi

# --- EasyCodingStandard (ECS) (Run SECOND among modifiers) ---
if [ -f "./vendor/bin/ecs" ]; then
    echo "🎨 Running ECS (coding standards)..."
    # Run ECS on staged files and automatically fix issues
    bash "$runner" "./vendor/bin/ecs" check --fix $PHP_FILES
    # Re-add files to staging area after ECS might have modified them
    bash "$runner" git add $PHP_FILES
    echo "✅ ECS completed. Files re-added to staging."
fi

if [ -f "./vendor/bin/deptrac" ]; then
    echo "🏗️  Running Deptrac (architecture analysis)..."
    # Run Deptrac on the relevant code paths (often the whole src directory)
    bash "$runner" composer deptrac
    DEPTRAC_RESULT=$?
    if [ $DEPTRAC_RESULT -ne 0 ]; then
        echo "❌ Deptrac found architectural violations"
        echo "💡 Fix the reported architectural issues and try again."
        exit $DEPTRAC_RESULT # Usually, deptrac failures should block commits
    fi
    # Optional: Generate and add deptrac image if configured
    bash "$runner" composer deptrac:image
    bash "$runner" git add deptrac.png # Add generated image if applicable
    echo "✅ Deptrac check passed"
fi

# --- PHPStan ---
if [ -f "./vendor/bin/phpstan" ]; then
    echo "🔍 Running PHPStan (static analysis)..."
    # Run PHPStan analysis on staged files
    bash "$runner" "vendor/bin/phpstan" analyse -c phpstan.neon.dist $PHP_FILES
    PHPSTAN_RESULT=$?
    if [ $PHPSTAN_RESULT -ne 0 ]; then
        echo "❌ PHPStan found issues"
        echo "💡 Fix the reported issues and try again."
        exit $PHPSTAN_RESULT # Exit if errors and bypass is not enabled
    fi
    echo "✅ PHPStan check passed"
fi

# --- Psalm ---
# Check for psalm first, then psalm.phar
PSALM_BIN="vendor/bin/psalm"
if [ ! -f "./vendor/bin/psalm" ]; then
    PSALM_BIN="vendor/bin/psalm.phar"
fi

if [ -f "./$PSALM_BIN" ]; then
    echo "🔍 Running Psalm (static analysis)..."
    # Run Psalm analysis on staged files
    bash "$runner" "$PSALM_BIN" --show-info=false $PHP_FILES
    PSALM_RESULT=$?

    if [ $PSALM_RESULT -ne 0 ]; then
        echo "❌ Psalm found issues"
        echo "💡 Fix the reported issues and try again."
        exit $PSALM_RESULT # Exit if errors and bypass is not enabled
    fi
    echo "✅ Psalm check passed"
fi

echo "🎉 All PHP quality checks completed successfully!"
exit 0
