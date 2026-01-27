# Display help information
function show_help() {
    echo "PHP Booster Integration Script"
    echo ""
    echo "USAGE:"
    echo "  $0 [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  -I          Run in interactive mode (recommended for first-time setup)"
    echo "  -N          Non-interactive mode (skip all prompts, use defaults)"
    echo "  -J          JavaScript/TypeScript only mode (hooks only, no PHP tools)"
    echo "  -v          Enable verbose logging"
    echo "  -c          Skip cleanup (preserve temporary files for debugging)"
    echo "  -i          Show version information and exit"
    echo "  -h          Show this help message and exit"
    echo ""
    echo "PARTIAL UPDATE OPTIONS (for existing installations):"
    echo "  --update-hooks    Update only Git hooks (.husky directory)"
    echo "  --update-configs  Update only config files (commitlint, validate-branch-name, etc.)"
    echo "  --update-deps     Update only dependencies (composer/npm packages)"
    echo ""
    echo "DESCRIPTION:"
    echo "  Integrates PHP Booster tooling into an existing PHP project."
    echo "  Supports both standard PHP projects and DDEV environments."
    echo "  Use -J flag for JavaScript/TypeScript projects without PHP."
    echo ""
    echo "  For existing installations, use partial update flags to refresh"
    echo "  specific components without a full reinstall."
    echo ""
    echo "EXAMPLES:"
    echo "  $0              # Run integration with default settings"
    echo "  $0 -I           # Run in interactive mode (guided setup)"
    echo "  $0 -J           # Install hooks only (for JS/TS projects)"
    echo "  $0 -v           # Run with verbose output"
    echo "  $0 -i           # Show version information"
    echo "  $0 --update-hooks    # Update Git hooks only"
    echo "  $0 --update-configs  # Update config files only"
    echo ""
    echo "ENVIRONMENT VARIABLES:"
    echo "  BOOSTER_LOCAL_DEV=1     # Use local booster directory instead of GitHub"
    echo "  BOOSTER_LOCAL_PATH      # Path to local booster (default: ../booster)"
}

# Show version information and exit
function show_version_info_and_exit() {
    echo "PHP Booster Integration Script"
    echo ""

    # Try to get installed version first
    local installed_version
    installed_version=$(get_installed_version)

    if [ -n "$installed_version" ]; then
        echo "Installed version: $installed_version"
        if [ -f ".booster-version" ]; then
            echo "Installation details:"
            grep -E "^(INSTALLED_DATE|INTEGRATION_METHOD)=" ".booster-version" 2>/dev/null | sed 's/^/  /' || true
        fi
    else
        echo "No booster installation detected in current directory"
    fi

    echo ""
    # Try to get available version, but handle errors gracefully
    local available_version
    available_version=$(get_booster_version 2>/dev/null || echo "unknown")
    if [ "$available_version" = "unknown" ]; then
        echo "Available version: unknown (booster not downloaded yet)"
        echo "Run without -i to integrate and see available version"
    else
        echo "Available version (will be installed): $available_version"
    fi
    echo ""
    echo "To integrate or upgrade, run: $0"
    exit 0
}

# --- Main Execution ---

# Partial update mode flags
UPDATE_HOOKS_ONLY=false
UPDATE_CONFIGS_ONLY=false
UPDATE_DEPS_ONLY=false

# --- Partial Update Functions ---

