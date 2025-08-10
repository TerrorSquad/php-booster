# PHP Booster Integration Testing

This directory contains tools to test the PHP Booster integration on clean projects.

## Test Methods

### 1. Local Test Script

Run the test script directly on your system:

```bash
# Basic usage
./test-integration.sh symfony test-project

# With custom parameters
./test-integration.sh laravel custom-project /path/to/target no
```

Parameters:
- Project type: `symfony` or `laravel` (default: symfony)
- Project name: Name for the project (default: test-project)
- Target directory: Where to create the project (default: /tmp/php-booster-test)
- DDEV enable: `yes` or `no` (default: yes)

### 2. Docker-based Testing

For isolated testing without affecting your local environment:

```bash
# Start both test containers
docker-compose up

# Test specific framework only
docker-compose up symfony-test
docker-compose up laravel-test

# Interactive mode (for debugging)
docker-compose run --rm symfony-test bash
```

### 3. GitHub Actions

Integration tests are automatically run on:
- Push to main/develop branches
- Pull requests targeting main/develop
- Weekly schedule (Sunday at 2 AM)
- Manual trigger from GitHub UI

## Test Verification

The test script verifies:

1. File structure (expected booster files present)
2. Tool execution (composer scripts work)
3. Git hooks (branch validation, commit message formatting)

## Output

Test results are displayed in the terminal. For GitHub Actions, test output is archived as artifacts.

## Cleaning Up

Local testing creates files in `/tmp/php-booster-test` by default, which you can safely delete.
For Docker testing, volumes are created but can be removed with:

```bash
docker-compose down -v
```
