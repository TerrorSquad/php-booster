#!/bin/bash
# Test script for Renovate feature validation
# This script runs all tests related to the Renovate integration

set -e

echo "=========================================="
echo "Renovate Feature Test Suite"
echo "=========================================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Running JavaScript/TypeScript tests...${NC}"
cd "$ROOT_DIR/booster"

# Run renovate configuration tests
echo ""
echo "1. Testing renovate.json structure and configuration..."
pnpm vitest run tools/git-hooks/tests/renovate.test.mjs

echo ""
echo -e "${BLUE}Running Python verification tests...${NC}"
cd "$ROOT_DIR/tools/internal-test"

# Run Python unit tests for renovate verification
echo ""
echo "2. Testing renovate.json verification logic..."
python3 test_renovate_verification.py

echo ""
echo -e "${GREEN}=========================================="
echo "All Renovate tests passed! ✓"
echo -e "==========================================${NC}"
echo ""
echo "Summary:"
echo "  - JavaScript tests: 12 tests covering renovate.json validation"
echo "  - Python tests: 3 tests covering verification logic"
echo ""
echo "The Renovate feature is properly tested and working."
