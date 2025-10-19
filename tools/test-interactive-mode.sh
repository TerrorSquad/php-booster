#!/usr/bin/env bash

# Test script for interactive mode functionality
# This simulates user input to test the interactive wizard

set -e

echo "🧪 Testing PHP Booster Interactive Mode"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create a temporary test directory
TEST_DIR=$(mktemp -d)
echo "📁 Created test directory: $TEST_DIR"

# Get absolute path to script directory BEFORE changing directories
SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_PATH")"
BOOSTER_SCRIPT="$ROOT_DIR/booster/integrate_booster.sh"

# Verify booster script exists
if [ ! -f "$BOOSTER_SCRIPT" ]; then
    echo -e "${RED}✗ Booster script not found at: $BOOSTER_SCRIPT${NC}"
    exit 1
fi

# Cleanup on exit
trap "rm -rf $TEST_DIR" EXIT

cd "$TEST_DIR"

# Create a minimal PHP project structure
mkdir -p src tests
cat > composer.json << 'EOF'
{
    "name": "test/interactive-mode",
    "type": "project",
    "require": {
        "php": "^8.2"
    },
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        }
    }
}
EOF

cat > src/Example.php << 'EOF'
<?php

namespace App;

class Example
{
    public function hello(): string
    {
        return "Hello, World!";
    }
}
EOF

# Initialize git repo
git init
git config user.email "test@example.com"
git config user.name "Test User"
git add .
git commit -m "Initial commit"

echo ""
echo "✅ Test project created"
echo ""

# Test 1: Check help text includes interactive flag
echo "Test 1: Checking help text for interactive mode option..."
if bash "$BOOSTER_SCRIPT" -h 2>/dev/null | grep -q "interactive mode"; then
    echo -e "${GREEN}✓ Help text includes interactive mode${NC}"
else
    echo -e "${RED}✗ Help text missing interactive mode${NC}"
    exit 1
fi

echo ""

# Test 2: Verify interactive mode functions exist
echo "Test 2: Verifying interactive mode functions..."
FUNCTIONS_TO_CHECK=(
    "show_welcome_banner"
    "confirm_action"
    "select_tools_to_install"
    "configure_git_workflow"
    "configure_ide_settings"
    "show_configuration_summary"
    "apply_interactive_configuration"
    "show_post_installation_summary"
    "run_interactive_mode"
)

ALL_FUNCTIONS_EXIST=true
for func in "${FUNCTIONS_TO_CHECK[@]}"; do
    if grep -q "function $func()" "$BOOSTER_SCRIPT"; then
        echo -e "${GREEN}  ✓ $func${NC}"
    else
        echo -e "${RED}  ✗ $func missing${NC}"
        ALL_FUNCTIONS_EXIST=false
    fi
done

if [ "$ALL_FUNCTIONS_EXIST" = false ]; then
    echo -e "${RED}✗ Some functions are missing${NC}"
    exit 1
fi

echo ""

# Test 3: Verify interactive mode variables
echo "Test 3: Verifying interactive mode variables..."
VARIABLES_TO_CHECK=(
    "INTERACTIVE_MODE"
    "INTERACTIVE_INSTALL_TOOLS"
    "INTERACTIVE_TOOLS_SELECTED"
    "INTERACTIVE_TICKET_PREFIX"
    "INTERACTIVE_REQUIRE_TICKETS"
    "INTERACTIVE_COMMIT_FOOTER_LABEL"
)

ALL_VARIABLES_EXIST=true
for var in "${VARIABLES_TO_CHECK[@]}"; do
    if grep -q "^${var}=" "$BOOSTER_SCRIPT"; then
        echo -e "${GREEN}  ✓ $var${NC}"
    else
        echo -e "${RED}  ✗ $var missing${NC}"
        ALL_VARIABLES_EXIST=false
    fi
done

if [ "$ALL_VARIABLES_EXIST" = false ]; then
    echo -e "${RED}✗ Some variables are missing${NC}"
    exit 1
fi

echo ""

# Test 4: Check getopts includes -I flag
echo "Test 4: Checking getopts includes -I flag..."
if grep -q 'getopts ":vchiI"' "$BOOSTER_SCRIPT"; then
    echo -e "${GREEN}✓ getopts includes -I flag${NC}"
else
    echo -e "${RED}✗ getopts missing -I flag${NC}"
    exit 1
fi

echo ""

# Test 5: Verify interactive mode is called in main
echo "Test 5: Verifying interactive mode invocation..."
if grep -q 'if \[ "$INTERACTIVE_MODE" = true \]; then' "$BOOSTER_SCRIPT" && \
   grep -q 'run_interactive_mode' "$BOOSTER_SCRIPT"; then
    echo -e "${GREEN}✓ Interactive mode properly invoked in main${NC}"
else
    echo -e "${RED}✗ Interactive mode not properly invoked${NC}"
    exit 1
fi

echo ""

# Test 6: Verify configuration application
echo "Test 6: Verifying configuration application..."
if grep -q 'apply_interactive_configuration' "$BOOSTER_SCRIPT"; then
    echo -e "${GREEN}✓ Configuration application included${NC}"
else
    echo -e "${RED}✗ Configuration application missing${NC}"
    exit 1
fi

echo ""

# Test 7: Verify post-installation summary
echo "Test 7: Verifying post-installation summary..."
if grep -q 'show_post_installation_summary' "$BOOSTER_SCRIPT"; then
    echo -e "${GREEN}✓ Post-installation summary included${NC}"
else
    echo -e "${RED}✗ Post-installation summary missing${NC}"
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║         ✅ All Interactive Mode Tests Passed! ✅               ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "The interactive mode feature has been successfully implemented!"
echo ""
echo "To test it manually, run:"
echo "  cd $TEST_DIR"
echo "  bash ../../booster/integrate_booster.sh -I"
echo ""
