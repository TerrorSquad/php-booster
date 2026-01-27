# GitHub Copilot Repository Instructions

These instructions help Copilot produce answers and code that align with this repository's goals and established tooling. They describe what this repo is, how it should be used, and the conventions that must be respected.

---
## 1. Purpose of This Repository
This is a **PHP Booster**: an integration layer that injects a curated quality/tooling stack into an **existing** PHP project. It is **not** a project scaffolder.

Primary goals:
- Add consistent code quality tooling (ECS, Rector, PHPStan, Psalm, SonarQube).
- Enforce branch naming + commit message conventions (Conventional Commits + ticket IDs when configured).
- Provide Git hooks (commitlint, branch validation, ticket footer appending).
- Supply IDE/editor settings, OpenAPI starter, and documentation.
- Remain **idempotent**: re-running integration shouldn't break or duplicate config.

---
## 2. Integration Script Expectations
Integration occurs via `booster/integrate_booster.sh` (fetched remotely in consumer projects).

**CRITICAL**: `booster/integrate_booster.sh` is a **generated artifact**.
- **DO NOT** edit `booster/integrate_booster.sh` directly.
- Edit the source files in `booster/src/` (e.g., `main.sh`, `lib/*.sh`).
- Run `make build` (or `booster/build.sh`) to regenerate the script.

The script:
- Detects DDEV vs standard environment.
- Clones booster, merges composer + package.json scripts.
- Adds missing dependencies only (checks installed state).
- Dynamically updates tool config paths based on actual PHP directories.
- Optionally updates DDEV config, nginx, Xdebug trigger.

Copilot SHOULD:
- Prefer invoking or referencing existing scripts instead of reinventing logic.
- Avoid suggesting manual edits duplicated by the integration script unless explicitly required.
- Always remind the user to run `make build` after modifying `booster/src/` files.

---
## 3. Tooling Overview & Preferred Invocations
If inside a DDEV project, prefix composer commands with `ddev`. Otherwise call `composer` directly.

**Package Manager**: In the `docs` directory use `bun` instead of `pnpm` or `npm` for Node.js dependencies.

| Task | Preferred Script / Command |
|------|----------------------------|
| Code formatting (check+fix) | `composer ecs` (or `ddev composer ecs`) |
| Rector refactoring | `composer rector` |
| PHPStan analysis | `composer phpstan` |
| Psalm analysis | `composer psalm` |
| Run all static checks (if aggregated) | Suggest existing combined script if present (inspect composer.json) |
| Commit message lint | Git hook (do not manually run unless needed) |
| Branch validation | `validate-branch-name` via hook or `node_modules/.bin/validate-branch-name -t <branch>` |
| OpenAPI editing | Modify `openapi/openapi.yml` (do not generate large boilerplate) |

Copilot SHOULD NOT generate raw php-cs-fixer, phpstan, rector, or psalm command lines if a composer script already exists.

---
## 4. Branch & Commit Conventions
- Branch names must satisfy `validate-branch-name.config.cjs` (pattern uses ticket prefix + number when configured).
- Ticket footer is auto-appended if required: `Closes: TICKET-ID` (label may be overridden via config but defaults to `Closes`).
- Commit messages follow **Conventional Commits** (`feat:`, `fix:`, `chore:`, etc.).
- Copilot SHOULD propose commit messages in that format and **include scope** only if meaningful.
- Do NOT fabricate ticket IDs; if none supplied in branch name and config requires it, surface a reminder.

---
## 5. Git Hooks Architecture
- Native ZX implementation: All git hooks use Google ZX for secure, cross-platform execution.
- Common library: `.husky/shared/index.ts` provides shared functionality and colored logging.
- `commit-msg` hook validates branch, lints message, appends footer if needed - all functionality integrated natively.
- Copilot SHOULD reference the ZX-based hook system and shared utilities instead of legacy scripts.

