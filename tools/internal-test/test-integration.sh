#!/usr/bin/env bash
# Integration test script for PHP Booster
# Creates a new project and integrates the booster to test end-to-end flow

set -euo pipefail
IFS=$'\n\t'

# Configuration
ACTION=${1:-full}        # full, env-check, or any individual function name
PROJECT_TYPE=${2:-symfony}  # symfony, laravel, or custom
PROJECT_NAME=${3:-test-project}
TARGET_DIR="${4:-tests/$PROJECT_TYPE/$PROJECT_NAME}"
# Note: We always use DDEV for PHP in this script

# Print help text
show_help() {
  cat <<EOF
Usage: $0 [ACTION] [PROJECT_TYPE] [PROJECT_NAME] [TARGET_DIR]

Actions:
  full        - Run the full test (default)
  env-check   - Only check the environment and requirements
  setup       - Only set up the project
  Any other function name in the script

Parameters:
  PROJECT_TYPE: symfony, laravel (default: symfony)
  PROJECT_NAME: Name for the project (default: test-project)
  TARGET_DIR: Where to create the project (default: /tmp/php-booster-test)

Examples:
  $0                     # Run full test with defaults
  $0 env-check           # Only check environment
  $0 full laravel my-app # Run full test with Laravel
  $0 setup symfony demo  # Only set up a Symfony project
EOF
}

# Determine script location - works whether script is sourced or executed
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BOOSTER_DIR="$ROOT_DIR/booster"

# Check if we should use colors
USE_COLORS=1
if [ -n "${NO_COLOR:-}" ] || [ -n "${TERM:-}" ] && [ "${TERM:-}" = "dumb" ]; then
  USE_COLORS=0
fi

# Print with or without color based on environment
if [ "$USE_COLORS" -eq 1 ]; then
  info() { printf "\033[0;34m[INFO]\033[0m %s\n" "$*"; }
  success() { printf "\033[0;32m[SUCCESS]\033[0m %s\n" "$*"; }
  warn() { printf "\033[0;33m[WARNING]\033[0m %s\n" "$*"; }
  error() { printf "\033[0;31m[ERROR]\033[0m %s\n" "$*"; }
else
  info() { printf "[INFO] %s\n" "$*"; }
  success() { printf "[SUCCESS] %s\n" "$*"; }
  warn() { printf "[WARNING] %s\n" "$*"; }
  error() { printf "[ERROR] %s\n" "$*"; }
fi

# Confirm tools are available
check_requirements() {
  info "Checking requirements..."

  # Check essential tools (we only need git, ddev, curl on the host)
  for cmd in git curl; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      error "$cmd is not installed or not in PATH. Please install it and try again."
      exit 1
    fi
  done

  # DDEV is required since we'll use it for PHP
  if ! command -v ddev >/dev/null 2>&1; then
    error "DDEV is not installed or not in PATH. Please install it and try again."
    exit 1
  elif ! ddev --version >/dev/null 2>&1; then
    error "DDEV is installed but not working properly."
    exit 1
  else
    info "Using DDEV: $(ddev --version | head -n1)"
  fi

  success "All required tools are available"
}

# Set up project
setup_project() {
  info "Setting up $PROJECT_TYPE project in $TARGET_DIR"

  if [ -d "$TARGET_DIR" ]; then
    cd "$TARGET_DIR"
    ddev stop --unlist "$PROJECT_NAME"
    cd -
  fi

  # Ensure target directory is clean
  if [ -d "$TARGET_DIR" ]; then
    warn "Target directory already exists. Removing..."
    rm -rf "$TARGET_DIR"
  fi

  mkdir -p "$TARGET_DIR"
  cd "$TARGET_DIR"

  # Create project based on type (using DDEV for all PHP operations)
  case "$PROJECT_TYPE" in
    symfony)
      info "Creating new Symfony project using DDEV..."
      set -x
      # Configure DDEV first with correct project type
      ddev config --project-name="$PROJECT_NAME" --project-type=symfony || {
        error "Failed to configure DDEV for Symfony. See errors above."
        exit 1
      }
      ddev start
      # Using create-project directly which works with an empty directory
      ddev composer create-project symfony/website-skeleton . --no-interaction || {
        error "Failed to create Symfony project. See errors above."
        exit 1
      }
      set +x
      ;;
    laravel)
      info "Creating new Laravel project using DDEV..."
      set -x
      # Configure DDEV first with correct project type
      ddev config --project-type=laravel --docroot=public
      ddev start
      ddev composer create-project "laravel/laravel:^12"
      ddev launch
      ddev exec "cp .env.example .env"
      ddev artisan key:generate
      set +x
      ;;
    *)
      # not supported
      error "Project type '$PROJECT_TYPE' is not supported."
      exit 1
  esac

  # Initialize Git repository after creating the project
  info "Initializing git repository..."
  git init
  git config user.name "Test User"
  git config user.email "test@example.com"

  # Commit the framework files
  git add .
  git commit -m "feat: initial commit with $PROJECT_TYPE framework"

  success "Project and DDEV setup complete"
}

# This function is now integrated into setup_project since we always use DDEV
setup_ddev() {
  info "DDEV setup already completed during project creation"
}

