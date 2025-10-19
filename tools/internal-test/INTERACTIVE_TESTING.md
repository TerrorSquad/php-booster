# PHP Booster Interactive Mode Testing

This document explains how to test the interactive mode feature of PHP Booster using the integrated test framework.

## Available Test Commands

The interactive testing functionality is now fully integrated into the main test orchestrator with the following commands:

### 1. Standalone Interactive Test

Tests the interactive mode without requiring a full project setup:

```bash
python tools/internal-test/test-integration.py test-interactive
```

This test:
- Creates a temporary directory at `tests/temp_interactive_test`
- Runs the integration script with the `-I` flag
- Verifies that all expected files are created
- Validates that the branch validation config is correctly set up

### 2. Project-Based Interactive Test

Tests the interactive mode with a real project (requires setup first):

```bash
# Set up a test project
python tools/internal-test/test-integration.py setup laravel test-project

# Run the interactive test with manual input
python tools/internal-test/test-integration.py test-interactive-project

# Run the interactive test with automated input
python tools/internal-test/test-integration.py test-interactive-project --automated
```

This test:
- Checks that the project exists and DDEV is running
- Runs the integration script with the `-I` flag in the project directory
- Requires manual input unless `--automated` is specified

### 3. Clean Up

Clean up the temporary test directory:

```bash
python tools/internal-test/test-integration.py clean-interactive-test
```

## What's Being Tested

The interactive mode tests verify:

1. That the integration script runs successfully with the `-I` flag
2. That all expected files are created:
   - package.json
   - commitlint.config.ts
   - validate-branch-name.config.cjs
   - pnpm-workspace.yaml
   - ecs.php
   - rector.php
   - phpstan.neon.dist
   - psalm.xml
   - .editorconfig
   - .booster-version
   - documentation/openapi.yml
   - tools/git-hooks/hooks/commit-msg
   - tools/git-hooks/shared/utils.ts
3. That the branch validation config contains the correct ticket prefix ("PRJ")

## Automated Test Input

When running with `--automated`, the following inputs are simulated:

- Install all tools: `y`
- Use ticket IDs: `y`
- Ticket prefix: `PRJ`
- Commit footer: (default)
- Install IDE settings: `y`
- Proceed with configuration: `y`

## Implementation Details

The interactive testing functionality is implemented in the following files:

- `tools/internal-test/lib/test_orchestrator.py`: Contains the test methods
- `tools/internal-test/test-integration.py`: Main entry point for running tests

## Troubleshooting

If the tests fail, check:

1. That the booster script exists at the expected location (`booster/integrate_booster.sh`)
2. That the integration script has the `-I` flag implemented
3. That all required files are properly created
4. The stdout/stderr output for specific errors