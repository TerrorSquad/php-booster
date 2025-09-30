# PHP Auto-Fix GitHub Actions

This booster includes GitHub Actions that automatically apply code style fixes and modernizations to your PHP code using Rector and ECS. This moves the formatting and refactoring burden from local development machines to the cloud.

## Features

- 🤖 **Automatic code fixing** on every push and pull request
- 🔧 **Rector integration** for automatic refactoring and modernization
- 🎨 **ECS integration** for code style standardization
- 📝 **Auto-commit fixes** with descriptive messages
- 💬 **PR comments** notifying about applied fixes
- ⚡ **Optimized performance** with caching and smart file detection

## Available Workflows

### 1. Complete Workflow (`php-auto-fix.yml`)
Full-featured workflow with all bells and whistles:
- Comprehensive error handling
- Detailed logging and comments
- Smart file detection based on git changes
- Automatic PR comments
- Skip patterns to prevent infinite loops

### 2. Simple Workflow (`php-auto-fix-simple.yml`)
Streamlined version using the reusable action:
- Clean and minimal configuration
- Uses the reusable action component
- Easier to customize and maintain

## How It Works

1. **Trigger**: Workflow runs on pushes to main branches and PRs
2. **File Detection**: Identifies changed PHP files since last commit/PR base
3. **Rector Processing**: Applies automatic refactoring and modernization
4. **ECS Processing**: Fixes code style issues
5. **Auto-Commit**: Creates a new commit with fixes if changes are detected
6. **PR Notification**: Comments on PR to notify about applied fixes

## Configuration

### Environment Variables
You can customize behavior using environment variables in your workflow:

```yaml
- name: Run PHP Auto-Fix
  uses: ./.github/actions/php-auto-fix
  with:
    php-version: '8.3'          # PHP version to use
    skip-rector: 'false'        # Skip Rector processing
    skip-ecs: 'false'          # Skip ECS processing
    commit-message: 'style: auto-fix code'  # Custom commit message
    file-pattern: '*.php'       # File pattern to match
```

### Skip Auto-Fix
To skip auto-fix for specific commits, include `[skip auto-fix]` in your commit message:

```bash
git commit -m "feat: add new feature [skip auto-fix]"
```

### Custom Configuration
The actions respect your existing Rector and ECS configuration files:
- `rector.php` - Rector configuration
- `ecs.php` - ECS configuration

## Security Considerations

- Uses `GITHUB_TOKEN` with minimal required permissions
- Only processes files that were changed in the commit/PR
- Includes `[skip ci]` in auto-fix commits to prevent infinite loops
- Validates that tools exist before running them

## Benefits

### For Developers
- 🚀 **Faster local development** - no need to run formatters locally
- 🔄 **Consistent code style** across the entire team
- 📈 **Automatic modernization** of legacy code patterns
- 🛡️ **Reduced merge conflicts** from formatting differences

### For Teams
- 📊 **Enforced standards** without developer overhead
- 🤝 **Improved code reviews** - focus on logic, not style
- 🔧 **Automatic maintenance** of code quality
- 📝 **Transparent process** with clear commit history

## Troubleshooting

### Action Not Running
- Check that PHP files were actually changed
- Verify the workflow triggers match your branch names
- Ensure `rector.php` and `ecs.php` exist in your project

### No Changes Applied
- Check that Rector and ECS are installed via Composer
- Verify your configuration files are valid
- Look at the action logs for specific error messages

### Permission Issues
- Ensure the repository has Actions enabled
- Check that `GITHUB_TOKEN` has write permissions to contents
- For protected branches, you may need a personal access token

## Example Usage

### Basic Setup
The actions are automatically integrated when you run the PHP Booster integration script. No additional setup required!

### Custom Workflow
If you want to customize the workflow, copy one of the provided templates and modify it:

```yaml
name: My Custom Auto-Fix

on:
  push:
    branches: [ main ]
    paths: [ '**.php' ]

jobs:
  auto-fix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/php-auto-fix
        with:
          php-version: '8.2'
          skip-rector: 'false'
```

## Integration with Git Hooks

The auto-fix actions work seamlessly with the local git hooks:
- **Local hooks** catch issues during development
- **CI actions** provide a safety net for anything that slips through
- **Consistent tooling** ensures the same rules apply everywhere

This creates a comprehensive code quality pipeline from development to production.