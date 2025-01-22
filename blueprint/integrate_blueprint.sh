#!/usr/bin/env bash

# This script is used to integrate the php-blueprint into your DDEV project

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VERBOSE=false
IS_DDEV_PROJECT=0
function log() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${NC}$1${NC}"
    fi
}

function warn() {
    echo -e "${YELLOW}$1${NC}"
}

function error() {
    echo -e "${RED}$1${NC}" >&2
    exit 1
}

function success() {
    echo -e "${GREEN}$1${NC}"
}

function check_dependencies() {
    log "Checking dependencies..."
    command -v jq >/dev/null 2>&1 || error "jq is not installed. Please install jq."
    command -v yq >/dev/null 2>&1 || error "yq is not installed. Please install yq."
    command -v volta >/dev/null 2>&1 || error "Volta is not installed. Please install Volta."
    command -v pnpm >/dev/null 2>&1 || error "PNPM is not installed. Please install PNPM."
    success "All dependencies are satisfied."
}

function is_ddev_project() {
    if [ -d ".ddev" ]; then
        echo 1
        return
    fi

    echo 0
}

function update_ddev_files() {
    log "Updating ddev files..."
    cp -r php-blueprint/.ddev/commands/* .ddev/commands
    cp -r php-blueprint/.ddev/php/* .ddev/php
    cp -r php-blueprint/.ddev/web-build/ .ddev/web-build
    success "ddev files updated."
}

function update_ddev_config() {
    log "Updating ddev config..."
    yq '.hooks' php-blueprint/.ddev/config.yaml >hooks.yaml
    yq eval-all 'select(fileIndex == 0) * {"hooks": select(fileIndex == 1)}' .ddev/config.yaml hooks.yaml >.ddev/config_updated.yaml
    mv .ddev/config_updated.yaml .ddev/config.yaml
    rm hooks.yaml

    yq eval '.xdebug_enabled = true' .ddev/config.yaml >.ddev/config_updated.yaml
    mv .ddev/config_updated.yaml .ddev/config.yaml
    success "ddev config updated. Ensure the paths in the config are correct."
}

function copy_files() {
    log "Copying files..."
    cp -r php-blueprint/.github .
    cp -r php-blueprint/.vscode .
    cp -r php-blueprint/tools .
    cp -r php-blueprint/.phpstorm .
    success "Files copied. Verify the copied files and their paths."
}

function update_package_json() {
    log "Updating package.json..."
    if [ ! -f "package.json" ]; then
        cp php-blueprint/package.json .
        cp php-blueprint/pnpm-lock.dist .
        success "package.json and pnpm-lock.dist copied from blueprint."
    else
        log "package.json already exists. Updating scripts..."
        jq -s '.[0].scripts += .[1].scripts | .[0]["devDependencies"] += .[1]["devDependencies"] | .[0]["volta"] += .[1]["volta"]' package.json php-blueprint/package.json >package.json.tmp
        jq '.[0]' package.json.tmp >package.json
        rm package.json.tmp
        success "package.json updated with new scripts and devDependencies."
    fi
    cp php-blueprint/commitlint.config.js .
    success "commitlint.config.js copied."
}

function merge_scripts() {
    local COMPOSER1="$1"
    local COMPOSER2="$2"
    local OUTPUT="$3"

    # Extract the "scripts" nodes from both composer files
    jq '.scripts' "$COMPOSER1" >scripts1.json
    jq '.scripts' "$COMPOSER2" >scripts2.json

    # Initialize merged scripts object
    echo '{}' >merged_scripts.json

    # Dynamically detect all array keys in the "scripts" node
    ARRAY_KEYS=$(jq -r '. | to_entries | map(select(.value | type == "array") | .key) | .[]' scripts1.json scripts2.json)

    # Merge each array key dynamically while preserving order
    for key in $ARRAY_KEYS; do
        jq -s --arg key "$key" '
      # Concatenate arrays from both files (composer1 first, then composer2)
      [
        .[0][$key] + .[1][$key]  # Concatenate arrays (composer1 first, then composer2)
      ] | add | {($key): .}
    ' scripts1.json scripts2.json >temp_key.json

        # Merge the result into the merged_scripts.json
        jq -s '.[0] * .[1]' merged_scripts.json temp_key.json >temp_merged.json
        mv temp_merged.json merged_scripts.json
    done

    # Merge non-array script keys explicitly (no change needed for non-array keys)
    jq -s '
    reduce .[] as $item ({}; . + ($item | to_entries | map(
      if .value | type != "array" then { (.key): .value } else {} end
    ) | add))
  ' scripts1.json scripts2.json >non_array_scripts.json

    # Combine array scripts and non-array scripts
    jq -s '.[0] * .[1]' merged_scripts.json non_array_scripts.json >final_scripts.json

    # Replace the "scripts" node in COMPOSER1 with the merged scripts
    jq --argjson scripts "$(cat final_scripts.json)" \
        '.scripts = $scripts' "$COMPOSER1" >"$OUTPUT"

    # Clean up temporary files
    rm scripts1.json scripts2.json merged_scripts.json non_array_scripts.json temp_key.json final_scripts.json

    mv "$OUTPUT" "$COMPOSER1"
    echo "Merged scripts written to $COMPOSER1"
}

function add_code_quality_tools() {
    log "Adding code quality tools..."
    cp php-blueprint/rector.php php-blueprint/phpstan.neon.dist php-blueprint/ecs.php php-blueprint/psalm.xml .
    cp -r php-blueprint/documentation .
    success "Code quality tools and documentation copied. Check the paths in rector.php and phpstan.neon.dist."

    log "Updating composer.json..."
    merge_scripts composer.json php-blueprint/composer.json composer.json.tmp

    if jq -e '.require' php-blueprint/composer.json >/dev/null; then
        prod_dependencies=$(jq -r '.require | keys[]' php-blueprint/composer.json)
        if [ $IS_DDEV_PROJECT -eq 1 ]; then
            echo "$prod_dependencies" | xargs ddev COMPOSER_MEMORY_LIMIT=-1 composer require
        else
            echo "$prod_dependencies" | xargs COMPOSER_MEMORY_LIMIT=-1 composer require
        fi
    fi

    if jq -e '.["require-dev"]' php-blueprint/composer.json >/dev/null; then
        dev_dependencies=$(jq -r '.["require-dev"] | keys[]' php-blueprint/composer.json)
        if [ $IS_DDEV_PROJECT -eq 1 ]; then
            echo "$dev_dependencies" | xargs ddev COMPOSER_MEMORY_LIMIT=-1 composer require --dev
        else
            echo "$dev_dependencies" | xargs COMPOSER_MEMORY_LIMIT=-1 composer require --dev
        fi
    fi

    success "composer.json updated with new scripts and require-dev dependencies."
}

function update_readme() {
    log "Updating README.md..."
    if [ -f "README.md" ]; then
        # Check if README_SNIPPET.md is already appended
        if grep -q "php-blueprint/README_SNIPPET.md" README.md; then
            warn "README_SNIPPET.md already appended to README.md."
            return
        fi
        cat php-blueprint/README_SNIPPET.md >>README.md
        success "README_SNIPPET.md appended to existing README.md."
    else
        warn "README.md not found. Creating new README.md..."
        cat php-blueprint/README_SNIPPET.md >README.md
        success "New README.md created with README_SNIPPET.md content."
    fi
}

function download_php_blueprint() {
    log "Downloading php-blueprint..."
    curl -sSL https://github.com/TerrorSquad/php-blueprint/archive/refs/heads/main.zip -o php-blueprint.zip
    unzip php-blueprint.zip
    mv php-blueprint-main/blueprint php-blueprint
    rm php-blueprint.zip
    rm -rf php-blueprint-main
    success "php-blueprint downloaded and extracted."
}

function cleanup() {
    log "Cleaning up..."
    rm -rf php-blueprint
    success "Temporary files cleaned up."
}

function update_gitignore() {
    log "Updating .gitignore..."

    if [ ! -f "php-blueprint/.gitignore" ]; then
        error "php-blueprint/.gitignore file not found."
    fi

    while IFS= read -r line; do
        if ! grep -q "^$line" .gitignore && ! grep -q "^/$line" .gitignore; then
            echo "$line" >>.gitignore
        fi
    done <php-blueprint/.gitignore

    success ".gitignore updated."
}

function main() {
    if [ "$1" = "--verbose" ]; then
        VERBOSE=true
    fi

    log "Starting integration..."
    IS_DDEV_PROJECT=$(is_ddev_project)
    check_dependencies
    download_php_blueprint
    if [ $IS_DDEV_PROJECT -eq 1 ]; then
        update_ddev_files
        update_ddev_config
        update_readme
    fi
    copy_files
    update_package_json
    add_code_quality_tools
    update_gitignore
    cleanup
    log "Ensure you are using Volta for Node.js version management and PNPM as the package manager."

    success "Integration completed. Please review the log messages for any important information."

    if [ $IS_DDEV_PROJECT -eq 1 ]; then
        success "Please run 'ddev restart' to apply the changes."
    fi
}

main "$@"
