# Testing Interactive Mode with Python Test Script

This guide explains how to test the PHP Booster interactive mode using the Python test infrastructure.

## Quick Start

### Method 1: Using the Existing Test Script (Automated)

The standard test script automatically uses non-interactive mode:

```bash
# Standard integration (uses -N flag automatically)
python tools/internal-test/test-integration.py integrate laravel test-project
```

This runs the integration in **automated mode** with all defaults, perfect for CI/CD.

### Method 2: Testing Interactive Mode Manually

To test the interactive wizard:

```bash
# 1. Set up a test project first
python tools/internal-test/test-integration.py setup laravel test-interactive

# 2. Run the dedicated interactive test script
python tools/internal-test/test-interactive.py
```

This will:
- Prompt you to choose interactive or automated mode
- If interactive: You'll go through the wizard manually
- If automated: It runs with defaults (no prompts)

### Method 3: Testing with Simulated Input

For automated testing of interactive mode with pre-defined answers:

```bash
python tools/internal-test/test-interactive.py --automated
```

This simulates user input programmatically.

## How It Works

### The `-N` Flag (Non-Interactive Mode)

We added a `-N` flag to the integration script specifically for testing:

```bash
# Interactive mode (manual prompts)
./integrate_booster.sh -I

# Non-interactive mode (automated, no prompts)
./integrate_booster.sh -N

# Default mode (no special behavior)
./integrate_booster.sh
```

### Updated Python Method

The `integrate_booster()` method now accepts an `interactive_mode` parameter:

```python
# Automated mode (default) - uses -N flag
integration.integrate_booster(interactive_mode=False)

# Interactive mode - uses -I flag
integration.integrate_booster(interactive_mode=True)
```

## Usage Examples

### Example 1: Quick Integration Test (Automated)

```python
#!/usr/bin/env python3
from pathlib import Path
from tools.internal_test.lib import *

config = Config(
    action="integrate",
    project_type="laravel",
    project_name="test-project",
    target_dir=Path("tests/laravel/test-project"),
    # ... other config
)

# This uses non-interactive mode automatically
integration = BoosterIntegration(config, cmd_executor, state_detector, logger)
integration.integrate_booster()  # No prompts!
```

### Example 2: Manual Interactive Testing

```python
#!/usr/bin/env python3
# See: tools/internal-test/test-interactive.py

# Run with interactive wizard
integration.integrate_booster(interactive_mode=True)

# User will be prompted for:
# - Tool selection
# - Ticket ID configuration
# - IDE settings
# - Confirmation
```

### Example 3: Simulated Input Testing

```python
import subprocess

# Pre-define all answers
answers = [
    "y",    # Install all tools?
    "y",    # Use ticket IDs?
    "PRJ",  # Ticket prefix
    "",     # Commit footer (default)
    "y",    # Install IDE settings?
    "y"     # Proceed?
]

input_string = "\n".join(answers) + "\n"

result = subprocess.run(
    ["bash", "integrate_booster.sh", "-I"],
    input=input_string,
    text=True,
    capture_output=True,
    cwd="tests/laravel/test-project"
)
```

## Full Testing Workflow

### Step 1: Setup Test Project

```bash
cd /path/to/php-booster
python tools/internal-test/test-integration.py setup laravel my-test
```

### Step 2: Choose Testing Method

#### Option A: Automated (No Prompts)
```bash
# Uses existing test infrastructure
python tools/internal-test/test-integration.py integrate laravel my-test
```

#### Option B: Manual Interactive
```bash
# Use the interactive test script
python tools/internal-test/test-interactive.py

# Then choose option 1 for interactive mode
```

#### Option C: Simulated Interactive
```bash
# Fully automated but tests the interactive flow
python tools/internal-test/test-interactive.py --automated
```

### Step 3: Verify Integration

```bash
cd tests/laravel/my-test

# Check files were created
ls -la validate-branch-name.config.cjs
ls -la commitlint.config.ts
ls -la ecs.php rector.php phpstan.neon.dist

# Test the tools
ddev composer ecs
ddev composer phpstan

# Test git hooks
git checkout -b feature/TEST-123-test-booster
git commit --allow-empty -m "feat: test integration"
```

### Step 4: Clean Up

```bash
python tools/internal-test/test-integration.py clean laravel my-test
```

## CI/CD Integration

For GitHub Actions or other CI systems, use the automated mode:

```yaml
# .github/workflows/test-integration.yml
- name: Test PHP Booster Integration
  run: |
    # Automated mode - no prompts
    python tools/internal-test/test-integration.py full laravel ci-test
```

The existing test infrastructure already handles this correctly!

## Troubleshooting

### "Interactive mode not working in CI"

✅ **Solution:** The Python test script automatically uses `-N` flag in CI environments.

### "Want to test interactive mode locally"

✅ **Solution:** Use `test-interactive.py` script:
```bash
python tools/internal-test/test-interactive.py
```

### "Need to test specific interactive answers"

✅ **Solution:** Use the automated simulation:
```bash
python tools/internal-test/test-interactive.py --automated
```

Edit the `answers` list in the script to test different configurations.

### "Integration hangs waiting for input"

❌ **Problem:** Running with `-I` flag in non-TTY environment  
✅ **Solution:** Use `-N` flag for automation, `-I` only for manual testing

## Command Reference

| Command | Mode | Use Case |
|---------|------|----------|
| `integrate_booster.sh` | Default | Manual installation |
| `integrate_booster.sh -I` | Interactive | First-time users, manual testing |
| `integrate_booster.sh -N` | Non-interactive | CI/CD, automated testing |
| `integrate_booster.sh -I -v` | Interactive + Verbose | Debugging |

## Python Method Reference

```python
# Default: Automated mode (no prompts)
integration.integrate_booster()

# Explicit automated mode
integration.integrate_booster(interactive_mode=False)

# Interactive mode (requires TTY)
integration.integrate_booster(interactive_mode=True)
```

## Next Steps

- ✅ Run `python tools/test-interactive-mode.sh` to verify the feature
- ✅ Test manually: `python tools/internal-test/test-interactive.py`
- ✅ Use in CI: existing test infrastructure handles it automatically
- ✅ Document custom test scenarios as needed

## Summary

The interactive mode is **fully compatible** with the Python test infrastructure:

1. **Existing tests** continue to work (automated mode by default)
2. **New test script** available for manual interactive testing
3. **Simulated input** testing available for automation
4. **CI/CD friendly** - no changes needed to existing workflows

Choose the method that best fits your testing needs! 🚀
