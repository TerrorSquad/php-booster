# PHP Booster Integration Testing

This directory contains tools to test the PHP Booster integration on clean projects.

## Test Script

Run the comprehensive Python test script for full end-to-end testing:

```bash
# Full test with defaults (Laravel project)
./test-integration.py

# Full test with specific framework
./test-integration.py full symfony my-project

# Individual test steps
./test-integration.py setup            # Only create and set up project
./test-integration.py integrate        # Only run booster integration
./test-integration.py verify           # Only verify integration worked
./test-integration.py test-hooks       # Only test git hooks and branch validation
./test-integration.py status           # Show current test environment status
./test-integration.py clean            # Clean up test environment

# Environment check
./test-integration.py env-check

# Custom target directory
./test-integration.py full laravel custom-project /path/to/target
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
- Initializes git repository with proper configuration
- Sets up DDEV containers and services

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

The Python script creates test projects in `tests/laravel/test-project` or `tests/symfony/test-project` by default.

To clean up:
```bash
# Automatic cleanup
./test-integration.py clean

# Manual cleanup
cd tests/laravel/test-project && ddev delete -y
rm -rf tests/laravel/test-project
```

## Local Development Mode

For testing local changes to the booster before committing:

```bash
# The script automatically uses local development mode
# Set these environment variables if needed:
export BOOSTER_LOCAL_DEV=1
export BOOSTER_LOCAL_PATH="/path/to/booster"
./test-integration.py full
```
