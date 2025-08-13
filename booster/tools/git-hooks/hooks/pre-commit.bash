#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

# Source common library
PROJECT_ROOT="$(git rev-parse --show-toplevel)"
source "$PROJECT_ROOT/tools/git-hooks/lib/common.sh"

# --- Early Exit Conditions ---
should_skip_checks() {
    if [ "${BYPASS_PHP_ANALYSIS:-0}" == "1" ]; then
        log_skip "BYPASS_PHP_ANALYSIS is set. Skipping code quality checks."
        return 0
    fi
    
    if should_skip_during_merge; then
        return 0
    fi
    
    return 1
}

# --- PHP Quality Checks ---
run_php_syntax_check() {
    local php_files="$1"
    
    log_check "PHP syntax" "Linting PHP files..."
    for file in $php_files; do
        if ! run_command_quiet php -l -d display_errors=0 "$file"; then
            log_error "PHP syntax error in: $file"
            log_info "Fix the syntax error and try again."
            exit 1
        fi
    done
    log_success "PHP syntax check passed"
}

run_rector_fix() {
    local php_files="$1"
    
    if ! has_tool "rector"; then
        return 0
    fi
    
    log_tool "Rector" "Running auto-fix..."
    run_command "Rector" "./vendor/bin/rector" process -- $php_files
    bash "$RUNNER" git add $php_files
    log_success "Rector completed. Files re-added to staging."
}

run_ecs_fix() {
    local php_files="$1"
    
    if ! has_tool "ecs"; then
        return 0
    fi
    
    log_tool "ECS" "Running coding standards check and fix..."
    run_command "ECS" "./vendor/bin/ecs" check --fix $php_files
    bash "$RUNNER" git add $php_files
    log_success "ECS completed. Files re-added to staging."
}

run_deptrac_check() {
    if ! has_tool "deptrac"; then
        return 0
    fi
    
    log_tool "Deptrac" "Running architecture analysis..."
    if ! run_command "Deptrac" composer deptrac; then
        log_error "Deptrac found architectural violations"
        log_info "Fix the reported architectural issues and try again."
        exit 1
    fi
    
    # Optional: Generate and add deptrac image if configured
    bash "$RUNNER" composer deptrac:image || true
    bash "$RUNNER" git add deptrac.png 2>/dev/null || true
    log_success "Deptrac check passed"
}

run_phpstan_analysis() {
    local php_files="$1"
    
    if ! has_tool "phpstan"; then
        return 0
    fi
    
    log_tool "PHPStan" "Running static analysis..."
    if ! run_command "PHPStan" "vendor/bin/phpstan" analyse -c phpstan.neon.dist $php_files; then
        log_error "PHPStan found issues"
        log_info "Fix the reported issues and try again."
        exit 1
    fi
    log_success "PHPStan check passed"
}

run_psalm_analysis() {
    local php_files="$1"
    
    # Check for psalm first, then psalm.phar
    local psalm_bin="vendor/bin/psalm"
    if [ ! -f "./$psalm_bin" ]; then
        psalm_bin="vendor/bin/psalm.phar"
    fi
    
    if [ ! -f "./$psalm_bin" ]; then
        return 0
    fi
    
    log_tool "Psalm" "Running static analysis..."
    if ! run_command "Psalm" "$psalm_bin" --show-info=false $php_files; then
        log_error "Psalm found issues"
        log_info "Fix the reported issues and try again."
        exit 1
    fi
    log_success "Psalm check passed"
}

# --- Main Execution ---
main() {
    init_common
    
    if should_skip_checks; then
        exit 0
    fi
    
    local php_files
    php_files=$(get_staged_php_files)
    
    if [ -z "$php_files" ]; then
        log_info "No staged PHP files found. Skipping PHP checks..."
        exit 0
    fi
    
    log_step "Running PHP Checks on Staged Files"
    
    # Run checks in the correct order
    run_php_syntax_check "$php_files"
    run_rector_fix "$php_files"       # Run FIRST among modifiers
    run_ecs_fix "$php_files"          # Run SECOND among modifiers
    run_deptrac_check
    run_phpstan_analysis "$php_files"
    run_psalm_analysis "$php_files"
    
    log_celebrate "All PHP quality checks completed successfully!"
}

main "$@"
