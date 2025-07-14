#!/usr/bin/env bash

# Runner script that executes commands either in a DDEV container or directly on the host
# Automatically detects the environment and routes commands appropriately

set -euo pipefail # Exit on error, undefined variables, and pipe failures

# Get the root directory of the git repository
ROOT_DIR=$(git rev-parse --show-toplevel)

# Check if DDEV is available by testing if .ddev directory exists
# Returns true if DDEV is available, false otherwise
DDEV_AVAILABLE=false
if [ -d "$ROOT_DIR/.ddev" ]; then
  DDEV_AVAILABLE=true
fi

#
# Main execution function that routes commands based on environment
#
function run_command() {
  if [ "$DDEV_AVAILABLE" = false ]; then
    # DDEV not available, run command directly on host
    execute_command_directly "$@"
  else
    # DDEV available, run command in container
    execute_command_in_ddev "$@"
  fi
}

#
# Execute command directly on the host system
#
function execute_command_directly() {
  "$@"
}

#
# Execute command in DDEV container, handling both inside and outside container scenarios
#
function execute_command_in_ddev() {
  local project_name
  local current_hostname

  # Extract project name from DDEV configuration
  project_name=$(grep "name: " "$ROOT_DIR/.ddev/config.yaml" | head -1 | cut -f 2 -d ' ')
  current_hostname=$(hostname)

  # Check if we're already inside the DDEV web container
  if [ "$current_hostname" == "${project_name}-web" ]; then
    # Already inside container, execute directly
    "$@"
  else
    # Outside container, use ddev exec to run command inside
    ddev exec "$@"
  fi
}

# Execute the main function with all command line arguments
run_command "$@"
