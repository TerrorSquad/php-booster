#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

# Source common library
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || PROJECT_ROOT="$(pwd)"
source "$PROJECT_ROOT/tools/git-hooks/lib/common.sh"

# --- Configuration ---
readonly HUSKY_DIR=".husky"
readonly HOOKS_SOURCE="./tools/git-hooks/hooks"
readonly RUNNER_SCRIPT="./tools/runner.sh"

# --- Early Exit Conditions ---
should_skip_installation() {
    if is_ci_environment; then
        log_info "CI environment detected, skipping git hooks installation"
        return 0
    fi
    return 1
}

# --- Dependency Checks ---
check_runner_script() {
    if [ ! -f "$RUNNER_SCRIPT" ]; then
        error_exit "Runner script not found at '$RUNNER_SCRIPT'"
    fi
}

check_pnpm_installed() {
    if ! command -v pnpm >/dev/null 2>&1; then
        show_pnpm_error
        exit 1
    fi
}

show_pnpm_error() {
    cat << EOF
${RED}===================================================================${NC}
${RED}  ERROR: Git Hooks Installation Failed - pnpm Missing              ${NC}
${RED}===================================================================${NC}

${RED}The installation of Git hooks has failed because pnpm is not      ${NC}
${RED}found on your system. pnpm is required to manage the dependencies ${NC}
${RED}for the Git hooks.                                                ${NC}

${RED}To resolve this issue, please install pnpm using one of the following methods:${NC}

${RED}- Official Installer:     https://pnpm.io/installation            ${NC}
${RED}- Using npm:             npm install -g pnpm                      ${NC}
${RED}- Using Homebrew (macOS): brew install pnpm                       ${NC}

${RED}After installing pnpm, rerun 'composer install' to complete the setup.${NC}
${RED}===================================================================${NC}
EOF
}

# --- Installation Functions ---
setup_husky_directory() {
    log_step "Setting up Husky directory..."

    if [ -d "$HUSKY_DIR" ]; then
        log_info "Removing existing $HUSKY_DIR directory..."
        rm -rf "$HUSKY_DIR"
    fi

    mkdir "$HUSKY_DIR"
    log_success "$HUSKY_DIR directory created"
}

copy_hook_files() {
    log_step "Copying hook files from $HOOKS_SOURCE to $HUSKY_DIR..."

    if [ ! -d "$HOOKS_SOURCE" ]; then
        error_exit "Hook source directory '$HOOKS_SOURCE' not found"
    fi

    cp -r "$HOOKS_SOURCE"/* "$HUSKY_DIR/"

    # Make hooks executable
    chmod +x "$HUSKY_DIR"/*

    log_success "Hook files copied and made executable"
}

install_dependencies() {
    log_step "Installing npm dependencies..."

    if ! bash "$RUNNER_SCRIPT" pnpm install; then
        error_exit "Failed to install dependencies with pnpm"
    fi

    log_success "Dependencies installed successfully"
}

# --- Main Execution ---
main() {
    init_common

    if should_skip_installation; then
        exit 0
    fi

    log_step "Installing Git hooks..."

    check_runner_script
    check_pnpm_installed
    setup_husky_directory
    copy_hook_files
    install_dependencies

    log_celebrate "Git hooks installation completed successfully!"
}

main "$@"
