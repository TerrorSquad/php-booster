#!/usr/bin/env bash

# Demo script showing what the interactive mode looks like
# This doesn't actually run the integration, just shows the interface

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

function info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

function prompt() {
    echo -e "${YELLOW}[?]${NC} $1"
}

clear

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║              🚀 PHP Booster Interactive Setup 🚀               ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
info "Welcome! This wizard will help you configure PHP Booster for your project."
echo ""

sleep 2

echo ""
echo "═══════════════════════════════════════════════════════════════"
info "Step 1: Select Code Quality Tools"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "PHP Booster includes the following code quality tools:"
echo ""
echo "  1. ECS (EasyCodingStandard) - Automatic code formatting"
echo "  2. Rector                   - Automated refactoring & PHP upgrades"
echo "  3. PHPStan                  - Static analysis (bug detection)"
echo "  4. Psalm                    - Additional static analysis"
echo ""

prompt "Install all tools? (Recommended for new integrations) [Y/n]: "
echo "y"
echo ""
echo -e "${GREEN}[SUCCESS]${NC} All tools selected for installation"

sleep 2

echo ""
echo "═══════════════════════════════════════════════════════════════"
info "Step 2: Configure Git Workflow"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Git workflow features:"
echo "  • Branch naming validation (e.g., feature/PRJ-123-my-feature)"
echo "  • Conventional commit messages (e.g., feat:, fix:, chore:)"
echo "  • Automatic ticket footer appending to commits"
echo ""

prompt "Do you use ticket IDs in your branches? (e.g., JIRA, GitHub Issues) [y/N]: "
echo "y"
echo ""

prompt "Enter your ticket prefix (e.g., PRJ, JIRA, ISSUE): "
echo "PRJ"
echo ""
echo -e "${GREEN}[SUCCESS]${NC} Ticket prefix set to: PRJ"
echo ""

prompt "Enter the commit footer label (default: Closes): "
echo ""
echo ""
echo -e "${GREEN}[SUCCESS]${NC} Commit footer will be: Closes: PRJ-XXX"

sleep 2

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

prompt "Install IDE configuration files? [Y/n]: "
echo "y"
echo ""
echo -e "${GREEN}[SUCCESS]${NC} IDE settings will be installed"

sleep 2

echo ""
echo "═══════════════════════════════════════════════════════════════"
info "Configuration Summary"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "📦 Tools to install:"
echo "   ✓ ecs"
echo "   ✓ rector"
echo "   ✓ phpstan"
echo "   ✓ psalm"
echo ""

echo "🔧 Git Workflow:"
echo "   ✓ Ticket IDs: Required"
echo "   ✓ Ticket Prefix: PRJ"
echo "   ✓ Commit Footer: Closes"
echo ""

echo "🎨 IDE Settings: Will be installed"
echo ""

prompt "Proceed with this configuration? [Y/n]: "
echo "y"
echo ""

echo -e "${GREEN}[SUCCESS]${NC} Configuration confirmed. Starting integration..."

sleep 2

echo ""
echo "... (integration process runs here) ..."
echo ""

sleep 1

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║              ✅ PHP Booster Setup Complete! ✅                 ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Review the integrated files:"
echo "   • validate-branch-name.config.cjs  - Branch naming rules"
echo "   • commitlint.config.ts             - Commit message rules"
echo "   • ecs.php, rector.php, phpstan.neon.dist - Code quality configs"
echo ""
echo "2. Try the available commands:"
echo "   composer ecs               # Check/fix code style"
echo "   composer rector            # Apply automated refactoring"
echo "   composer phpstan           # Run static analysis"
echo "   composer psalm             # Additional static analysis"
echo ""
echo "3. Test your Git hooks:"
echo "   • Create a test branch with proper naming"
echo "     Example: git checkout -b feature/PRJ-123-test-booster"
echo "   • Make a commit with conventional format"
echo "     Example: git commit -m \"feat: add PHP Booster integration\""
echo ""
echo "4. Commit the booster integration:"
echo "   git add ."
echo "   git commit -m \"chore: integrate PHP Booster tooling\""
echo ""
echo "📚 Documentation: https://terrorsquad.github.io/php-booster/"
echo ""
echo "💡 Tip: Your commit messages will automatically include:"
echo "   Closes: PRJ-XXX"
echo ""
echo -e "${GREEN}[SUCCESS]${NC} Happy coding with PHP Booster! 🚀"
echo ""
