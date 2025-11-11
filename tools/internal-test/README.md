# PHP Booster Integration Tests

A comprehensive test suite for validating the PHP Booster integration across different PHP project types.

## Overview

This test suite provides automated testing of the PHP Booster integration process, ensuring that all tools, configurations, and git hooks work correctly in both Laravel and Symfony projects.

## Usage

### Quick Start

```bash
# Using Makefile (recommended)
make test              # Run Laravel test
make test-symfony      # Run Symfony test
make test-clean        # Clean up test environments

# Or using Python script directly
./test-integration.py env-check
./test-integration.py full laravel
./test-integration.py clean laravel
```

### Available Actions

| Action | Description |
|--------|-------------|
| `env-check` | Check environment and system requirements |
| `setup` | Create and configure a new test project |
| `setup-resume` | Resume an existing project (start DDEV) |
| `integrate` | Integrate PHP Booster into the project |
| `verify` | Verify the integration was successful |
| `test-hooks` | Test git hooks and branch validation |
| `clean` | Clean up the test environment |
| `status` | Show current project status |
| `full` | Run the complete test suite |

### Project Types

- **`laravel`** - Laravel framework projects
- **`symfony`** - Symfony framework projects

### Examples

```bash
# Makefile shortcuts
make test              # Run full Laravel integration test
make test-symfony      # Run full Symfony integration test
make test-hooks        # Test git hooks functionality
make test-env          # Check environment and requirements
make test-status       # Show test environment status
make test-clean        # Clean up all test environments

# Python script directly
./test-integration.py full laravel
./test-integration.py full symfony
./test-integration.py setup laravel
./test-integration.py verify laravel
./test-integration.py test-hooks laravel
./test-integration.py status laravel
./test-integration.py clean laravel

# Custom target directory (advanced)
./test-integration.py full laravel --target-dir /tmp/my-test
```

## Dependencies

### Required Commands
- `ddev` - Local development environment
- `git` - Version control
- `composer` - PHP dependency management
- `docker` - Container runtime (required by DDEV)

### Python Requirements
- Python 3.7+
- Standard library only (no external dependencies)

## CI/CD Integration

The test suite is designed for use in GitHub Actions and other CI environments. It automatically detects CI mode and adjusts behavior accordingly.

## Development

For developers working on the PHP Booster itself, the integration tests provide confidence that changes don't break the end-to-end user experience.

## Testing Features

### Environment Validation
- System requirements checking
- Command availability verification
- Docker and DDEV status validation

### Project Setup
- Automatic project scaffolding (Laravel/Symfony)
- DDEV configuration and startup
- Basic dependency installation

### Booster Integration
- Local development mode testing
- Configuration file verification
- Tool availability validation

### Verification
- Expected file presence checking
- Composer package validation
- PHP tool functionality testing

### Git Hooks Testing
- Valid branch name acceptance
- Invalid branch name rejection
- Commit message validation
- Ticket footer appending

## Requirements

## Troubleshooting

### Import Errors
If you encounter import errors, ensure you're running the script from the repository root:
```bash
cd /path/to/php-blueprint
python3 tools/internal-test/test-integration.py env-check
```

### Missing Dependencies
Run `env-check` to verify all required commands are available:
```bash
./test-integration.py env-check
```

### DDEV Issues
Check DDEV status and restart if needed:
```bash
# Check DDEV status
./test-integration.py status laravel

# Resume a stopped project
./test-integration.py setup-resume laravel
```

## Command Reference

```bash
# Environment check
./test-integration.py env-check

# Full test (complete suite)
./test-integration.py full laravel
./test-integration.py full symfony

# Individual test steps
./test-integration.py setup laravel      # Only create and set up project
./test-integration.py integrate laravel  # Only run booster integration
./test-integration.py verify laravel     # Only verify integration worked
./test-integration.py test-hooks laravel # Only test git hooks
./test-integration.py status laravel     # Show status
./test-integration.py clean laravel      # Clean up

# Custom target directory (advanced use case)
./test-integration.py full laravel --target-dir /path/to/target
```

**Available Actions:**
- `full` - Run the complete test suite (default)
- `env-check` - Check environment and requirements only
- `setup` - Create and set up a new project
- `setup-resume` - Resume setup for existing project
- `integrate` - Run booster integration on existing project  
- `verify` - Verify the integration is working
- `test-hooks` - Test git hooks and branch validation
- `clean` - Clean up the test environment
- `status` - Show current test environment status

**Supported Frameworks:**
- `laravel` (default)
- `symfony`

**Note:** Project name is fixed as `booster-test` to ensure consistent, reproducible test environments.

## GitHub Actions

Integration tests are automatically run via GitHub Actions on:
- Push to main/develop branches (tests both Laravel and Symfony)
- Pull requests targeting main/develop (tests both Laravel and Symfony)  
- Weekly schedule (Sunday at 2 AM UTC)
- Manual trigger from GitHub UI with customizable options:
  - Choose project type (Laravel or Symfony)
  - Choose test action (full, setup, integrate, verify, test-hooks)

The workflow uses the same Python test script and provides the same comprehensive testing in a CI environment.

## Test Features

The Python test script provides comprehensive verification:

### Project Setup
- Creates fresh Laravel or Symfony projects using DDEV
- Fixed project name `booster-test` ensures consistent test environments
- Initializes git repository with proper configuration
- Sets up DDEV containers and services with unique project identification

### Integration Testing
- Tests local development mode integration
- Verifies all expected files are created
- Checks composer dependencies are installed
- Tests all quality tools are working

### Git Hooks Testing
- Tests branch naming validation (valid and invalid scenarios)
- Verifies commit message linting with conventional commits
- Tests automatic ticket ID appending to commit messages
- Validates pre-commit hooks with PHP quality checks

### Environment Support
- Local development mode for testing changes before commit
- DDEV containerization for isolated testing
- Automatic cleanup and environment management

## Requirements

- Python 3.7+
- Git
- DDEV
- curl

The script will check requirements and provide clear error messages for missing tools.

## Test Output

The test script provides:
- Color-coded progress indicators
- Detailed logging of each step
- Clear success/failure messages
- Debugging information when tests fail
- Instructions for cleanup and next steps

## Cleaning Up

The test script creates projects in:
- Laravel: `tests/laravel/booster-test` 
- Symfony: `tests/symfony/booster-test`

To clean up:
```bash
# Using Makefile (recommended)
make test-clean

# Or using Python script directly
./test-integration.py clean laravel
./test-integration.py clean symfony

# Manual cleanup example (if needed)
cd tests/laravel/booster-test && ddev delete -y
rm -rf tests/laravel/booster-test
```

## Local Development Mode

For testing local changes to the booster before committing:

```bash
# The script automatically uses local development mode
# Set these environment variables if needed:
export BOOSTER_LOCAL_DEV=1
export BOOSTER_LOCAL_PATH="/path/to/booster"

# Run tests
make test
# or
./test-integration.py full laravel
```
