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
    echo "  -v          Enable verbose logging"
    echo "  -c          Skip cleanup (preserve temporary files for debugging)"
    echo "  -i          Show version information and exit"
    echo "  -h          Show this help message and exit"
    echo ""
    echo "DESCRIPTION:"
    echo "  Integrates PHP Booster tooling into an existing PHP project."
    echo "  Supports both standard PHP projects and DDEV environments."
    echo ""
    echo "EXAMPLES:"
    echo "  $0              # Run integration with default settings"
    echo "  $0 -I           # Run in interactive mode (guided setup)"
    echo "  $0 -v           # Run with verbose output"
    echo "  $0 -i           # Show version information"
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


function main() {
    # Process command line arguments
    while getopts ":vchiIN" opt; do
        case $opt in
        v) VERBOSE=true ;;
        c) NO_CLEANUP=true ;;
        h) show_help; exit 0 ;;
        i) show_version_info_and_exit ;;
        I) INTERACTIVE_MODE=true ;;
        N) SKIP_INTERACTIVE=true ;;
        \?) error "Invalid option: -$OPTARG. Use -h for help." ;;
        :) error "Option -$OPTARG requires an argument." ;;
        esac
    done
    shift $((OPTIND - 1))

    log "Starting php-booster integration..."
    IS_DDEV_PROJECT=$(is_ddev_project)

    if [ $IS_DDEV_PROJECT -eq 1 ]; then
        log "DDEV project detected."
    else
        log "Standard PHP project detected (no .ddev directory found)."
    fi

    if [ ! -f "composer.json" ] && [ ! -d ".git" ]; then
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
    install_node_dependencies

    # --- Create Version Stamp ---
    create_version_stamp "$current_version"

    success "Integration process completed."

    if [ $IS_DDEV_PROJECT -eq 1 ]; then
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
