# --- Interactive Mode Functions ---

function show_welcome_banner() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║              🚀 PHP Booster Interactive Setup 🚀               ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo ""
    info "Welcome! This wizard will help you configure PHP Booster for your project."
    echo ""
    echo ""
}

function confirm_action() {
    local message="$1"
    local default="${2:-n}"
    local response

    if [ "$default" = "y" ]; then
        prompt "$message [Y/n]: "
    else
        prompt "$message [y/N]: "
    fi

    read -r response
    response=${response:-$default}

    if [[ "$response" =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

function select_project_type() {
    echo ""
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    info "Step 0: Select Project Type"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo ""
    echo "What type of project is this?"
    echo ""
    echo "  1. PHP Project (full tooling: ECS, Rector, PHPStan, Psalm, etc.)"
    echo "  2. JavaScript/TypeScript Project (no PHP tools)"
    echo ""

    # Auto-detect based on files present
    local default_type="1"
    if [ ! -f "composer.json" ] && [ -f "package.json" ]; then
        default_type="2"
        info "Detected: No composer.json, but package.json exists. Suggesting JS/TS mode."
    elif [ -f "composer.json" ]; then
        info "Detected: composer.json exists. Suggesting PHP mode."
    fi

    prompt "Select project type [1/2] (default: $default_type): "
    read -r project_choice
    project_choice=${project_choice:-$default_type}

    if [ "$project_choice" = "2" ]; then
        HOOKS_ONLY_MODE=true
        success "JavaScript/TypeScript mode selected (no PHP tools)"
    else
        HOOKS_ONLY_MODE=false
        success "PHP mode selected (full tooling)"
    fi
    echo ""
}

function select_tools_to_install() {
    # Skip PHP tool selection in hooks-only mode
    if [ "$HOOKS_ONLY_MODE" = true ]; then
        log "Skipping PHP tool selection (JS/TS only mode)"
        return
    fi

    echo ""
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    info "Step 1: Select Code Quality Tools"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo ""
    echo "PHP Booster includes the following code quality tools:"
    echo ""
    echo "  1. ECS (EasyCodingStandard) - Automatic code formatting"
    echo "  2. Rector                   - Automated refactoring & PHP upgrades"
    echo "  3. PHPStan                  - Static analysis (bug detection)"
    echo "  4. Psalm                    - Additional static analysis"
    echo ""

    local tools=("ecs" "rector" "phpstan" "psalm")
    local tool_names=("ECS (EasyCodingStandard)" "Rector" "PHPStan" "Psalm")

    if confirm_action "Install all tools? (Recommended for new integrations)" "y"; then
        INTERACTIVE_TOOLS_SELECTED=("${tools[@]}")
        success "All tools selected for installation"
    else
        echo ""
        info "Select individual tools (you can add more later):"
        echo ""

        for i in "${!tools[@]}"; do
            if confirm_action "  Install ${tool_names[$i]}?" "y"; then
                INTERACTIVE_TOOLS_SELECTED+=("${tools[$i]}")
            fi
        done

        if [ ${#INTERACTIVE_TOOLS_SELECTED[@]} -eq 0 ]; then
            warn "No tools selected. Installing all tools as fallback."
            INTERACTIVE_TOOLS_SELECTED=("${tools[@]}")
        else
            success "Selected tools: ${INTERACTIVE_TOOLS_SELECTED[*]}"
        fi
    fi
}

function configure_ide_settings() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    info "Step 3: IDE Configuration"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "PHP Booster includes IDE settings for:"
    echo "  • VS Code (.vscode/)"
    echo "  • PhpStorm (.phpstorm/)"
    echo "  • EditorConfig (.editorconfig)"
    echo ""

    if confirm_action "Install IDE configuration files?" "y"; then
        success "IDE settings will be installed"
        return 0
    else
        warn "Skipping IDE configuration (you can add them manually later)"
        return 1
    fi
}

function show_configuration_summary() {
    echo ""
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    info "Configuration Summary"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo ""

    echo "🏗️  Project Type:"
    if [ "$HOOKS_ONLY_MODE" = true ]; then
        echo "   ✓ JavaScript/TypeScript (no PHP tools)"
    else
        echo "   ✓ PHP (full tooling)"
        echo ""
        echo "📦 PHP Tools to install:"
        echo ""
        for tool in "${INTERACTIVE_TOOLS_SELECTED[@]}"; do
            echo "   ✓ $tool"
        done
    fi
    echo ""
    echo ""

    echo "🎨 IDE Settings: Will be installed"
    echo ""

    if ! confirm_action "Proceed with this configuration?" "y"; then
        error "Installation cancelled by user"
    fi

    echo ""
    success "Configuration confirmed. Starting integration..."
    sleep 1
}

function apply_interactive_configuration() {
    log "Interactive configuration applied."
}

function show_post_installation_summary() {
    echo ""
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║              ✅ PHP Booster Setup Complete! ✅                 ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo ""
    echo "📋 Next Steps:"
    echo ""
    echo ""
    echo "1. Review the integrated files:"
    echo "   • ecs.php, rector.php, phpstan.neon.dist - Code quality configs"
    echo ""
    echo "2. Try the available commands:"

    if [ $IS_DDEV_PROJECT -eq 1 ]; then
        echo ""
        echo "   ddev composer ecs          # Check/fix code style"
        echo "   ddev composer rector       # Apply automated refactoring"
        echo "   ddev composer phpstan      # Run static analysis"
        echo "   ddev composer psalm        # Additional static analysis"
        echo ""
    else
        echo ""
        echo "   composer ecs               # Check/fix code style"
        echo "   composer rector            # Apply automated refactoring"
        echo "   composer phpstan           # Run static analysis"
        echo "   composer psalm             # Additional static analysis"
        echo ""
    fi

    echo ""
    echo ""
    echo "3. Commit the booster integration:"
    echo "   git add ."
    echo "   git commit -m \"chore: integrate PHP Booster tooling\""
    echo ""
    echo "📚 Documentation: https://terrorsquad.github.io/php-booster/"
    echo ""
    success "Happy coding with PHP Booster! 🚀"
    echo ""
}

function run_interactive_mode() {
    show_welcome_banner
    select_project_type
    select_tools_to_install
    configure_ide_settings
    show_configuration_summary
}