---
## 6. Configuration Files (Do Not Duplicate)
| File | Purpose |
|------|---------|
| `ecs.php` | Coding standards & formatting rules |
| `rector.php` | Automated refactoring/upgrade sets |
| `phpstan.neon.dist` | Static analysis config |
| `psalm.xml` | Static analysis (Psalm) config |
| `sonar-project.properties` | SonarQube settings |
| `.editorconfig` | Base editor formatting |
| `.vscode/` & `.phpstorm/` | Editor recommendations |
| `openapi/openapi.yml` | API spec seed |

Copilot SHOULD reference or extend these—NOT generate new parallel config files with different names.

---
## 7. Idempotency & Safe Patterns
When suggesting changes to integration behavior:
- Favor additive merges (e.g., adjust JSON via `jq` style logic) rather than overwriting whole files.
- Recognize that some scripts already handle merging; do not duplicate `merge_scripts` logic.
- Avoid assumptions about directory names; script discovers actual PHP directories dynamically.

---
## 8. DDEV vs Non-DDEV Context
- If `.ddev/` exists: use `ddev composer` & respect DDEV-specific paths and config merging.
- If not: plain `composer`.
- Do not hardcode environment-specific absolute paths.

---
## 9. Performance & Safety Guidance for Suggestions
Copilot SHOULD:
- **ALWAYS run `pwd` before executing any shell command** to verify the current working directory.
- Prefer minimal examples (focus on demonstrating integration with existing tooling).
- Avoid generating large boilerplate (framework scaffolds, duplicate OpenAPI spec sections, huge sample controllers).
- Encourage running existing scripts instead of custom shell loops.
- Suggest adding tests or dry-run modes (future enhancements) rather than embedding heavy inline logic.

Copilot SHOULD NOT:
- Assume the current directory is the project root.
- Suggest deleting or renaming core config files.
- Add alternative linters/formatters that conflict (e.g., php-cs-fixer config when ECS already used) without explicit request.
- Introduce global stateful curl|bash patterns; prefer pinned actions or documented steps.

---
## 10. Style & Code Guidelines
- PHP: Modern syntax (typed properties, promoted ctor params, nullsafe operator, short array syntax). Avoid deprecated patterns.
- Keep examples concise; show only relevant diff or function body.
- Use strict typing where possible (`declare(strict_types=1);`).
- Respect existing namespace + folder structure (do not assume PSR namespace path if not shown).

---
## 11. Documentation Tone
- Neutral, concise, action-oriented.
- Emphasize usage over installation (installation automated by booster script).

---
## 12. Future-Friendly Suggestions (Allowed if asked)
If user asks about improvements, Copilot may propose:
- Dry-run mode for integration script.
- Version stamp file for upgrade tracking (e.g., `.php-booster-version`).
- Test harness for hooks (use `tools/internal-test/test-integration.py`).

---
## 13. Quick Reference Snippets
Check current branch and validation:
```
git rev-parse --abbrev-ref HEAD
```
Validate branch manually:
```
./node_modules/.bin/validate-branch-name -t "$(git rev-parse --abbrev-ref HEAD)"
```
Run all analyzers (example if combined script exists, otherwise run individually):
```
composer phpstan && composer psalm && composer ecs
```

---
## 14. When In Doubt
- Prefer existing scripts.
- Keep changes minimal & merge-aware.
- Ask for clarification only if a requested action would break idempotency or established conventions.

---
## 15. Testing & Verification
The repository includes a Python-based integration test suite in `tools/internal-test/`.

| Task | Command |
|------|---------|
| Run full Laravel test | `make test` (or `make test-laravel`) |
| Run full Symfony test | `make test-symfony` |
| Test Git hooks only | `make test-hooks` |
| Clean test environments | `make test-clean` |

Copilot SHOULD:
- Suggest running these tests when modifying the integration logic.
- Reference `tools/internal-test/test-integration.py` for test logic.

---
## 16. Documentation Site (`docs/`)
The documentation is a **Nuxt 3** application using the **Docus** theme.
- Content is in `docs/content/`.
- Run `npm run dev` (or `pnpm dev`) inside `docs/` to preview.

---
End of repository-specific Copilot instructions.