function update_hooks_only() {
    log "Starting partial update: Git hooks only..."
    
    download_php_booster
    
    local husky_src="${BOOSTER_INTERNAL_PATH}/.husky"
    if [ -d "$husky_src" ]; then
        log "Updating .husky directory..."
        
        # Backup existing husky if it exists
        if [ -d ".husky" ]; then
            rm -rf ".husky.bak"
            mv ".husky" ".husky.bak"
            log "  Backed up existing .husky to .husky.bak"
        fi
        
        mkdir -p .husky
        
        # Copy everything except the 'tests' directory
        for item in "$husky_src"/*; do
            local item_name=$(basename "$item")
            if [ "$item_name" != "tests" ]; then
                cp -R "$item" .husky/
            fi
        done
        
        # Set execute permissions for scripts and hooks
        find ".husky" -type f \( -name "*.sh" -o -name "*.bash" -o -name "*.mjs" -o -name "pre-commit" -o -name "commit-msg" -o -name "pre-push" \) -exec chmod +x {} \;
        
        # Remove backup on success
        rm -rf ".husky.bak"
        
        success "Git hooks updated successfully."
    else
        error "Could not find .husky directory in booster."
    fi
}

function update_configs_only() {
    log "Starting partial update: Config files only..."
    
    download_php_booster
    
    local updated_count=0
    
    # Config files to update (always overwrite)
    local config_files=(
        "commitlint.config.ts"
        "validate-branch-name.config.cjs"
        "renovate.json"
    )
    
    for config in "${config_files[@]}"; do
        local src="${BOOSTER_INTERNAL_PATH}/${config}"
        if [ -f "$src" ]; then
            cp "$src" . || warn "Failed to copy $config"
            log "  Updated $config"
            ((updated_count++))
        else
            log "  $config not found in booster, skipping."
        fi
    done
    
    # Update .editorconfig
    local editorconfig_src="${BOOSTER_INTERNAL_PATH}/.editorconfig"
    if [ -f "$editorconfig_src" ]; then
        cp "$editorconfig_src" . || warn "Failed to copy .editorconfig"
        log "  Updated .editorconfig"
        ((updated_count++))
    fi
    
    # PHP-specific configs (only if not hooks-only mode and files exist)
    if [ "$HOOKS_ONLY_MODE" != true ] && [ -f "composer.json" ]; then
        local php_configs=("ecs.php" "rector.php" "phpstan.neon.dist" "psalm.xml" "deptrac.yaml" "sonar-project.properties")
        for config in "${php_configs[@]}"; do
            local src="${BOOSTER_INTERNAL_PATH}/${config}"
            if [ -f "$src" ]; then
                cp "$src" . || warn "Failed to copy $config"
                log "  Updated $config"
                ((updated_count++))
            fi
        done
    fi
    
    success "Config files updated ($updated_count files)."
}

function update_deps_only() {
    log "Starting partial update: Dependencies only..."
    
    download_php_booster
    
    IS_DDEV_PROJECT=$(is_ddev_project)
    
    # Update node dependencies
    log "Updating Node.js dependencies..."
    install_node_dependencies
    
    # Update PHP dependencies (only if not hooks-only mode)
    if [ "$HOOKS_ONLY_MODE" != true ] && [ -f "composer.json" ]; then
        log "Updating PHP dependencies..."
        add_code_quality_tools
    fi
    
    success "Dependencies updated."
}

function main() {
    # Parse long options first (before getopts)
    local args=()
    for arg in "$@"; do
        case $arg in
            --update-hooks)
                UPDATE_HOOKS_ONLY=true
                ;;
            --update-configs)
                UPDATE_CONFIGS_ONLY=true
                ;;
            --update-deps)
                UPDATE_DEPS_ONLY=true
                ;;
            *)
                args+=("$arg")
                ;;
        esac
    done
    set -- "${args[@]}"
    
    # Process command line arguments
    while getopts ":vchiINJ" opt; do
        case $opt in
        v) VERBOSE=true ;;
        c) NO_CLEANUP=true ;;
        h) show_help; exit 0 ;;
        i) show_version_info_and_exit ;;
        I) INTERACTIVE_MODE=true ;;
        N) SKIP_INTERACTIVE=true ;;
        J) HOOKS_ONLY_MODE=true ;;
        \?) error "Invalid option: -$OPTARG. Use -h for help." ;;
        :) error "Option -$OPTARG requires an argument." ;;
        esac
    done
    shift $((OPTIND - 1))

    # --- Handle Partial Update Modes ---
    if [ "$UPDATE_HOOKS_ONLY" = true ] || [ "$UPDATE_CONFIGS_ONLY" = true ] || [ "$UPDATE_DEPS_ONLY" = true ]; then
        log "Running in partial update mode..."
        
        # Check for existing booster installation
        if [ ! -f ".booster-version" ] && [ ! -d ".husky" ]; then
            warn "No existing booster installation detected. Running partial update anyway..."
        fi
        
        check_dependencies
        
        if [ "$UPDATE_HOOKS_ONLY" = true ]; then
            update_hooks_only
        fi
        
        if [ "$UPDATE_CONFIGS_ONLY" = true ]; then
            update_configs_only
        fi
        
        if [ "$UPDATE_DEPS_ONLY" = true ]; then
            update_deps_only
        fi
        
        # Update version stamp with partial update info
        local current_version
        current_version=$(get_booster_version 2>/dev/null || echo "unknown")
        if [ "$current_version" != "unknown" ]; then
            create_version_stamp "$current_version" "partial-update"
        fi
        
        success "Partial update completed."
        exit 0
    fi

    # --- Full Installation Mode ---

    # Determine installation mode
    if [ "$HOOKS_ONLY_MODE" = true ]; then
        log "Starting php-booster integration (hooks-only mode for JS/TS projects)..."
    else
        log "Starting php-booster integration..."
    fi

    IS_DDEV_PROJECT=$(is_ddev_project)

    # Auto-detect hooks-only mode if no composer.json and not explicitly set
    if [ ! -f "composer.json" ] && [ "$HOOKS_ONLY_MODE" != true ] && [ "$INTERACTIVE_MODE" != true ]; then
        info "No composer.json found. Assuming JavaScript/TypeScript project."
        info "Use -J flag explicitly or -I for interactive mode to customize."
        HOOKS_ONLY_MODE=true
    fi

    if [ "$HOOKS_ONLY_MODE" = true ]; then
        log "Hooks-only mode: PHP tools will be skipped."
    elif [ $IS_DDEV_PROJECT -eq 1 ]; then
        log "DDEV project detected."
    else
        log "Standard PHP project detected (no .ddev directory found)."
    fi

    if [ ! -f "composer.json" ] && [ ! -d ".git" ] && [ "$HOOKS_ONLY_MODE" != true ]; then
        warn "Script might not be running from the project root (composer.json or .git not found). Results may be unexpected."
    fi

    check_dependencies
    download_php_booster

    # --- Version Management ---
    local current_version
    current_version=$(get_booster_version)
    show_version_info "$current_version"

    # --- Interactive Mode ---
    if [ "$INTERACTIVE_MODE" = true ] && [ "$SKIP_INTERACTIVE" = false ]; then
        run_interactive_mode
    fi

    copy_files
    update_package_json
    update_readme
    update_gitignore

    # Skip PHP-specific steps in hooks-only mode
    if [ "$HOOKS_ONLY_MODE" != true ]; then
        update_tool_paths

        # Apply interactive configuration if mode was enabled
        if [ "$INTERACTIVE_MODE" = true ]; then
            apply_interactive_configuration
        fi

        if [ $IS_DDEV_PROJECT -eq 1 ]; then
            log "Updating DDEV files..."

            local attempts=0
            local max_attempts=3
            while [ $attempts -lt $max_attempts ]; do
                if ddev start; then
                    break
                else
                    warn "ddev start failed. Retrying... ($((attempts + 1))/$max_attempts)"
                    ((attempts++))
                    sleep 5
                fi
            done
            update_ddev_files
            update_ddev_config
            update_nginx_config
            ddev restart
        fi

        add_code_quality_tools # Merges composer scripts & installs deps
        init_deptrac
    else
        log "Skipping PHP tools installation (hooks-only mode)."
    fi

    install_node_dependencies

    # --- Create Version Stamp ---
    local install_mode="full"
    if [ "$HOOKS_ONLY_MODE" = true ]; then
        install_mode="hooks-only"
    fi
    create_version_stamp "$current_version" "$install_mode"

    success "Integration process completed."

    if [ "$HOOKS_ONLY_MODE" = true ]; then
        success "Hooks-only installation complete. Git hooks are now active for JS/TS projects."
        info "Available tools: ESLint, Prettier, Stylelint, TypeScript (if tsconfig.json exists)"
    elif [ $IS_DDEV_PROJECT -eq 1 ]; then
        success "Please run 'ddev restart' to apply the DDEV configuration changes."
    fi

    # Show post-installation summary in interactive mode
    if [ "$INTERACTIVE_MODE" = true ]; then
        show_post_installation_summary
    fi
}

# --- Script Entry Point ---

# Ensure script exits immediately if a command fails (safer execution)
set -e

# Ensure pipe failures are caught
set -o pipefail

# Trap signals for cleanup
function on_exit() {
    if [ "$NO_CLEANUP" = true ]; then
        return
    fi
    cleanup_silent
}
trap on_exit EXIT INT TERM

# Run main function, passing all arguments
main "$@"

# Explicitly exit with success code
exit 0
