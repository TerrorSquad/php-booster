# Booster

[![Integration Tests](https://github.com/TerrorSquad/php-booster/actions/workflows/integration-tests.yml/badge.svg)](https://github.com/TerrorSquad/php-booster/actions/workflows/integration-tests.yml)

A curated collection of tools and best practices for PHP development.

## Key Features
- Streamlined local development (optionally with [DDEV](https://ddev.com/)).
- Static analysis with [PHPStan](https://phpstan.org/) and [Psalm](https://psalm.dev/).
- Automated code formatting with [EasyCodingStandard](https://github.com/symplify/easy-coding-standard).
- Automatic refactoring with [Rector](https://getrector.org/).
- Git hooks for quality enforcement.
- **GitHub Actions for automatic code fixing** - Move formatting and modernization to the cloud!
- IDE configuration for VS Code and PhpStorm.

## Requirements

You can use this booster with or without [DDEV](https://ddev.com/).  
If you wish to use DDEV for local development, please install it by following their [installation instructions](https://ddev.com/).

## Documentation

- Site: [https://terrorsquad.github.io/php-booster/](https://terrorsquad.github.io/php-booster/)
- Copilot repository guidance: [.github/copilot-instructions.md](./.github/copilot-instructions.md)

## Adding to an Existing PHP Project

To integrate the booster into your existing PHP project:

1. In your PHP project root, check out a new branch and make sure you have no uncommitted changes.

2. Run the following command to integrate the booster into your project:

    ```bash
    curl -sSL https://raw.githubusercontent.com/TerrorSquad/php-booster/main/booster/integrate_booster.sh | bash
    ```

3. Follow the instructions on the screen.

4. Commit the changes and push the branch to your repository.

## 🤖 Automatic Code Fixing with GitHub Actions

The booster includes powerful GitHub Actions that automatically fix your PHP code style and apply modernizations on every push and pull request. This moves the code quality burden from local development machines to the cloud!

### What It Does
- **Automatic Rector processing** - Modernizes PHP code patterns and applies refactoring
- **Automatic ECS fixes** - Standardizes code style across your entire codebase  
- **Smart file detection** - Only processes files that were actually changed
- **Auto-commits fixes** - Creates clean commits with applied changes
- **PR integration** - Comments on pull requests when fixes are applied

### How It Works
1. Push code or create a pull request
2. GitHub Actions automatically runs Rector and ECS on changed PHP files
3. If fixes are needed, a new commit is automatically created
4. You get consistently formatted and modernized code without any manual work

### Skip Auto-Fix
Include `[skip auto-fix]` in your commit message to skip automatic processing:
```bash
git commit -m "feat: add new feature [skip auto-fix]"
```

For more details, see the [Auto-Fix Documentation](booster/.github/AUTO_FIX_README.md).

## License
This repository is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.
