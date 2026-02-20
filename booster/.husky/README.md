# Git Hooks Configuration

This project uses [Husky](https://typicode.github.io/husky/) combined with [Google's zx](https://github.com/google/zx) to run TypeScript-based Git hooks. This setup allows for a robust, cross-platform, and easily maintainable hook system.

## Structure

The `.husky` directory contains the following:

- **`commit-msg`**: Shell script entry point for the commit-msg hook.
- **`commit-msg.ts`**: TypeScript logic for commit message validation and ticket appending.
- **`pre-commit`**: Shell script entry point for the pre-commit hook.
- **`pre-commit.ts`**: TypeScript logic for the pre-commit hook (linters).
- **`pre-push`**: Shell script entry point for the pre-push hook.
- **`pre-push.ts`**: TypeScript logic for the pre-push hook (tests, docs).
- **`shared/`**: A library of shared utilities and configurations.
  - **`runner.sh`**: Generic runner script that handles DDEV container detection and command execution.
  - **`tools.ts`**: Centralized configuration for all quality tools (JS & PHP).
  - **`types.ts`**: TypeScript definitions for the system.
  - **`workflow.ts`**: The core execution engine that runs tools, handles errors, and manages output.
  - **`core.ts`**: Low-level utilities for logging and environment management.
  - **`git.ts`**: Git-specific operations (staging files, checking merge state).

## Adding or Configuring Tools

The system is designed to be data-driven. You do not need to write complex scripts to add a new tool. All tool configurations are located in `.husky/shared/tools.ts`.

To add a new tool, simply add a `ToolConfig` object to the `TOOLS` array.

### Configuration Object (`ToolConfig`)

| Property           | Type                        | Description                                                                                      |
| ------------------ | --------------------------- | ------------------------------------------------------------------------------------------------ |
| `name`             | `string`                    | Display name of the tool (used in logs).                                                         |
| `command`          | `string`                    | The binary command to run (e.g., `eslint`, `rector`).                                            |
| `type`             | `'node' \| 'php'`           | Determines where to look for the binary (`node_modules/.bin` or `vendor/bin`).                   |
| `args`             | `string[]`                  | (Optional) Arguments to pass to the command.                                                     |
| `extensions`       | `string[]`                  | (Optional) Only run on files with these extensions.                                              |
| `stagesFilesAfter` | `boolean`                   | (Optional) If `true`, re-stages files after execution (useful for fixers).                       |
| `passFiles`        | `boolean`                   | (Optional) If `false`, does not pass the list of staged files to the command. Default is `true`. |
| `onFailure`        | `'continue' \| 'stop'`      | (Optional) What happens when this tool fails. Default is `'continue'`. Use `'stop'` for syntax checks that must pass before other tools run. |

### Example

```typescript
{
  name: 'My New Tool',
  command: 'my-tool',
  args: ['--check'],
  type: 'node',
  extensions: ['.ts', '.js'],
  stagesFilesAfter: false,
  onFailure: 'continue'  // or 'stop' for critical checks
}
```

## Hook Specifics

### `pre-commit`

Runs quality tools (linters, static analysis) on staged files.

- **Caching**: ESLint and Prettier use caching to speed up repeated runs.
- **Auto-fix**: Tools like ESLint, Prettier, Rector, and ECS will automatically fix issues and re-stage the changes.

### `commit-msg`

Enforces commit message standards and branch naming.

- **Ticket IDs**: Automatically appends the ticket ID (e.g., `Closes: PRJ-123`) to the commit message body if found in the branch name.
- **Validation**: Ensures the commit message follows Conventional Commits.

### `pre-push`

Ensures the codebase is ready for deployment.

- **Tests**: Runs the fast test suite (`composer test:pest`).
- **API Documentation**: Checks if `openapi/openapi.yml` matches the code and regenerates if needed.
- **Deptrac Image**: Generates dependency graph visualization.

## DDEV Integration

The hooks are designed to work seamlessly with DDEV.

- The `shared/runner.sh` script automatically detects if the project is running in DDEV.
- If DDEV is active, all tools (PHP, Composer, Node) are executed **inside the container**.
- If the DDEV container is not running, the hooks will fail with a helpful message.
- DDEV detection is cached for performance (avoids repeated filesystem checks).

## Environment Variables

You can control the behavior of the hooks using environment variables. These can be set in your shell or in a `.env` file.

Note: tool-specific skip variables are normalized to uppercase and non-alphanumeric characters are replaced with underscores. For example, a tool named `PHP Syntax Check` becomes `SKIP_PHP_SYNTAX_CHECK` and `api docs` becomes `SKIP_API_DOCS`.

| Variable            | Description                                                               |
| ------------------- | ------------------------------------------------------------------------- |
| `GIT_HOOKS_VERBOSE` | Set to `1` or `true` to enable verbose logging (shows executed commands). |
| `DDEV_PHP`          | Set to `false` or `0` to force running PHP tools on the host system even if DDEV is detected. |
| `SKIP_PRECOMMIT`    | Set to `1` to skip the entire pre-commit hook.                            |
| `SKIP_PREPUSH`      | Set to `1` to skip the entire pre-push hook.                              |
| `SKIP_COMMITMSG`    | Set to `1` to skip commit message validation and ticket appending.        |
| `SKIP_PHPUNIT`      | Set to `1` to skip tests in the pre-push hook.                            |
| `SKIP_API_DOCS`     | Set to `1` to skip API documentation generation in the pre-push hook.     |
| `SKIP_ESLINT`       | Set to `1` to skip ESLint.                                                |
| `SKIP_PRETTIER`     | Set to `1` to skip Prettier.                                              |
| `SKIP_STYLELINT`    | Set to `1` to skip Stylelint.                                             |
| `SKIP_RECTOR`       | Set to `1` to skip Rector.                                                |
| `SKIP_ECS`          | Set to `1` to skip EasyCodingStandard.                                    |
| `SKIP_PHPSTAN`      | Set to `1` to skip PHPStan.                                               |
| `SKIP_PSALM`        | Set to `1` to skip Psalm.                                                 |
| `SKIP_DEPTRAC`      | Set to `1` to skip Deptrac (if enabled).                                  |

## How it Works

1. **Trigger**: Git triggers the `pre-commit` shell script.
2. **Execution**: The shell script runs `pre-commit.ts` using `zx`.
3. **Workflow**:
   - The script initializes the environment.
   - It checks if the hook should be skipped (e.g., during a merge or via env var).
   - It retrieves the list of staged files.
   - It iterates through the configured tools in `tools.ts`.
4. **Tool Execution**:
   - For each tool, it checks if the binary exists.
   - It filters the staged files based on the tool's `extensions`.
   - It runs the tool command with the filtered files.
   - If the tool modifies files (and `stagesFilesAfter` is true), it re-stages them.
5. **Result**: If any tool fails, the commit is aborted (unless the tool is not required).