# Integrate PHP Booster
integrate_booster() {
  info "Integrating PHP Booster..."

  # Option 1: Use local copy
  # if [ -f "$BOOSTER_DIR/integrate_booster.sh" ]; then
  #   info "Using local booster integration script"
  #   cp -f "$BOOSTER_DIR/integrate_booster.sh" ./integrate_local.sh
  #   chmod +x ./integrate_local.sh

  #   info "Running integration script inside DDEV..."
  #   set -x
  #   # Create a modified version of the script that won't try to run ddev commands
  #   cp -f ./integrate_local.sh ./integrate_local_container.sh
  #   # Modify the script to not run ddev commands when inside a container
  #   sed -i.bak 's/ddev start/echo "You executed '\''ddev start'\'' inside the web container"/g' ./integrate_local_container.sh
  #   sed -i.bak 's/ddev restart/echo "You executed '\''ddev restart'\'' inside the web container"/g' ./integrate_local_container.sh
  #   chmod +x ./integrate_local_container.sh

  #   # Run the modified integration script inside DDEV
  #   ddev exec ./integrate_local_container.sh || {
  #     error "Local integration script failed with exit code $?. See errors above."
  #     exit 1
  #   }
  #   set +x
  # else
    # Option 2: Use curl approach (more realistic test)
    info "Using remote integration via curl"
    info "Fetching from: https://raw.githubusercontent.com/TerrorSquad/php-blueprint/main/booster/integrate_booster.sh"

    set -x
    curl -sfL https://raw.githubusercontent.com/TerrorSquad/php-blueprint/main/booster/integrate_booster.sh | bash
    set +x
  # fi

  success "Booster integration complete"
}

# Verify installation
verify_integration() {
  info "Verifying integration..."

  # Check for expected files
  local expected_files=(
    "tools/commit-utils.js"
    "tools/git-hooks/hooks/commit-msg"
    "validate-branch-name.config.cjs"
    "tools/runner.sh"
  )

  local all_present=true
  for file in "${expected_files[@]}"; do
    if [ ! -f "$file" ]; then
      warn "Missing expected file: $file"
      all_present=false
    fi
  done

  if [ "$all_present" = "false" ]; then
    error "Some expected files are missing. Integration may be incomplete."
    exit 1
  fi

  # Check for composer scripts (always use DDEV now)
  info "Checking composer packages and tools..."
  ddev composer show

  # Try running the ECS tool with DDEV
  if ddev composer ecs --version >/dev/null 2>&1; then
    success "ECS is working through DDEV"
  else
    error "ECS command not working through DDEV"
    exit 1
  fi

  # Check PHP version in DDEV
  info "PHP version in DDEV:"
  ddev exec php -v

  if [ "$all_present" = "true" ]; then
    success "Integration verification passed!"
  else
    error "Some expected files are missing. Integration may be incomplete."
    exit 1
  fi
}

# Test branch validation
test_branch_validation() {
  info "Testing branch validation..."

  # Create a valid branch
  git checkout -b feature/PRJ-123-test-feature
  echo "<?php\n// Test commit" > test_commit.php
  git add test_commit.php

  if git commit -m "feat: add test feature"; then
    success "Valid branch + commit message accepted"
    git log -1 --pretty=full

    # Check if ticket footer was appended
    if git log -1 --pretty=%B | grep -q "Closes: PRJ-123"; then
      success "Ticket footer correctly appended"
    else
      error "Ticket footer not appended to commit message"
    exit 1
    fi
  else
    error "Commit on valid branch failed"
    exit 1
  fi

  # Try an invalid branch
  git checkout -b invalid-branch-format
  echo "<?php\n// Another test" > test_commit2.php
  git add test_commit2.php

  if ! git commit -m "add another test" 2>/dev/null; then
    success "Invalid branch correctly rejected"
  else
    error "Invalid branch incorrectly accepted"
    exit 1
  fi
}

# Check environment
check_environment() {
  info "Environment information:"
  echo "  - OS: $(uname -s)"
  echo "  - Distribution: $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 || echo 'Unknown')"
  echo "  - Shell: $SHELL"
  echo "  - User: $(whoami)"
  echo "  - Working directory: $(pwd)"
  echo "  - PATH: $PATH"
}

# Main execution
main() {
  check_environment
  check_requirements
  setup_project

  integrate_booster
  verify_integration
  test_branch_validation

  success "Test completed successfully! Project is available at: $TARGET_DIR"
  info "To clean up, run: rm -rf $TARGET_DIR"
  info "To stop DDEV: cd $TARGET_DIR && ddev stop"
}

# Handle different actions
case "$ACTION" in
  help|--help|-h)
    show_help
    exit 0
    ;;
  env-check)
    check_environment
    check_requirements
    exit 0
    ;;
  setup)
    check_environment
    check_requirements
    setup_project
    exit 0
    ;;
  full|all)
    main
    ;;
  *)
    # Check if the action is a valid function name
    if declare -f "$ACTION" > /dev/null; then
      check_environment
      check_requirements
      # Call the function directly
      "$ACTION"
      exit 0
    else
      error "Unknown action: $ACTION"
      show_help
      exit 1
    fi
    ;;
esac
