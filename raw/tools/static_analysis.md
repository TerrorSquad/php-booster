# Static Analysis

> Catch errors and enforce type safety with PHPStan and Psalm.

We use [PHPStan](https://phpstan.org/) and [Psalm](https://psalm.dev/) for static analysis to catch errors and enforce type safety.

## PHPStan

### Usage

```bash
composer phpstan
```

- **For SonarQube Integration:**```bash
composer phpstan:sonar
```
- **DDEV:**```bash
ddev composer phpstan
ddev composer phpstan:sonar
```

### Configuration

The `phpstan.neon.dist` file in your project root provides the base configuration. Create a `phpstan.neon` file to override settings.

## Psalm

### Usage

```bash
composer psalm
```

- **In your IDE:** See the [IDE Configuration](/tools/ide_configuration#ddev-integration-helper) page for details on setting up the `psalm-ddev` wrapper.
- **For SonarQube Integration:**

```bash
composer psalm:sonar
```

- **DDEV:**

```bash
ddev composer psalm
ddev composer psalm:sonar
```

### Configuration

The `psalm.xml` file in your project root configures Psalm.
