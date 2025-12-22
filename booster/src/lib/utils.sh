# --- Dependency Checks ---

function check_dependencies() {
    log "Checking dependencies..."
    local missing_deps=()
    command -v jq >/dev/null 2>&1 || missing_deps+=("jq")
    command -v yq >/dev/null 2>&1 || missing_deps+=("yq") # Still needed for ddev config
    command -v curl >/dev/null 2>&1 || missing_deps+=("curl")
    command -v unzip >/dev/null 2>&1 || missing_deps+=("unzip")

    if [ $IS_DDEV_PROJECT -eq 1 ]; then
        command -v ddev >/dev/null 2>&1 || missing_deps+=("ddev")
    else
        command -v composer >/dev/null 2>&1 || missing_deps+=("composer")
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing dependencies: ${missing_deps[*]}. Please install them."
    fi
    success "All dependencies are satisfied."
}

# --- Project Type Detection ---

function is_ddev_project() {
    if [ -d ".ddev" ]; then
        echo 1
    else
        echo 0
    fi
}

function cleanup_silent() {
    rm -rf "$BOOSTER_TARGET_DIR"
    rm -f composer.json.merged.tmp composer.json.merged.tmp.next hooks.yaml.tmp .ddev/config.yaml.tmp package.json.tmp # Clean up temp files
}

function cleanup() {
    log "Cleaning up temporary files..."
    rm -rf "$BOOSTER_TARGET_DIR"

    rm -f composer.json.merged.tmp composer.json.merged.tmp.next hooks.yaml.tmp .ddev/config.yaml.tmp package.json.tmp
    success "Temporary files cleaned up."
}


