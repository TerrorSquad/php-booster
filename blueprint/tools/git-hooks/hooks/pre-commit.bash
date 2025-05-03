#!/usr/bin/env bash

# Check if MERGE_HEAD exists
if [ -f "$GIT_DIR/MERGE_HEAD" ]; then
    # Skip the hook during a merge
    exit 0
fi

ROOT=$(git rev-parse --show-toplevel)
runner="$ROOT/tools/runner.sh"

# Filter for only .php files (using grep)
STAGED_FILES=$(git diff --diff-filter=ACMR --cached --name-only -- . ":(exclude)vendor/*" ":(exclude)ecs.php" ":(exclude)rector.php" HEAD)
# Check if there are any staged PHP files
if ! echo "$STAGED_FILES" | grep '\.php$'; then
    echo "No staged PHP files found. Skipping checks..."
    exit 0
fi

echo "Checking PHP Lint..."
for FILE in $STAGED_FILES; do
    if ! echo "$FILE" | grep '\.php$'; then
        continue
    fi
    bash "$runner" php -l -d display_errors=0 "$FILE"
    if [ $? != 0 ]; then
        echo "Fix the error before commit."
        exit 1
    fi
    # Add the file to the FILES variable
    FILES="$FILES $FILE"
    # Ensure there are no trailing whitespaces in $FILES
    FILES=$(echo "$FILES" | xargs)
done

if [ "$FILES" != "" ]; then

    if [ -f "$ROOT/vendor/bin/ecs" ]; then
        echo "Pre-hook: Running EasyCodingStandard"
        bash "$runner" ./vendor/bin/ecs check --fix $FILES

        bash "$runner" git add $FILES
    fi

    if [ -f "$ROOT/vendor/bin/rector" ]; then
        echo "Pre-hook: Running Rector"
        bash "$runner" ./vendor/bin/rector process -- $FILES

        bash "$runner" git add $FILES
    fi

    if [ -f "$ROOT/vendor/bin/ecs" ]; then
        echo "Pre-hook: Running EasyCodingStandard"
        bash "$runner" ./vendor/bin/ecs check --fix $FILES

        bash "$runner" git add $FILES
    fi

    if [ -f "$ROOT/vendor/bin/deptrac" ]; then
        echo "Pre-hook: Running deptrac"
        bash "$runner" composer deptrac
        RESULT=$?
        if [ $RESULT -ne 0 ]; then
            echo "Deptrac failed. Please fix the issues before committing."
            exit 1
        fi
        bash "$runner" composer deptrac:image

        bash "$runner" git add $FILES deptrac.png
    fi

    if [ -f "$ROOT/vendor/bin/phpstan" ]; then
        echo "Pre-hook: Running PHPStan"
        bash "$runner" ./vendor/bin/phpstan analyse -c phpstan.neon.dist $FILES

        RESULT_CODE=$?
        if [ $RESULT_CODE != 0 ]; then
            echo "Fix the error(s) before commit."
            exit $RESULT_CODE
        fi

        bash "$runner" git add $FILES
    fi

    if [ -f "$ROOT/vendor/bin/psalm.phar" ]; then
        echo "Pre-hook: Running Psalm Phar"
        bash "$runner" ./vendor/bin/psalm.phar --show-info=false $FILES

        RESULT_CODE=$?
        if [ $RESULT_CODE != 0 ]; then
            echo "Fix the error(s) before commit."
            exit $RESULT_CODE
        fi

        bash "$runner" git add $FILES
    fi

    if [ -f "$ROOT/vendor/bin/psalm" ]; then
        echo "Pre-hook: Running Psalm"
        bash "$runner" ./vendor/bin/psalm --show-info=false $FILES

        RESULT_CODE=$?
        if [ $RESULT_CODE != 0 ]; then
            echo "Fix the error(s) before commit."
            exit $RESULT_CODE
        fi

        bash "$runner" git add $FILES
    fi
fi
exit 0
