#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

# --- Configuration ---
readonly HUSKY_DIR=".husky"
readonly HOOKS_SOURCE="./tools/git-hooks/hooks"
readonly RUNNER_SCRIPT="./tools/runner.sh"

# --- Environment Setup ---
setup_environment() {
    readonly IS_CI_ENV="${CI:-}"

    # ANSI color codes for output formatting (only if interactive terminal)
    if [[ -t 1 ]]; then
        readonly RED='\033[0;31m'
        readonly GREEN='\033[0;32m'
        readonly NC='\033[0m' # No Color
    else
        readonly RED=''
        readonly GREEN=''
        readonly NC=''
    fi
}

# --- Output Functions ---
echo_color() {
    echo -e "$1"
}

# --- Early Exit Conditions ---
should_skip_in_ci() {
    if [ -n "$IS_CI_ENV" ]; then
        echo "CI environment detected, skipping git hooks installation"
        return 0
    fi
    return 1
}

# --- Dependency Checks ---
check_runner_available() {
    if [ ! -f "$RUNNER_SCRIPT" ]; then
        echo_color "${RED}ERROR: Runner script not found at '$RUNNER_SCRIPT'${NC}" >&2
        exit 1
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
    echo "Setting up Husky directory..."

    if [ -d "$HUSKY_DIR" ]; then
        echo "Removing existing $HUSKY_DIR directory..."
        rm -rf "$HUSKY_DIR"
    fi

    mkdir "$HUSKY_DIR"
    echo "Created $HUSKY_DIR directory"
}

copy_hook_files() {
    echo "Copying hook files from $HOOKS_SOURCE to $HUSKY_DIR..."

    if [ ! -d "$HOOKS_SOURCE" ]; then
        echo_color "${RED}ERROR: Hook source directory '$HOOKS_SOURCE' not found${NC}" >&2
        exit 1
    fi

    cp -r "$HOOKS_SOURCE"/* "$HUSKY_DIR/"

    # Make hooks executable
    chmod +x "$HUSKY_DIR"/*

    echo_color "${GREEN}Hook files copied and made executable${NC}"
}

install_dependencies() {
    echo "Installing npm dependencies..."

    if ! bash "$RUNNER_SCRIPT" pnpm install; then
        echo_color "${RED}ERROR: Failed to install dependencies with pnpm${NC}" >&2
        exit 1
    fi

    echo_color "${GREEN}Dependencies installed successfully${NC}"
}

# --- Main Execution ---
main() {
    setup_environment

    if should_skip_in_ci; then
        exit 0
    fi

    echo "Installing Git hooks..."

    check_runner_available
    check_pnpm_installed
    setup_husky_directory
    copy_hook_files
    install_dependencies

    echo_color "${GREEN}Git hooks installation completed successfully!${NC}"
}

main "$@"
