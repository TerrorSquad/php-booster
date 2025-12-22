.PHONY: help test test-laravel test-symfony test-hooks test-clean test-env test-status build

# Default target - show help
help:
	@echo "PHP Booster - Integration Test Shortcuts"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Available targets:"
	@echo "  build             Build the integration script"
	@echo "  test              Run full integration test (Laravel)"
	@echo "  test-laravel      Run full Laravel integration test"
	@echo "  test-symfony      Run full Symfony integration test"
	@echo "  test-hooks        Test git hooks functionality"
	@echo "  test-env          Check environment and requirements"
	@echo "  test-status       Show current test environment status"
	@echo "  test-clean        Clean up all test environments"
	@echo ""
	@echo "Examples:"
	@echo "  make test         # Quick test with Laravel"
	@echo "  make test-symfony # Test Symfony integration"
	@echo "  make test-clean   # Clean up after tests"

# Build the integration script
build:
	@bash booster/build.sh

# Default test target (Laravel)
test: test-laravel

# Full integration test for Laravel
test-laravel:
	@echo "Running full Laravel integration test..."
	python3 tools/internal-test/test-integration.py full laravel

# Full integration test for Symfony
test-symfony:
	@echo "Running full Symfony integration test..."
	python3 tools/internal-test/test-integration.py full symfony

# Test git hooks functionality
test-hooks:
	@echo "Testing git hooks..."
	python3 tools/internal-test/test-integration.py test-hooks laravel

# Check environment and requirements
test-env:
	@echo "Checking environment..."
	python3 tools/internal-test/test-integration.py env-check

# Show test environment status
test-status:
	@echo "Test environment status:"
	python3 tools/internal-test/test-integration.py status laravel || true
	python3 tools/internal-test/test-integration.py status symfony || true

# Clean up test environments
test-clean:
	@echo "Cleaning up test environments..."
	python3 tools/internal-test/test-integration.py clean laravel || true
	python3 tools/internal-test/test-integration.py clean symfony || true
	@echo "Cleanup complete!"
