---
title: Git Hooks
navigation: true
layout: default
---

# Git Hooks: Automate Your Workflow and Enforce Quality

## Introduction

Git hooks are scripts that run automatically at specific points in your Git workflow, such as before a commit or before a push. They provide a powerful way to automate tasks, enforce coding standards, and ensure code quality before changes are shared with your team.

In this Blueprint, we utilize Husky to manage Git hooks and CommitLint to enforce consistent commit message formatting.

## Husky: Simplifying Git Hooks Management

Husky is a tool that makes it easy to set up and manage Git hooks in your project. It simplifies the process of defining and executing scripts at various Git events.

### How Husky Works

* Husky leverages npm scripts defined in your `package.json` file to trigger actions at specific Git hooks.
* It automatically installs and configures the necessary Git hooks in your project's `.git/hooks` directory.
* Husky provides a clear and concise way to define which scripts should run at each hook.

## CommitLint: Enforcing Commit Message Standards

CommitLint helps you maintain clean and informative commit messages by enforcing a set of rules and conventions. Consistent commit messages make it easier to understand the history of your project and facilitate collaboration within your team.

### How CommitLint Works

* CommitLint analyzes your commit messages against a predefined set of rules.
* It provides feedback on any violations, helping you craft clear and meaningful commit messages.
* CommitLint can be integrated into your Git hooks to prevent commits with non-compliant messages.

## Integrating Git Hooks in Your Project

1. **Husky Setup:**
   * Husky should already be installed and configured if you followed the Blueprint setup. 
   * If you need to set it up manually, refer to the [Husky documentation](https://typicode.github.io/husky/#/).

2. **CommitLint Configuration:**
   * The `commitlint.config.js` file in your project root defines the rules for your commit messages.
   * You can customize these rules to match your team's preferences and conventions

3. **Git Hooks Configuration:**
   * The `tools/git-hooks-ddev/hooks` directory contains the scripts that will be executed at specific Git events
   * The `pre-commit` hook is configured to run `pnpm lint-staged`, which, in turn, executes the scripts defined in the `lint-staged` section of your `package.json`.
   * The `commit-msg` hook is configured to run CommitLint to validate your commit messages

## Conclusion

Git hooks, powered by Husky and CommitLint, are essential for automating your workflow and enforcing code quality and consistency. By integrating these tools into your project, you can streamline your development process, improve collaboration, and maintain a clean and organized Git history

---

## Additional Resources

::list
* [Husky Documentation](https://typicode.github.io/husky/#/)
* [CommitLint Documentation](https://commitlint.js.org/)
::
**Remember:** 

::list{type="success"}
* Explore the various Git hooks available and consider adding more scripts to automate other tasks in your workflow
* Customize the CommitLint rules to align with your team's conventions.
* Encourage your team members to adopt these practices for a more efficient and collaborative development experience.
::
