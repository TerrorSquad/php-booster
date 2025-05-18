#!/usr/bin/env bash
ROOT=$(git rev-parse --show-toplevel)
IS_DDEV=$(stat -c %d "$ROOT/.ddev" 2>/dev/null || echo 1)

# function that runs a command in the ddev web container or outside of it depending on the hostname
function run() {
  if [ "$IS_DDEV" != 1 ]; then
    run_in_ddev_container "$@"
  else
    "$@"
  fi
}

function run_in_ddev_container() {
  PROJECT_NAME=$(grep "name: " "$ROOT"/.ddev/config.yaml | head -1 | cut -f 2 -d ' ')
  HOSTNAME=$(hostname)
  if [ "$HOSTNAME" == "${PROJECT_NAME}-web" ]; then
    "$@"
  else
    ddev exec "$@"
  fi
}

# read the command line arguments and run the command
run "$@"
