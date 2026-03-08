---
title: Integration Guide
description: Step-by-step guide to integrating the PHP Development Booster into your project.
navigation:
  icon: i-heroicons-rocket-launch
---

## Quick Start

Follow these steps to integrate the PHP Development Booster into your existing PHP project:

::steps
  ### Prepare Your Project
  - Ensure your project is under version control (e.g., Git).
  - Check out a new branch and ensure there are no uncommitted changes.

  ### Run the Integration Script
  Execute the following command in your project root to integrate the booster:
  ```bash [Terminal]
  curl -sSL https://raw.githubusercontent.com/TerrorSquad/php-booster/main/booster/integrate_booster.sh | bash
  ```

  ### Complete the Integration
  - Follow the on-screen instructions provided by the script.
  - Review the changes made to your project.

  ### Commit and Push
  - Commit the changes to your branch:
    ```bash [Terminal]
    git add .
    git commit -m "Integrate PHP Development Booster"
    ```
  - Push the branch to your repository and create a pull request for review.
::

## Performance

The integration script automatically tries to download a minimal `booster.zip` package from GitHub releases first, which is significantly faster than cloning the entire repository. It transparently falls back to git cloning if the ZIP is not available.

**Expected download sizes:**
- **ZIP package**: ~136 KB (recommended)
- **Full git clone**: ~5+ MB (fallback)

You can force git clone if needed:
```bash [Terminal]
curl -sSL https://raw.githubusercontent.com/TerrorSquad/php-booster/main/booster/integrate_booster.sh | BOOSTER_USE_ZIP=false bash
```

## JavaScript/TypeScript Projects

For JavaScript or TypeScript projects without PHP, use the **hooks-only mode** (`-J`):

```bash [Terminal]
curl -sSL https://raw.githubusercontent.com/TerrorSquad/php-booster/main/booster/integrate_booster.sh | bash -s -- -J
```

This installs:
- **Git hooks**: Pre-commit, commit-msg, pre-push
- **JS/TS tools**: ESLint, Prettier, Stylelint, TypeScript type-checking
- **Commit conventions**: CommitLint, branch name validation

::tip
The script auto-detects JS/TS projects (no `composer.json` found) and suggests hooks-only mode.
::

## Interactive Mode

::tip
The integration script includes an **Interactive Mode** (`-I`) that guides you through the setup process with a wizard. This is useful for customizing the integration (selecting specific tools, configuring ticket IDs, etc.).

```bash [Terminal]
curl -sSL https://raw.githubusercontent.com/TerrorSquad/php-booster/main/booster/integrate_booster.sh | bash -s -- -I
```
::

### Configuration Steps

::steps
  ### Select Project Type
  Choose between PHP (full tooling) or JavaScript/TypeScript (hooks only).

  ### Select Code Quality Tools (PHP only)
  Choose to install ECS, Rector, PHPStan, or Psalm individually or all at once.

  ### Configure Git Workflow
  *   **Ticket IDs**: Enforce ticket IDs in branch names (e.g., `feature/PRJ-123-description`).
  *   **Ticket Prefix**: Set your project's prefix (e.g., `PRJ`, `JIRA`).
  *   **Commit Footer**: Customize the footer label (e.g., `Closes: PRJ-123`).

  ### IDE Configuration
  Optionally install settings for VS Code, PhpStorm, and EditorConfig.
::
::note
The wizard will display a summary of your choices before applying any changes.
::

## Updating an Existing Installation

For projects with an existing booster installation, use **partial update flags** to refresh specific components without a full reinstall:

### Update Git Hooks Only

```bash [Terminal]
curl -sSL https://raw.githubusercontent.com/TerrorSquad/php-booster/main/booster/integrate_booster.sh | bash -s -- --update-hooks
```

This updates only the `.husky` directory with the latest hook scripts.

### Update Config Files Only

```bash [Terminal]
curl -sSL https://raw.githubusercontent.com/TerrorSquad/php-booster/main/booster/integrate_booster.sh | bash -s -- --update-configs
```

This updates:
- `commitlint.config.ts`
- `validate-branch-name.config.cjs`
- `renovate.json`
- `.editorconfig`
- PHP configs (if applicable): `ecs.php`, `rector.php`, `phpstan.neon.dist`, `psalm.xml`, `deptrac.yaml`

### Update Dependencies Only

```bash [Terminal]
curl -sSL https://raw.githubusercontent.com/TerrorSquad/php-booster/main/booster/integrate_booster.sh | bash -s -- --update-deps
```

This runs the package manager commands to install/update dependencies (both npm and composer).

### Combining Flags

You can combine partial update flags:

```bash [Terminal]
# Update hooks and configs together
curl -sSL https://raw.githubusercontent.com/TerrorSquad/php-booster/main/booster/integrate_booster.sh | bash -s -- --update-hooks --update-configs

# For JS/TS projects, combine with -J
curl -sSL https://raw.githubusercontent.com/TerrorSquad/php-booster/main/booster/integrate_booster.sh | bash -s -- -J --update-hooks
```

::tip
Partial updates are faster than a full reinstall and preserve your custom configurations in files like `package.json` and `composer.json`.
::

## Command Line Reference

The integration script supports several flags to customize its behavior:

| Flag | Description |
| :--- | :--- |
| `-I` | Run in interactive mode (guided setup wizard). |
| `-N` | Non-interactive mode (skip prompts, use defaults). |
| `-J` | **JavaScript/TypeScript only** mode (hooks only, no PHP tools). |
| `-v` | Enable verbose logging for debugging. |
| `--ignore-platform-reqs` | Ignore platform requirements when installing PHP dependencies (useful if your local PHP version differs from production). |
| `--update-hooks` | **Partial Update**: Refresh only Git hooks in `.husky`. |
| `--update-configs` | **Partial Update**: Refresh configuration files. |
| `--update-deps` | **Partial Update**: Refresh dependencies (composer/npm). |
