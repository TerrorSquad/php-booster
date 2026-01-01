# SonarQube Integration

> Integrate with SonarQube for continuous code quality inspection.

We provide configurations to integrate your project with [SonarQube](https://www.sonarsource.com/products/sonarqube/) for continuous code quality inspection.

## Setup

1. **Configure Project**: Update `sonar-project.properties` in your project root with your project and organization keys.
2. **Generate Reports**: Use the provided scripts to generate compatible reports for PHPStan and Psalm:```bash
# PHPStan
composer phpstan:sonar

# Psalm
composer psalm:sonar
```

<br />

**DDEV:**```bash
ddev composer phpstan:sonar
ddev composer psalm:sonar
```
3. **CI/CD**: The `.github/workflows/sonarqube.yml` file (if present) defines a workflow to run analysis on push.
