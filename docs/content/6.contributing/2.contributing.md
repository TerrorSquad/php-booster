# Contributions

We welcome contributions from everyone! This document will guide you through the process of making your first
contribution.

## Table of Contents

- [Contributions](#contributions)
  - [Initial Setup](#initial-setup)
  - [Contributing](#contributing)
  - [Branch Naming](#branch-naming)
  - [Commit Messages](#commit-messages)
  - [Tools We Use](#tools-we-use)
    - [Required Visual Studio Code Extensions](#required-visual-studio-code-extensions)
    - [Required PHPStorm Extensions](#required-phpstorm-extensions)
  - [Code Quality with SonarQube](#code-quality-with-sonarqube)

## Initial setup

1. Clone the repository to your own machine
2. Check out the `main` branch
3. Set up the project locally
4. Install composer and node dependencies
5. Ensure you can run the project

## Contributing

1. Pick a ticket from JIRA or Easy Red Mine
2. Create a new branch from `main` (see below)
3. Make your changes:
    1. Code according to our style guidelines (see below).
    2. Commit your changes: Use conventional commits (see below)
    3. Create a PR and assign it to someone for code review

## Conventions used

This project uses [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/). This ensures git history is
clean and readable.

### Branch Naming

Branches must be named in the following format:

`<type>/<prefix>-<ticket_number>-<description>`

Where the prefix can be either `PRJ` (for JIRA tickets) or `ERM` (for Easy RedMine tickets).

#### Examples:
- `feature/PRJ-1234-add-login-feature`
- `fix/ERM-5678-correct-auth-bug`
- `chore/PRJ-9101-update-dependencies`

This naming convention ensures branches are easily identifiable and traceable to their corresponding tasks or issues.

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

```
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

Commitlint will automatically append the ticket ID to the commit message `footer`. Focus on the title and optionally the body.

## Tools We Use

- We use [Husky](https://typicode.github.io/husky/) to manage Git hooks. This helps us enforce code quality and commit   message standards.
- We use [Commitlint](https://commitlint.js.org/) to ensure that all commit messages follow the Conventional Commits specification.
- We use a pull request template to ensure consistent and informative pull requests.

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
