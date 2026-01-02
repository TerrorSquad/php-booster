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
    #description
    Leverage the efficiency of [DDEV](https://www.ddev.com/) for a seamless and consistent local development experience.
    ::::

    ::::u-page-card
    ---
    title: Code Quality Tools
    spotlight: true
    icon: i-vscode-icons-file-type-phpstan
    ---
    #description
    Maintain high code quality with pre-configured [PHPStan](https://phpstan.org/), [Psalm](https://psalm.dev/), and [ECS](https://github.com/easy-coding-standard/easy-coding-standard).
    ::::
    

    ::::u-page-card
    ---
    title: Automated Refactoring
    spotlight: true
    icon: i-simple-icons-newrelic
    ---
    #description
    Keep your codebase modern with [Rector](https://getrector.org/) integration for automated upgrades and instant refactoring.
    ::::

    ::::u-page-card
    ---
    title: Git Hooks & Conventions
    spotlight: true
    icon: i-noto-hook
    ---
    #description
    Enforce best practices automatically with [Conventional Commits](https://www.conventionalcommits.org/) and branch naming validation.
    ::::

    ::::u-page-card
    ---
    title: API Documentation
    spotlight: true
    icon: i-noto-gear
    ---
    #description
    Ready-to-use API documentation setup with [OpenAPI](https://swagger.io/specification/) starter spec and [ReDoc](https://github.com/Redocly/redoc) visualization.
    ::::

    ::::u-page-card
    ---
    title: IDE Configuration
    spotlight: true
    icon: i-noto-hammer-and-wrench
    ---
    #description
    Immediate productivity with included settings for [VS Code](https://code.visualstudio.com/) and [PhpStorm](https://www.jetbrains.com/phpstorm/).
    ::::

  :::
::
