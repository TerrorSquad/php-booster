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

function select_tools_to_install() {
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

function configure_git_workflow() {
    echo ""
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    info "Step 2: Configure Git Workflow"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo ""
    echo "Git workflow features:"
    echo "  • Branch naming validation (e.g., feature/PRJ-123-my-feature)"
    echo "  • Conventional commit messages (e.g., feat:, fix:, chore:)"
    echo "  • Automatic ticket footer appending to commits"
    echo ""

    if confirm_action "Do you use ticket IDs in your branches? (e.g., JIRA, GitHub Issues)" "n"; then
        INTERACTIVE_REQUIRE_TICKETS=true
        echo ""
        prompt "Enter your ticket prefix (e.g., PRJ, JIRA, ISSUE): "
        read -r INTERACTIVE_TICKET_PREFIX

        if [ -z "$INTERACTIVE_TICKET_PREFIX" ]; then
            warn "No prefix provided. Using default: 'TICKET'"
            INTERACTIVE_TICKET_PREFIX="TICKET"
        fi

        success "Ticket prefix set to: $INTERACTIVE_TICKET_PREFIX"

        echo ""
        prompt "Enter the commit footer label (default: Closes): "
        read -r footer_label

        if [ -n "$footer_label" ]; then
            INTERACTIVE_COMMIT_FOOTER_LABEL="$footer_label"
        fi

        success "Commit footer will be: $INTERACTIVE_COMMIT_FOOTER_LABEL: $INTERACTIVE_TICKET_PREFIX-XXX"
    else
        INTERACTIVE_REQUIRE_TICKETS=false
        info "Ticket IDs will be optional in branch names"
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
    echo "📦 Tools to install:"
    echo ""
    for tool in "${INTERACTIVE_TOOLS_SELECTED[@]}"; do
        echo "   ✓ $tool"
    done
    echo ""
    echo ""

    echo "🔧 Git Workflow:"
    if [ "$INTERACTIVE_REQUIRE_TICKETS" = true ]; then
        echo "   ✓ Ticket IDs: Required"
        echo "   ✓ Ticket Prefix: $INTERACTIVE_TICKET_PREFIX"
        echo "   ✓ Commit Footer: $INTERACTIVE_COMMIT_FOOTER_LABEL"
    else
        echo "   ✓ Ticket IDs: Optional"
    fi
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
    # Update branch validation config with user's choices
    if [ "$INTERACTIVE_REQUIRE_TICKETS" = true ] && [ -n "$INTERACTIVE_TICKET_PREFIX" ]; then
        local config_file="validate-branch-name.config.cjs"

        if [ -f "$config_file" ]; then
            log "Updating branch validation config with ticket prefix: $INTERACTIVE_TICKET_PREFIX"

            # Update ticket prefix
            sed -i.bak "s/ticketIdPrefix: '[^']*'/ticketIdPrefix: '$INTERACTIVE_TICKET_PREFIX'/g" "$config_file"

            # Update requireTickets flag
            sed -i.bak "s/requireTickets: false/requireTickets: true/g" "$config_file"

            # Update commit footer label
            sed -i.bak "s/commitFooterLabel: '[^']*'/commitFooterLabel: '$INTERACTIVE_COMMIT_FOOTER_LABEL'/g" "$config_file"

            rm -f "$config_file.bak"

            success "Branch validation configured with your settings"
        fi
    fi
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
    echo "   • validate-branch-name.config.cjs  - Branch naming rules"
    echo "   • commitlint.config.ts             - Commit message rules"
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
    echo "3. Test your Git hooks:"
    echo "   • Create a test branch with proper naming"

    if [ "$INTERACTIVE_REQUIRE_TICKETS" = true ]; then
        echo "     Example: git checkout -b feature/$INTERACTIVE_TICKET_PREFIX-123-test-booster"
    else
        echo "     Example: git checkout -b feature/test-booster"
    fi

    echo "   • Make a commit with conventional format"
    echo "     Example: git commit -m \"feat: add PHP Booster integration\""
    echo ""
    echo "4. Commit the booster integration:"
    echo "   git add ."
    echo "   git commit -m \"chore: integrate PHP Booster tooling\""
    echo ""
    echo "📚 Documentation: https://terrorsquad.github.io/php-booster/"
    echo ""

    if [ "$INTERACTIVE_REQUIRE_TICKETS" = true ]; then
        echo "💡 Tip: Your commit messages will automatically include:"
        echo "   $INTERACTIVE_COMMIT_FOOTER_LABEL: $INTERACTIVE_TICKET_PREFIX-XXX"
        echo ""
    fi

    success "Happy coding with PHP Booster! 🚀"
    echo ""
}

function run_interactive_mode() {
    show_welcome_banner
    select_tools_to_install
    configure_git_workflow
    configure_ide_settings
    show_configuration_summary
}
