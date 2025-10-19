# Running Interactive Mode with Python Test Script - Quick Reference

## 🎯 TL;DR

```bash
# Existing tests work as-is (automated mode)
python tools/internal-test/test-integration.py integrate laravel test-project

# Test interactive mode manually
python tools/internal-test/test-interactive.py

# Test interactive mode with simulated input
python tools/internal-test/test-interactive.py --automated
```

## 📋 What Changed

### 1. Integration Script Updates
- ✅ Added `-N` flag for non-interactive mode (CI-friendly)
- ✅ Modified `-I` flag behavior to respect `-N` override
- ✅ Updated help text

### 2. Python Integration Class Updates  
- ✅ Added `interactive_mode` parameter to `integrate_booster()`
- ✅ Automatically uses `-N` flag when `interactive_mode=False`
- ✅ Uses `-I` flag when `interactive_mode=True`

### 3. New Test Script
- ✅ Created `test-interactive.py` for manual and automated testing
- ✅ Supports both manual input and simulated input modes

## 🚀 Usage Modes

### Mode 1: Existing Tests (No Changes Needed)

Your existing Python tests work exactly as before:

```python
# This automatically uses non-interactive mode
integration.integrate_booster()
```

**CI/CD:** ✅ No changes needed - everything works!

### Mode 2: Manual Interactive Testing

```bash
# 1. Setup test project
python tools/internal-test/test-integration.py setup laravel test-interactive

# 2. Run interactive test
python tools/internal-test/test-interactive.py

# 3. Choose option 1 for interactive wizard
```

### Mode 3: Automated Interactive Testing

```bash
# Tests the interactive flow with pre-defined answers
python tools/internal-test/test-interactive.py --automated
```

This simulates:
- "y" → Install all tools
- "y" → Use ticket IDs
- "PRJ" → Ticket prefix
- "" → Default commit footer
- "y" → Install IDE settings
- "y" → Confirm configuration

## 💡 Key Points

1. **Backward Compatible:** All existing tests continue to work
2. **CI-Friendly:** Non-interactive mode (`-N`) prevents hanging
3. **Manual Testing:** New script for testing the wizard
4. **Automated Testing:** Can simulate user input for CI

## 📝 Command Flags

| Flag | Purpose | Use In |
|------|---------|--------|
| `-I` | Interactive wizard | Manual testing |
| `-N` | Non-interactive (skip prompts) | CI/CD, Python tests |
| `-v` | Verbose logging | Debugging |
| `-i` | Show version | Version checks |
| `-h` | Help | Documentation |

## 🔍 Examples

### Example 1: Standard Python Test (Automated)

```python
from lib.booster_integration import BoosterIntegration

# Default behavior - no prompts
integration.integrate_booster()

# Equivalent to:
# bash integrate_booster.sh -N
```

### Example 2: Test Interactive Wizard

```python
# Requires TTY (terminal)
integration.integrate_booster(interactive_mode=True)

# Equivalent to:
# bash integrate_booster.sh -I
```

### Example 3: CI/CD Pipeline

```yaml
# GitHub Actions
- name: Test Integration
  run: |
    # Uses non-interactive mode automatically
    python tools/internal-test/test-integration.py full laravel ci-test
```

## ✅ Testing Checklist

- [x] Verify existing tests still pass
- [x] Test interactive mode manually
- [x] Test automated interactive mode
- [x] Verify CI/CD compatibility
- [x] Update documentation

## 📚 More Information

See detailed documentation:
- `tools/internal-test/TESTING_INTERACTIVE_MODE.md` - Full testing guide
- `docs/content/1.integration_guide/2.interactive_mode.md` - User documentation
- `docs/INTERACTIVE_MODE_IMPLEMENTATION.md` - Implementation details

## 🎉 Summary

**You can now:**
1. ✅ Run existing Python tests without changes
2. ✅ Test interactive mode manually when needed
3. ✅ Automate interactive mode testing
4. ✅ Use in CI/CD without modifications

The interactive mode is **fully integrated** with your Python test infrastructure! 🚀
