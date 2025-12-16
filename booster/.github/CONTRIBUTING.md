# Contributions

We welcome contributions from everyone! This document will guide you through the process of making your first
contribution.

## Table of Contents

- [Contributions](#contributions)
- [Initial Setup](#initial-setup)
- [Contributing](#contributing)
- [Branch Naming](#branch-naming)
- [Developer Tooling](#developer-tooling)
- [Environment Variables](#environment-variables-skipping-checks)
- [Hook Footers](#hook-footers)
- [Commit Messages](#commit-messages)
- [Tools We Use](#tools-we-use)
- [Required Visual Studio Code Extensions](#required-visual-studio-code-extensions)
- [Required PHPStorm Extensions](#required-phpstorm-extensions)
- [Code Quality with SonarQube](#code-quality-with-sonarqube)

## Initial setup

Please refer to the [README.md](../README.md#local-development-environment) for instructions on setting up the local development environment.

## Contributing

1. Pick a ticket from JIRA or Easy Red Mine
2. Create a new branch from `main` (see below)
3. Make your changes:
4. Code according to our style guidelines (see below).
5. Commit your changes: Use conventional commits (see below)
6. Create a PR and assign it to someone for code review

## Conventions used

This project uses [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/). This ensures git history is
clean and readable.

### Branch Naming

Enforced automatically via the `commit-msg` git hook (see `validate-branch-name.config.cjs`).

Format:

```text
<type>/[<ticket-id>-]<description>
```

Where:

- `type` ∈ `feature|fix|chore|story|task|bug|sub-task`
- Optional `ticket-id` matches `(PRJ|ERM)-<number>` and when present must be followed by a dash and description parts
- Description: alphanumeric segments separated by single dashes (no leading/trailing/consecutive dashes)
- Skipped branches (not validated): `wip`, `main`, `master`, `develop/test`, `develop/host1`, `develop/host2`

Examples:

- `feature/PRJ-1234-add-login-feature`
- `fix/ERM-5678-correct-auth-bug`
- `chore/update-dependencies`

If the ticket pattern is enabled in config and you use a ticket prefix, it must include the number (e.g. `PRJ-123-...`).

### Commits and commit messages

Commit Size: Aim for small, focused commits that address a single issue or feature
Commit Messages: Follow the Conventional Commits specification

We use Conventional Commits to maintain a clear and informative commit history. This helps us automate changelog
generation, versioning, and other project
management tasks.

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for clear and consistent commit messages.

Each commit message should adhere to the following format:

#### Format

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- type: The type of change (e.g., feat, fix, chore, docs, etc.).
- scope (optional): The scope of the change (e.g., the component or module affected).
- description: A brief description of the change.
- body (optional): A more detailed explanation of the change, if necessary.
- footer(s) (optional): Additional information like breaking changes or issue references (e.g., "BREAKING CHANGE: ..."
  or "Fixes #123").
- **type**: The type of change (e.g., feat, fix, chore, docs).
- **scope** (optional): The area of the codebase affected.
- **description**: A brief summary of the change.
- **body** (optional): Detailed explanation, if needed.
- **footer(s)** (optional): Additional info like breaking changes or issue references.

#### Examples

- `feat: add user authentication`
- `fix(auth): correct password validation error`
- `chore: update dependencies`
- `docs: improve installation instructions`

Commitlint plus the `commit-msg` hook will append the ticket footer automatically (see Hook Footers). Focus on the title and optional body.

### Developer Tooling

Git hooks (managed via Husky and `zx`) enforce naming, formatting and static analysis.

**Hooks:**

- `commit-msg`: Validates branch name and commit message format. Appends ticket ID footer.
- `pre-commit`: Runs linters and static analysis.
- **PHP**: Rector, PHPStan, Psalm, EasyCodingStandard.
- **JS/TS**: ESLint, Prettier, Stylelint.
- `pre-push`: Runs tests (`Pest`) and generates API documentation.

### Environment Variables (Skipping Checks)

For a complete list of environment variables to skip specific checks (e.g., `SKIP_PRECOMMIT`, `SKIP_PHPSTAN`), please refer to the [Git Hooks Documentation](../.husky/README.md#environment-variables).

### Hook Footers

If a ticket is required & detected, the hook appends a footer:

```text
Closes: PRJ-123
```

Footer label is configurable via `commitFooterLabel` in `validate-branch-name.config.cjs`. Valid characters: alphanumeric, `_`, `-` (must start with a letter). Default: `Closes`.

### Configuration Reference (`validate-branch-name.config.cjs`)

| Key                   | Description                                       |
| --------------------- | ------------------------------------------------- | ------ |
| `types`               | Allowed branch type prefixes.                     |
| `ticketIdPrefix`      | Alternation of allowed ticket prefixes (e.g. `PRJ | ERM`). |
| `ticketNumberPattern` | Numeric pattern for ticket IDs.                   |
| `namePattern`         | Pattern for the descriptive part.                 |
| `skipped`             | Branch names bypassing validation.                |
| `commitFooterLabel`   | Footer label appended with ticket ID.             |

### Troubleshooting

| Issue           | Resolution                                                                    |
| --------------- | ----------------------------------------------------------------------------- |
| Branch rejected | Check branch name format against `validate-branch-name.config.cjs` rules.     |
| Missing footer  | Ensure branch has valid ticket segment & config has prefixes.                 |
| Slow pre-commit | Use `SKIP_...` variables if necessary (e.g. `SKIP_PHPSTAN=1 git commit ...`). |

## Tools We Use

### Linters & Static Analysis

This project uses the following tools to ensure code quality. Most run automatically via git hooks, but you can run them manually via `ddev`.

- **[Rector](https://getrector.org/)**: PHP refactoring and upgrades.
- Command: `ddev composer rector`
- Config: `rector.php`
- **[PHPStan](https://phpstan.org/)**: PHP static analysis.
- Command: `ddev composer phpstan`
- Config: `phpstan.neon.dist`
- **[Psalm](https://psalm.dev/)**: PHP static analysis.
- Command: `ddev composer psalm`
- Config: `psalm.xml`
- **[EasyCodingStandard (ECS)](https://github.com/easy-coding-standard/easy-coding-standard)**: PHP coding standard enforcement (PSR-12).
- Command: `ddev composer ecs` (check) or `ddev composer fix-cs` (fix)
- Config: `ecs.php`
- **JS/TS Tools**: `ESLint`, `Prettier`, `Stylelint`.

### Git Hooks

We use [Husky](https://typicode.github.io/husky/) to manage Git hooks. For detailed configuration and troubleshooting, see [.husky/README.md](../.husky/README.md).

### Required Visual Studio Code Extensions

To maintain consistency and enhance productivity, we require the following Visual Studio Code extensions:

- [sonarsource.sonarlint-vscode](https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarlint-vscode)
- [usernamehw.errorlens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens)
- [IgorSbitnev.error-gutters](https://marketplace.visualstudio.com/items?itemName=IgorSbitnev.error-gutters)
- [Gruntfuggly.todo-tree](https://marketplace.visualstudio.com/items?itemName=Gruntfuggly.todo-tree)
- [wayou.vscode-todo-highlight](https://marketplace.visualstudio.com/items?itemName=wayou.vscode-todo-highlight)
- [vivaxy.vscode-conventional-commits](https://marketplace.visualstudio.com/items?itemName=vivaxy.vscode-conventional-commits)
- [DEVSENSE.phptools-vscode](https://marketplace.visualstudio.com/items?itemName=DEVSENSE.phptools-vscode)

These extensions are listed in the `.vscode/extensions.json` file in the project root directory. Install them **before** starting development to ensure a smooth workflow and adherence to our coding standards.

These extensions provide essential features like linting, formatting, and code analysis that help us maintain code quality and consistency

### Required PHPStorm extensions

- [DDEV Integration](https://plugins.jetbrains.com/plugin/18813-ddev-integration)
- [Sonarlint](https://plugins.jetbrains.com/plugin/7973-sonarlint)
- [Git Toolbox](https://plugins.jetbrains.com/plugin/7499-gittoolbox)
- [Inspection lens](https://plugins.jetbrains.com/plugin/19678-inspection-lens)

#### Optional PHPStorm extensions

- [Atom Material Icons](https://plugins.jetbrains.com/plugin/10044-atom-material-icons)
- [One Dark Theme](https://plugins.jetbrains.com/plugin/11938-one-dark-theme)
- [PHP Inspections (EA Extended)](https://plugins.jetbrains.com/plugin/7622-php-inspections-ea-extended)
- [PHP Hammer](https://plugins.jetbrains.com/plugin/19515-php-hammer)
- [PHP Annotations](https://plugins.jetbrains.com/plugin/7320-php-annotations)

## Code Quality with SonarQube

We use [SonarQube](https://sonarqube.com/) to analyze our code for potential bugs, vulnerabilities, and code smells. This ensures that our codebase is maintainable and of high quality.

Before merging any pull request, please make sure that the SonarQube check has passed successfully. If any issues are raised by SonarQube, address them before requesting a review.
