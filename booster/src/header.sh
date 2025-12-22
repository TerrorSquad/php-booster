#!/usr/bin/env bash

# This script is used to integrate the php-booster into your project (potentially DDEV)

# --- Configuration ---

BOOSTER_REPO_URL="https://github.com/TerrorSquad/php-booster.git"
BOOSTER_TARGET_DIR="php-booster"
BOOSTER_INTERNAL_PATH="${BOOSTER_TARGET_DIR}/booster"

# --- Local Development Mode ---
# Set BOOSTER_LOCAL_DEV=1 to use local booster directory instead of cloning from GitHub
# Set BOOSTER_LOCAL_PATH to specify the local booster directory path (default: ../booster)
BOOSTER_LOCAL_DEV="${BOOSTER_LOCAL_DEV:-0}"
BOOSTER_LOCAL_PATH="${BOOSTER_LOCAL_PATH:-../booster}"

# --- ANSI color codes ---

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color


# --- Script Configuration ---

VERBOSE=false
NO_CLEANUP=false
IS_DDEV_PROJECT=0
INTERACTIVE_MODE=false
SKIP_INTERACTIVE=false

# --- Interactive Mode Configuration ---

INTERACTIVE_INSTALL_TOOLS=true
INTERACTIVE_TOOLS_SELECTED=()
INTERACTIVE_TICKET_PREFIX=""
INTERACTIVE_REQUIRE_TICKETS=false
INTERACTIVE_COMMIT_FOOTER_LABEL="Closes"


# --- Environment Configuration ---

# Set the memory limit for Composer to unlimited (can help with large dependency trees)
export COMPOSER_MEMORY_LIMIT=-1

# Set Symfony recipe auto-acceptance to avoid interactive prompts during composer require/update
# This automatically accepts all recipes from both main and contrib repositories
export SYMFONY_FLEX_RECIPES_AUTO_ACCEPT=1
