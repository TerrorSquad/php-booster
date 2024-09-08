---
title: SonarQube Integration
navigation: true
layout: default
---

# SonarQube Integration: Elevate Code Quality Analysis

## Introduction

SonarQube is a powerful open-source platform for continuous code quality inspection. It provides insights into code reliability, security, maintainability, and technical debt, helping you improve your codebase over time.

In this Blueprint, we've included the necessary configurations to integrate your PHP project with SonarQube, allowing you to leverage its advanced analysis capabilities.

## Why SonarQube?

SonarQube offers a range of benefits for PHP developers and teams

* **Comprehensive Code Analysis:** SonarQube scans your code for a wide variety of issues, including bugs, vulnerabilities, code smells, and duplications
* **Continuous Inspection:**  Integrate SonarQube into your CI/CD pipeline to get instant feedback on code quality with every commit or pull request
* **Historical Trends:** Track code quality metrics over time to identify areas for improvement and measure the impact of your refactoring efforts
* **Customizable Rules:** Tailor SonarQube's rules and quality profiles to match your project's specific needs and coding standards.

## Integrating SonarQube

1. **Set up a SonarQube Server:**
   * If you don't already have a SonarQube server running, you'll need to set one up. Refer to the [SonarQube documentation](https://docs.sonarqube.org/latest/) for detailed instructions

2. **Configure SonarQube Project:**
   * Create a new project in your SonarQube server and obtain the project key and organization key
   * Update the `sonar-project.properties` file in your project root with the correct project and organization keys

3. **Generate SonarQube Reports**
   * The Blueprint includes Composer scripts to generate SonarQube-compatible reports for PHPStan and Psalm
   * Run the following commands within your DDEV environment
     * For PHPStan analysis
       ```bash
       ddev phpstan:sonar
       ```
     * For Psalm analysis
       ```bash
       ddev psalm:sonar
       ```

4. **Run SonarQube Analysis (Within your CI/CD pipeline):**
   * The `.github/workflows/sonarqube.yml` file defines a GitHub Actions workflow to run SonarQube analysis on every push to your repository
   * This workflow will execute the `phpstan:sonar` and `psalm:sonar` scripts, then use the SonarQube Scanner to upload the generated reports to your SonarQube server

## Conclusion

SonarQube is a valuable tool for gaining deeper insights into your code quality and identifying areas for improvement. By integrating it into your PHP project and CI/CD pipeline, you can proactively address potential issues and ensure a healthy and maintainable codebase

---

## Additional Resources
::list
* [SonarQube Documentation](https://docs.sonarqube.org/latest/)
* [SonarScanner for CLI](https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/)
::

Remember: SonarQube is most effective when used continuously. Make it an integral part of your development process to track your progress and maintain high code quality standards.
