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
