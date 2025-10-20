# PHP Booster Integration Tests

A comprehensive test suite for validating the PHP Booster integration across different PHP project types.

## Overview

This test suite provides automated testing of the PHP Booster integration process, ensuring that all tools, configurations, and git hooks work correctly in both Laravel and Symfony projects.

## Usage

### Quick Start

```bash
# Check environment and requirements
./test-integration.py env-check

# Set up a Laravel test project
./test-integration.py setup laravel my-test-app

# Run complete integration test
./test-integration.py full laravel my-test-app

# Clean up when done
./test-integration.py clean laravel my-test-app
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
# Test with custom project directory
./test-integration.py setup laravel my-app --target-dir /tmp/my-test

# Test Symfony project
./test-integration.py full symfony symfony-test

# Check status of existing project
./test-integration.py status laravel my-test-app
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
./test-integration.py status laravel my-project

# Resume a stopped project
./test-integration.py setup-resume laravel my-project
```
./test-integration.py

# Full test with specific framework
./test-integration.py full symfony

# Full test with custom project name
./test-integration.py full laravel my-custom-project

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
- Creates fresh Laravel or Symfony projects using DDEV with framework-specific naming
- Framework-specific project names prevent DDEV conflicts (e.g., `booster-test-laravel`, `booster-test-symfony`)
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

The Python script creates test projects with framework-specific naming:
- Laravel: `tests/laravel/booster-test-laravel` 
- Symfony: `tests/symfony/booster-test-symfony`

This prevents DDEV project name conflicts when testing multiple frameworks.

To clean up:
```bash
# Automatic cleanup (specify framework)
./test-integration.py clean laravel
./test-integration.py clean symfony

# Manual cleanup example
cd tests/laravel/booster-test-laravel && ddev delete -y
rm -rf tests/laravel/booster-test-laravel
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
