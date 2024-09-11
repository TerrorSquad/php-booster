#!/usr/bin/env bash
ROOT=$(git rev-parse --show-toplevel)
PROJECT_NAME=$(grep "name: " "$ROOT"/.ddev/config.yaml | head -1 | cut -f 2 -d ' ')
HOSTNAME=$(hostname)

# function that runs a command in the ddev web container or outside of it depending on the hostname
function run() {
  if [ "$HOSTNAME" == "${PROJECT_NAME}-web" ]; then
    "$@"
  else
    ddev exec "$@"
  fi
}

# read the command line arguments and run the command
run "$@"
