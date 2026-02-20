# Git Hooks Configuration

This project uses [Husky](https://typicode.github.io/husky/) combined with [Google's zx](https://github.com/google/zx) to run TypeScript-based Git hooks. This setup allows for a robust, cross-platform, and easily maintainable hook system.

## Structure

The `.husky` directory contains the following:

- **`commit-msg`**: Shell script entry point for the commit-msg hook.
- **`commit-msg.ts`**: TypeScript logic for commit message validation and ticket appending.
- **`pre-commit`**: Shell script entry point for the pre-commit hook.
- **`pre-commit.ts`**: TypeScript logic for the pre-commit hook (linters, static analysis).
- **`pre-push`**: Shell script entry point for the pre-push hook.
- **`pre-push.ts`**: TypeScript logic for the pre-push hook (tests, artifact generation).
- **`shared/`**: A library of shared utilities and configurations.
  - **`index.ts`**: Barrel export — re-exports everything from the other shared modules.
  - **`runner.sh`**: Generic runner script that handles DDEV container detection and command execution.
  - **`tools.ts`**: Centralized configuration for all quality tools (JS & PHP).
  - **`types.ts`**: TypeScript definitions for the system (`ToolConfig`, `HooksConfig`, etc.).
  - **`workflow.ts`**: The core execution engine that runs tools, handles errors, and manages output.
  - **`config.ts`**: Loads and merges `.git-hooks.config.json` overrides into the tool list.
  - **`core.ts`**: Low-level utilities — logging, `exec`, DDEV detection, environment loading.
  - **`git.ts`**: Git-specific operations (staging files, branch name, merge detection).
  - **`extras.ts`**: Artifact generation helpers — `generateDeptracImage` and `generateApiDocs`.

## Adding or Configuring Tools

The system is designed to be data-driven. You do not need to write complex scripts to add a new tool. All default tool configurations are located in `.husky/shared/tools.ts`.

To add a new tool, add a `ToolConfig` object to the `TOOLS` array. To override or disable an existing tool without editing shared code, use `.git-hooks.config.json` (see below).

### Configuration Object (`ToolConfig`)

| Property               | Type                                   | Description                                                                                      |
| ---------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `name`                 | `string`                               | Display name of the tool (used in logs and skip-variable derivation).                            |
| `command`              | `string`                               | The binary command to run (e.g., `eslint`, `rector`).                                            |
| `commandAlternatives`  | `string[]`                             | (Optional) Fallback commands tried in order if `command` is not found (e.g., `['psalm.phar']`). |
| `type`                 | `'node' \| 'php' \| 'system'`          | Where to resolve the binary: `node_modules/.bin`, `vendor/bin`, or system `PATH`.                |
| `args`                 | `string[]`                             | (Optional) Arguments to pass to the command.                                                     |
| `extensions`           | `string[]`                             | (Optional) Only run on files with these extensions.                                              |
| `stagesFilesAfter`     | `boolean`                              | (Optional) If `true`, re-stages files after execution (useful for auto-fixers).                  |
| `passFiles`            | `boolean`                              | (Optional) If `false`, does not pass staged files to the command. Default is `true`.             |
| `runForEachFile`       | `boolean`                              | (Optional) If `true`, runs the command once per file instead of passing all files at once.       |
| `description`          | `string`                               | (Optional) Custom log message shown while the tool is running.                                   |
| `onFailure`            | `'continue' \| 'stop'`                 | (Optional) What happens when this tool fails. Default is `'continue'`. Use `'stop'` for syntax checks that must pass before other tools run. |
| `group`                | `'format' \| 'lint' \| 'analysis' \| 'refactor'` | (Optional) Tool category for selective execution via `HOOKS_ONLY`.              |

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

## Per-Project Configuration (`.git-hooks.config.json`)

Create a `.git-hooks.config.json` file (or `.githooks.json`) in the project root to customize hook behavior without editing shared code. The config is loaded automatically and cached for the duration of the hook run. The path can also be set via `GIT_HOOKS_CONFIG`.

```json
{
  "$schema": "https://raw.githubusercontent.com/TerrorSquad/php-booster/main/booster/.git-hooks.config.schema.json",
  "verbose": false,
  "skip": {
    "preCommit": false,
    "prePush": false,
    "commitMsg": false,
    "tests": false,
    "artifacts": false
  },
  "tools": {
    "PHPStan": {
      "args": ["analyse", "--level=5"]
    },
    "Psalm": {
      "enabled": false
    },
    "My Custom Tool": {
      "command": "my-tool",
      "args": ["--fix"],
      "type": "node",
      "extensions": [".ts"]
    }
  }
}
```

### Config File Schema

| Field              | Type      | Description                                                                    |
| ------------------ | --------- | ------------------------------------------------------------------------------ |
| `verbose`          | `boolean` | Enable verbose logging (same as `GIT_HOOKS_VERBOSE=1`).                        |
| `skip.preCommit`   | `boolean` | Skip the entire pre-commit hook.                                               |
| `skip.prePush`     | `boolean` | Skip the entire pre-push hook.                                                 |
| `skip.commitMsg`   | `boolean` | Skip the entire commit-msg hook.                                               |
| `skip.tests`       | `boolean` | Skip tests in pre-push (Pest).                                                 |
| `skip.artifacts`   | `boolean` | Skip artifact generation in pre-push (Deptrac image, API docs).                |
| `tools.<Name>`     | `object`  | Override properties of an existing tool, or define a new custom tool by name.  |
| `tools.<Name>.enabled` | `boolean` | Set to `false` to disable a tool entirely.                                 |

## Selective Execution (`HOOKS_ONLY`)

Use the `HOOKS_ONLY` environment variable to run only specific tool groups during a commit. Groups are comma-separated and case-insensitive.

```bash
HOOKS_ONLY=lint,format git commit -m "fix: quick check"
```

Available groups (defined per tool in `tools.ts`):

| Group      | Tools                                           |
| ---------- | ----------------------------------------------- |
| `format`   | Prettier, ECS                                   |
| `lint`     | ESLint, Stylelint, PHP Syntax Check, TypeScript |
| `analysis` | PHPStan, Psalm, Deptrac                         |
| `refactor` | Rector                                          |

Tools that have no `group` assigned are always run regardless of `HOOKS_ONLY`.

## Hook Specifics

### `pre-commit`

Runs quality tools (linters, static analysis) on staged files sequentially.

- **Caching**: ESLint and Prettier use caching to speed up repeated runs.
- **Auto-fix**: Tools like ESLint, Prettier, Rector, and ECS will automatically fix issues and re-stage the changes.
- **Syntax gate**: PHP Syntax Check runs with `onFailure: 'stop'` — if it fails, remaining PHP tools are skipped.
- **TypeScript**: `tsc --noEmit` runs only when a `tsconfig.json` is present.

### `commit-msg`

Enforces commit message standards and branch naming in three sequential steps:

1. **Branch validation**: Validates the branch name against `validate-branch-name.config.cjs`.
2. **Commit linting**: Validates the commit message format against Conventional Commits via `commitlint`.
3. **Ticket footer**: Automatically appends the ticket ID footer (e.g., `Closes: PRJ-123`) to the commit message body if a ticket ID is found in the branch name and `requireTickets` is enabled in the branch config.

### `pre-push`

Runs checks before pushing. Tests are **blocking**; artifact generation is **informational only** and does not block the push.

- **Tests**: Runs `composer test:pest` if `vendor/bin/pest` is installed. Skippable via `skip.tests: true` in config.
- **Deptrac Image**: Generates a `deptrac.png` dependency graph if Deptrac is installed. Does not auto-commit the result.
- **API Documentation**: Regenerates `openapi/openapi.yml` and the HTML doc if swagger-php is installed and the spec has changed. Does not auto-commit the result. A warning is shown if the spec changed.

## DDEV Integration

The hooks are designed to work seamlessly with DDEV.

- The `shared/runner.sh` script automatically detects if the project is running in DDEV.
- If DDEV is active, all tools (PHP, Composer, Node) are executed **inside the container**.
- If the DDEV container is not running, the hooks will fail with a helpful message.
- DDEV detection is cached for performance (avoids repeated filesystem checks).
- Set `DDEV_PHP=false` (or `0`) to force PHP tools to run on the host even when DDEV is detected.

## Environment Variables

You can control hook behavior with environment variables. These can be set in your shell, in a `.env` file, or in a `.git-hooks.env` file (checked first). A custom env file path can be provided via `GIT_HOOKS_ENV_FILE`.

> **Note:** Tool-specific skip variables are derived by uppercasing the tool name and replacing non-alphanumeric characters with underscores. For example, `PHP Syntax Check` → `SKIP_PHP_SYNTAX_CHECK`.

### General

| Variable              | Description                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `GIT_HOOKS_VERBOSE`   | Set to `1` or `true` to enable verbose logging (shows executed commands).                       |
| `GIT_HOOKS_ENV_FILE`  | Path to a custom env file to load at hook startup (overrides `.git-hooks.env` / `.env`).        |
| `GIT_HOOKS_CONFIG`    | Path to a custom config file (overrides the default `.git-hooks.config.json` lookup).           |
| `HOOKS_ONLY`          | Comma-separated list of tool groups to run (e.g., `lint,format`). Skips all other groups.       |
| `DDEV_PHP`            | Set to `false` or `0` to force PHP tools to run on the host even if DDEV is detected.          |

### Hook-level skips

| Variable          | Description                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| `SKIP_PRECOMMIT`  | Set to `1` to skip the entire pre-commit hook.                           |
| `SKIP_PREPUSH`    | Set to `1` to skip the entire pre-push hook.                             |
| `SKIP_COMMITMSG`  | Set to `1` to skip commit message validation and ticket appending.       |

### Tool-level skips (pre-commit)

| Variable                | Description                                                    |
| ----------------------- | -------------------------------------------------------------- |
| `SKIP_ESLINT`           | Set to `1` to skip ESLint.                                     |
| `SKIP_PRETTIER`         | Set to `1` to skip Prettier.                                   |
| `SKIP_STYLELINT`        | Set to `1` to skip Stylelint.                                  |
| `SKIP_TYPESCRIPT`       | Set to `1` to skip TypeScript type-checking.                   |
| `SKIP_RECTOR`           | Set to `1` to skip Rector.                                     |
| `SKIP_ECS`              | Set to `1` to skip EasyCodingStandard.                         |
| `SKIP_PHP_SYNTAX_CHECK` | Set to `1` to skip the PHP syntax check.                       |
| `SKIP_PHPSTAN`          | Set to `1` to skip PHPStan.                                    |
| `SKIP_PSALM`            | Set to `1` to skip Psalm.                                      |
| `SKIP_DEPTRAC`          | Set to `1` to skip Deptrac static analysis.                    |

### Artifact skips (pre-push)

| Variable              | Description                                                          |
| --------------------- | -------------------------------------------------------------------- |
| `SKIP_DEPTRAC_IMAGE`  | Set to `1` to skip Deptrac architecture diagram generation.          |
| `SKIP_API_DOCS`       | Set to `1` to skip API documentation generation.                     |

## How it Works

1. **Trigger**: Git triggers the `pre-commit` shell script.
2. **Execution**: The shell script invokes `pre-commit.ts` via `zx` (through `shared/runner.sh`).
3. **Environment**: The hook loads env vars from `.git-hooks.env`, `.env`, or `GIT_HOOKS_ENV_FILE` if present.
4. **Workflow**:
   - Checks if the hook should be skipped (merges, env var, or config file).
   - Retrieves the list of staged files.
   - Loads `.git-hooks.config.json` and applies tool overrides.
   - Iterates through the configured tools sequentially.
5. **Tool Execution**:
   - Checks if the binary exists (falling back to `commandAlternatives` if configured).
   - Filters staged files based on the tool's `extensions`.
   - Runs the tool command with the filtered files (or per-file if `runForEachFile` is set).
   - Re-stages files if the tool modified them and `stagesFilesAfter` is `true`.
6. **Result**: If any tool fails, the commit is aborted. Tools with `onFailure: 'stop'` immediately halt further tool execution.
