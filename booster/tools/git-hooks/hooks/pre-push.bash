#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

# Source common library
PROJECT_ROOT="$(git rev-parse --show-toplevel)"
source "$PROJECT_ROOT/tools/git-hooks/lib/common.sh"

# --- Early Exit Conditions ---
should_skip_push_checks() {
    if should_skip_during_merge; then
        return 0
    fi
    return 1
}

check_push_dependencies() {
    check_vendor_directory
}

# --- Early Exit Conditions ---
should_skip_push_checks() {
    if should_skip_during_merge; then
        return 0
    fi
    return 1
}

check_push_dependencies() {
    check_vendor_directory
}

# --- Utility Functions ---
# Composer cache is already handled by common.sh

# --- Test Functions ---
run_tests() {
    local test_tool="$1"
    local test_command="$2"
    
    if has_composer_package "$test_tool"; then
        log_tool "Testing" "Running $test_tool tests..."
        if ! run_command "$test_tool tests" composer "$test_command"; then
            error_exit "Tests failed (tool: $test_tool)."
        fi
    else
        log_info "$test_tool not installed -> skipping."
    fi
}

run_deptrac() {
    if ! has_tool "deptrac"; then
        return 0
    fi
    
    log_tool "Deptrac" "Running architecture analysis..."
    if ! run_command "Deptrac" composer deptrac; then
        error_exit "Deptrac failed."
    fi
    
    # Generate image if possible
    bash "$RUNNER" composer deptrac:image || true
    [ -f deptrac.png ] && git add deptrac.png || true
}

generate_api_docs() {
    if ! has_composer_package "zircote/swagger-php"; then
        log_info "swagger-php not installed -> skipping API docs."
        return 0
    fi
    
    log_tool "API Documentation" "Generating OpenAPI specification..."
    if ! run_command "API spec generation" composer generate-api-spec; then
        error_exit "API spec generation failed."
    fi
    
    if git diff --name-only | grep -q '^documentation/openapi.yml$'; then
        log_tool "API Documentation" "Generating HTML documentation..."
        if ! bash "$RUNNER" pnpm generate:api-doc:html; then
            error_exit "HTML doc generation failed."
        fi
        git add documentation/openapi.html documentation/openapi.yml 2>/dev/null || true
        if ! git diff --cached --quiet; then
            git commit -m "chore: update API documentation" || true
        fi
    fi
}

# --- Main Execution ---
main() {
    init_common
    
    if should_skip_push_checks; then
        exit 0
    fi
    
    check_push_dependencies
    
    # Architecture validation
    run_deptrac
    
    # Run tests
    run_tests "phpunit/phpunit" "test:coverage:phpunit"
    
    # Generate API documentation if necessary
    generate_api_docs
}

main "$@"
