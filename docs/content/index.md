---
title: Home
navigation: false
layout: page
main:
  fluid: true
---

::div{class="text-center py-12"}
  # PHP Development Booster
  
  A curated stack of quality tools for PHP projects: Static Analysis, Formatting, Refactoring, and Git Hooks.

  ::div{class="flex justify-center gap-4 mt-8"}
    ::UButton{to="/integration_guide/integration_guide" icon="i-heroicons-rocket-launch" size="xl"}
      Explore Now
    ::
    ::UButton{to="https://github.com/TerrorSquad/php-booster/" target="_blank" color="gray" variant="ghost" icon="i-simple-icons-github" size="xl"}
      Star on GitHub
    ::
  ::
::
::u-page-section
  :::u-page-grid
    ::::u-page-card
    ---
    title: DDEV-Powered Development
    spotlight: true
    icon: i-logos-docker-icon
    ---
    Leverage the efficiency of [DDEV](https://www.ddev.com/) for:
     - Seamless local development experience.
     - Consistent environments.
    ::::

    ::::u-page-card
    ---
    title: Code Quality Tools
    spotlight: true
    icon: i-vscode-icons-file-type-phpstan
    ---
    Pre-configured tools to maintain high code quality:
     - [PHPStan](https://phpstan.org/) for static analysis.
     - [Psalm](https://psalm.dev/) for advanced type checking.
     - [ECS](https://github.com/easy-coding-standard/easy-coding-standard) for coding standards enforcement.
    ::::
    

    ::::u-page-card
    ---
    title: Automated Refactoring
    spotlight: true
    icon: i-simple-icons-newrelic
    ---
    Keep your codebase modern with [Rector](https://getrector.org/) integration:
     - Automated code upgrades.
     - Instant refactoring.
    ::::

    ::::u-page-card
    ---
    title: Git Hooks & Conventions
    spotlight: true
    icon: i-noto-hook
    ---
    Enforce best practices automatically:
     - [Conventional Commits](https://www.conventionalcommits.org/) validation.
     - Branch naming conventions.
    ::::

    ::::u-page-card
    ---
    title: API Documentation
    spotlight: true
    icon: i-noto-gear
    ---
    Ready-to-use API documentation setup:
     - [OpenAPI](https://swagger.io/specification/) starter specification.
     - [ReDoc](https://github.com/Redocly/redoc) visualization.
    ::::

    ::::u-page-card
    ---
    title: IDE Configuration
    spotlight: true
    icon: i-noto-hammer-and-wrench
    ---
    Settings included for immediate productivity:
     - VS Code configuration.
     - PhpStorm configuration.
    ::::

  :::
::
