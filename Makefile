.PHONY: help build

# Default target - show help
help:
	@echo "PHP Booster"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Available targets:"
	@echo "  build   Build the integration script from booster/src/"
	@echo ""
	@echo "For integration tests, use the test script directly:"
	@echo "  python3 tools/internal-test/test-integration.py --help"

# Build the integration script
build:
	@bash booster/build.sh

	python3 tools/internal-test/test-integration.py clean symfony || true
	@echo "Cleanup complete!"
