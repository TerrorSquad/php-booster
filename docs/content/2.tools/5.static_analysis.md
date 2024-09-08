---
title: Static Analysis
navigation: true
layout: default
---

# Static Analysis: Elevate Your Code Quality with PHPStan and Psalm

## Introduction

Static analysis is a powerful technique for analyzing your code without actually executing it. It helps identify potential errors, inconsistencies, and code smells early in the development process, leading to more robust and maintainable PHP applications.

In this Blueprint, we leverage two leading static analysis tools: PHPStan and Psalm. Let's explore how they work and how to integrate them into your DDEV-powered PHP projects.

## PHPStan: Your Code's Guardian Angel

PHPStan focuses on finding errors in your code, such as:

* Undefined variables and methods
* Type mismatches
* Incorrect function calls
* Dead code

### Integrating PHPStan

1. **Require PHPStan:**
   * If PHPStan is not already a dependency in your project, add it using Composer:
     ```bash
     ddev composer require --dev phpstan/phpstan
     ```

2. **Configuration:**
   * The `phpstan.neon.dist` file in your project root provides the base configuration for PHPStan. You can customize it further by creating a `phpstan.neon` file to override or extend the default settings.
   * Key configuration options:
     * `parameters.level`: Sets the analysis level (0-9, higher levels are stricter).
     * `paths`: Specifies which directories or files to analyze.
     * `includes`: Includes additional configuration files.
     * `rules`:  Defines custom rules or excludes specific checks.

3. **Running PHPStan:**
   * **Within DDEV:** Use the following command, which is also defined as a Composer script:
     ```bash
     ddev composer phpstan 
     ```
   * **In your IDE:** Install the PHPStan plugin for your IDE to get real-time feedback and inline error highlighting.
   * **For SonarQube Integration:**  If you're using SonarQube, you can generate a report compatible with SonarQube using:
     ```bash
     ddev composer phpstan:sonar
     ```

## Psalm: Type Safety at its Finest

Psalm takes static analysis a step further by focusing on type safety. It helps you:

* Enforce strict typing in your code
* Identify potential type-related errors
* Improve code readability and maintainability

### Integrating Psalm

1. **Require Psalm:**
   * If Psalm is not already a dependency in your project, add it using Composer:
     ```bash
     ddev composer require --dev vimeo/psalm
     ```

2. **Configuration:**
   * The `psalm.xml` file in your project root configures Psalm. Customize it to match your project's specific needs and coding style.
   * Key configuration options:
     * `issueHandler`:  Configure which issue types to report and their severity levels
     * `stubs`: Include external type definitions for third-party libraries
     * `plugins`: Extend Psalm's functionality with plugins

3. **Running Psalm:**
   * **Within DDEV:** Use the following command:
     ```bash
     ddev composer psalm
     ```
   * **In your IDE:** Install the Psalm plugin for your IDE to get instant type checking and suggestions as you code
   * **For SonarQube Integration:** Generate a SonarQube-compatible report with
     ```bash
     ddev composer psalm:sonar
     ```


## Conclusion

Static analysis tools like PHPStan and Psalm are invaluable assets for PHP developers. By integrating them into your DDEV-powered projects, you can catch errors early, enforce best practices, and ensure your codebase is robust and maintainable.

## Additional Resources

::list{type="info"}
* [PHPStan Documentation](https://phpstan.org/)
* [Psalm Documentation](https://psalm.dev/)
* [SonarQube](https://www.sonarqube.org/)
::
