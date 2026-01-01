# Integration Guide

> Step-by-step guide to integrating the PHP Development Booster into your project.

## Quick Start

Follow these steps to integrate the PHP Development Booster into your existing PHP project:

1. **Prepare Your Project**:
  - Ensure your PHP project is under version control (e.g., Git).
  - Check out a new branch and ensure there are no uncommitted changes.
2. **Run the Integration Script**:
Execute the following command in your project root to integrate the booster:```bash
curl -sSL https://raw.githubusercontent.com/TerrorSquad/php-booster/main/booster/integrate_booster.sh | bash
```
3. **Complete the Integration**:
  - Follow the on-screen instructions provided by the script.
  - Review the changes made to your project.
4. **Commit and Push**:
  - Commit the changes to your branch:
  ```bash
  git add .
  git commit -m "Integrate PHP Development Booster"
  ```
  - Push the branch to your repository and create a pull request for review.

## Interactive Mode

The integration script includes an **Interactive Mode** (`-I`) that guides you through the setup process with a wizard. This is useful for customizing the integration (selecting specific tools, configuring ticket IDs, etc.).

### Usage

```bash
curl -sSL https://raw.githubusercontent.com/TerrorSquad/php-booster/main/booster/integrate_booster.sh | bash -s -- -I
```

### Configuration Steps

1. **Select Code Quality Tools**: Choose to install ECS, Rector, PHPStan, or Psalm individually or all at once.
2. **Configure Git Workflow**:

  - **Ticket IDs**: Enforce ticket IDs in branch names (e.g., `feature/PRJ-123-description`).
  - **Ticket Prefix**: Set your project's prefix (e.g., `PRJ`, `JIRA`).
  - **Commit Footer**: Customize the footer label (e.g., `Closes: PRJ-123`).
3. **IDE Configuration**: Optionally install settings for VS Code, PhpStorm, and EditorConfig.

The wizard will display a summary of your choices before applying any changes.
