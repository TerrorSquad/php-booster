#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

ROOT=$(git rev-parse --show-toplevel)
if [ -f "$ROOT/booster/tools/runner.sh" ]; then
    BASE="$ROOT/booster"
else
    BASE="$ROOT"
fi
GIT_DIR=$(git rev-parse --git-dir)
runner="$BASE/tools/runner.sh"

# Check if MERGE_HEAD exists
if [ -f "$GIT_DIR/MERGE_HEAD" ]; then
    # Skip the hook during a merge
    exit 0
fi

composer_show_cache=""; composer_show_tmp=""

cache_composer_show() {
    if [ -z "$composer_show_cache" ]; then
        composer_show_tmp=$(mktemp)
        if bash "$runner" composer show >"$composer_show_tmp" 2>/dev/null; then
            composer_show_cache="$composer_show_tmp"
        else
            rm -f "$composer_show_tmp" || true
            composer_show_cache="/dev/null"
        fi
    fi
}

has_pkg() {
    cache_composer_show
    grep -q "$1" "$composer_show_cache" 2>/dev/null || return 1
}

run_tests() {
    local test_tool=$1
    local test_command=$2
    if has_pkg "$test_tool"; then
        echo "Running $test_tool tests..."
        if ! bash "$runner" composer "$test_command"; then
            echo "Tests failed (tool: $test_tool)." >&2
            exit 1
        fi
    else
        echo "$test_tool not installed -> skipping."
    fi
}

generate_api_docs() {
    if ! has_pkg "zircote/swagger-php"; then
        echo "swagger-php not installed -> skipping API docs."; return 0; fi
    if ! bash "$runner" composer generate-api-spec; then
        echo "API spec generation failed." >&2; exit 1; fi
    if git diff --name-only | grep -q '^documentation/openapi.yml$'; then
        bash "$runner" pnpm generate:api-doc:html || { echo "HTML doc generation failed." >&2; exit 1; }
        git add documentation/openapi.html documentation/openapi.yml 2>/dev/null || true
        if ! git diff --cached --quiet; then
            git commit -m "chore: update API documentation" || true
        fi
    fi
}

if [ -f "$BASE/vendor/bin/deptrac" ]; then
    echo "Running deptrac..."
    if ! bash "$runner" composer deptrac; then
        echo "Deptrac failed." >&2; exit 1; fi
    bash "$runner" composer deptrac:image || true
    [ -f deptrac.png ] && git add deptrac.png || true
fi

# Run Pest or PHPUnit tests
#run_tests "pestphp/pest" "test:coverage:pest"
run_tests "phpunit/phpunit" "test:coverage:phpunit"

# Generate API documentation if necessary
generate_api_docs

[ -n "$composer_show_tmp" ] && [ -f "$composer_show_tmp" ] && rm -f "$composer_show_tmp" || true
