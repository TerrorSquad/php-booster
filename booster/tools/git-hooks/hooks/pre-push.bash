#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

# --- Environment Setup ---
setup_environment() {
    ROOT=$(git rev-parse --show-toplevel)
    if [ -f "$ROOT/booster/tools/runner.sh" ]; then
        BASE="$ROOT/booster"
    else
        BASE="$ROOT"
    fi
    readonly ROOT BASE
    
    local git_dir
    git_dir=$(git rev-parse --git-dir)
    readonly GIT_DIR="$git_dir"
    readonly RUNNER="$BASE/tools/runner.sh"
}

# --- Early Exit Conditions ---
should_skip_hook() {
    # Skip during merge
    if [ -f "$GIT_DIR/MERGE_HEAD" ]; then
        echo "Merge in progress. Skipping pre-push checks."
        return 0
    fi
    
    return 1
}

check_dependencies() {
    if [ ! -d "$BASE/vendor/bin" ]; then
        local install_cmd="composer install"
        if [ -d "$ROOT/.ddev" ]; then
            install_cmd="ddev composer install"
        fi
        echo "ERROR: No vendor/bin directory detected. Please run '$install_cmd' before pushing." >&2
        exit 1
    fi
}

# --- Utility Functions ---
cache_composer_show() {
    if [ -z "${composer_show_cache:-}" ]; then
        composer_show_tmp=$(mktemp)
        if bash "$RUNNER" composer show >"$composer_show_tmp" 2>/dev/null; then
            composer_show_cache="$composer_show_tmp"
        else
            rm -f "$composer_show_tmp" || true
            composer_show_cache="/dev/null"
        fi
    fi
}

has_package() {
    cache_composer_show
    grep -q "$1" "${composer_show_cache:-/dev/null}" 2>/dev/null || return 1
}

cleanup_temp_files() {
    [ -n "${composer_show_tmp:-}" ] && [ -f "${composer_show_tmp:-}" ] && rm -f "$composer_show_tmp" || true
}

# --- Test Functions ---
run_tests() {
    local test_tool="$1"
    local test_command="$2"
    
    if has_package "$test_tool"; then
        echo "Running $test_tool tests..."
        if ! bash "$RUNNER" composer "$test_command"; then
            echo "Tests failed (tool: $test_tool)." >&2
            exit 1
        fi
    else
        echo "$test_tool not installed -> skipping."
    fi
}

run_deptrac() {
    if [ ! -f "$BASE/vendor/bin/deptrac" ]; then
        return 0
    fi
    
    echo "Running deptrac..."
    if ! bash "$RUNNER" composer deptrac; then
        echo "Deptrac failed." >&2
        exit 1
    fi
    
    # Generate image if possible
    bash "$RUNNER" composer deptrac:image || true
    [ -f deptrac.png ] && git add deptrac.png || true
}

generate_api_docs() {
    if ! has_package "zircote/swagger-php"; then
        echo "swagger-php not installed -> skipping API docs."
        return 0
    fi
    
    if ! bash "$RUNNER" composer generate-api-spec; then
        echo "API spec generation failed." >&2
        exit 1
    fi
    
    if git diff --name-only | grep -q '^documentation/openapi.yml$'; then
        bash "$RUNNER" pnpm generate:api-doc:html || {
            echo "HTML doc generation failed." >&2
            exit 1
        }
        git add documentation/openapi.html documentation/openapi.yml 2>/dev/null || true
        if ! git diff --cached --quiet; then
            git commit -m "chore: update API documentation" || true
        fi
    fi
}

# --- Main Execution ---
main() {
    setup_environment
    
    if should_skip_hook; then
        exit 0
    fi
    
    check_dependencies
    
    # Architecture validation
    run_deptrac
    
    # Run tests
    run_tests "phpunit/phpunit" "test:coverage:phpunit"
    
    # Generate API documentation if necessary
    generate_api_docs
    
    # Cleanup
    cleanup_temp_files
}

main "$@"
