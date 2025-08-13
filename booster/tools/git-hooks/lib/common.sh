#!/usr/bin/env bash

# Git Hooks Common Library
# Shared functionality for all git hooks

# Strict mode (should be set by calling script)
set -euo pipefail
IFS=$'\n\t'

# --- Global Variables ---
readonly SCRIPT_NAME="${0##*/}"

# --- Color and Logging Setup ---
setup_colors() {
    # ANSI color codes for output formatting (only if interactive terminal)
    if [[ -t 1 ]] && [[ "${TERM:-}" != "dumb" ]]; then
        readonly RED='\033[0;31m'
        readonly GREEN='\033[0;32m'
        readonly YELLOW='\033[1;33m'
        readonly BLUE='\033[0;34m'
        readonly CYAN='\033[0;36m'
        readonly NC='\033[0m' # No Color
    else
        readonly RED=''
        readonly GREEN=''
        readonly YELLOW=''
        readonly BLUE=''
        readonly CYAN=''
        readonly NC=''
    fi
}

# --- Logging Functions ---
log_info() {
    echo -e "${CYAN}ℹ️  $*${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $*${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $*${NC}"
}

log_error() {
    echo -e "${RED}❌ $*${NC}" >&2
}

log_step() {
    echo -e "${BLUE}📋 $*${NC}"
}

log_tool() {
    local tool="$1"
    shift
    echo -e "${CYAN}🔧 Running $tool: $*${NC}"
}

log_check() {
    local tool="$1"
    shift
    echo -e "${BLUE}🔍 Checking $tool: $*${NC}"
}

log_skip() {
    echo -e "${YELLOW}🚫 $*${NC}"
}

log_celebrate() {
    echo -e "${GREEN}🎉 $*${NC}"
}

# --- Environment Setup ---
setup_git_environment() {
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
    
    # Export for use in other functions
    export ROOT BASE GIT_DIR RUNNER
}

setup_branch_info() {
    if ! CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null); then
        CURRENT_BRANCH="HEAD"
    fi
    readonly CURRENT_BRANCH
    export CURRENT_BRANCH
}

setup_common_paths() {
    readonly UTIL_SCRIPT="./tools/commit-utils.py"
    export UTIL_SCRIPT
}

# --- Early Exit Conditions ---
is_ci_environment() {
    [ -n "${CI:-}" ]
}

is_merge_in_progress() {
    [ -f "$GIT_DIR/MERGE_HEAD" ]
}

should_skip_in_ci() {
    if is_ci_environment; then
        log_info "CI environment detected, skipping $SCRIPT_NAME"
        return 0
    fi
    return 1
}

should_skip_during_merge() {
    if is_merge_in_progress; then
        log_info "Merge in progress. Skipping $SCRIPT_NAME"
        return 0
    fi
    return 1
}

# --- Dependency Checks ---
check_runner_available() {
    if [ ! -f "$RUNNER" ]; then
        log_error "Runner script not found at '$RUNNER'"
        exit 1
    fi
}

check_node_modules() {
    if [ ! -d "$BASE/node_modules" ]; then
        local install_cmd
        if [ -d "$ROOT/.ddev" ]; then
            install_cmd="ddev pnpm install"
        else
            install_cmd="pnpm install"
        fi
        log_error "No node_modules directory detected. Please run '$install_cmd' before proceeding."
        exit 1
    fi
}

check_vendor_directory() {
    if [ ! -d "$BASE/vendor/bin" ]; then
        local install_cmd="composer install"
        if [ -d "$ROOT/.ddev" ]; then
            install_cmd="ddev composer install"
        fi
        log_error "No vendor/bin directory detected. Please run '$install_cmd' before proceeding."
        exit 1
    fi
}

check_file_exists() {
    local file="$1"
    local description="${2:-file}"
    
    if [ ! -f "$file" ]; then
        log_error "Missing $description: $file"
        exit 1
    fi
}

# --- Command Execution ---
run_command() {
    local description="$1"
    shift
    
    log_tool "$description" "$@"
    if ! bash "$RUNNER" "$@"; then
        log_error "$description failed"
        return 1
    fi
    log_success "$description completed"
}

run_command_quiet() {
    bash "$RUNNER" "$@" >/dev/null 2>&1
}

# --- File Operations ---
has_staged_files() {
    [ -n "$(git diff --diff-filter=ACMR --cached --name-only -- . ":(exclude)vendor/*" HEAD)" ]
}

get_staged_php_files() {
    local staged_files php_files=""
    staged_files=$(git diff --diff-filter=ACMR --cached --name-only -- . ":(exclude)vendor/*" HEAD)
    
    for file in $staged_files; do
        if [[ "$file" =~ \.php$ ]]; then
            php_files="$php_files $file"
        fi
    done
    
    # Trim whitespace
    echo "$php_files" | xargs
}

# --- Package Detection ---
setup_composer_cache() {
    if [ -z "${composer_show_cache:-}" ]; then
        composer_show_tmp=$(mktemp)
        if bash "$RUNNER" composer show >"$composer_show_tmp" 2>/dev/null; then
            composer_show_cache="$composer_show_tmp"
        else
            rm -f "$composer_show_tmp" || true
            composer_show_cache="/dev/null"
        fi
        export composer_show_cache composer_show_tmp
    fi
}

has_composer_package() {
    setup_composer_cache
    grep -q "$1" "${composer_show_cache:-/dev/null}" 2>/dev/null || return 1
}

cleanup_composer_cache() {
    [ -n "${composer_show_tmp:-}" ] && [ -f "${composer_show_tmp:-}" ] && rm -f "$composer_show_tmp" || true
}

# --- Tool Detection ---
has_tool() {
    local tool="$1"
    [ -f "$BASE/vendor/bin/$tool" ]
}

# --- Error Handling ---
error_exit() {
    log_error "$*"
    exit 1
}

# --- Initialization ---
init_common() {
    setup_colors
    setup_git_environment
    setup_branch_info
    setup_common_paths
}

# Cleanup on exit
cleanup_on_exit() {
    cleanup_composer_cache
}

trap cleanup_on_exit EXIT
