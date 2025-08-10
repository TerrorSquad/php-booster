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
Integration occurs via `booster/integrate_booster.sh` (fetched remotely in consumer projects). The script:
- Detects DDEV vs standard environment.
- Clones booster, merges composer + package.json scripts.
- Adds missing dependencies only (checks installed state).
- Dynamically updates tool config paths based on actual PHP directories.
- Optionally updates DDEV config, nginx, Xdebug trigger.

Copilot SHOULD:
- Prefer invoking or referencing existing scripts instead of reinventing logic.
- Avoid suggesting manual edits duplicated by the integration script unless explicitly required.

---
## 3. Tooling Overview & Preferred Invocations
If inside a DDEV project, prefix composer commands with `ddev`. Otherwise call `composer` directly.

| Task | Preferred Script / Command |
|------|----------------------------|
| Code formatting (check+fix) | `composer ecs` (or `ddev composer ecs`) |
| Rector refactoring | `composer rector` |
| PHPStan analysis | `composer phpstan` |
| Psalm analysis | `composer psalm` |
| Run all static checks (if aggregated) | Suggest existing combined script if present (inspect composer.json) |
| Commit message lint | Git hook (do not manually run unless needed) |
| Branch validation | `validate-branch-name` via hook or `node_modules/.bin/validate-branch-name -t <branch>` |
| OpenAPI editing | Modify `documentation/openapi.yml` (do not generate large boilerplate) |

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
- Unified helper: `tools/commit-utils.js` handles: `--need-ticket`, `--footer-label`, `--extract-ticket`.
- `commit-msg` hook validates branch, lints message, appends footer if needed.
- Copilot SHOULD reference `commit-utils.js` instead of legacy scripts (`commit-msg-config.js`, `extract-ticket-id.js` were removed).

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
| `documentation/openapi.yml` | API spec seed |

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
- Prefer minimal examples (focus on demonstrating integration with existing tooling).
- Avoid generating large boilerplate (framework scaffolds, duplicate OpenAPI spec sections, huge sample controllers).
- Encourage running existing scripts instead of custom shell loops.
- Suggest adding tests or dry-run modes (future enhancements) rather than embedding heavy inline logic.

Copilot SHOULD NOT:
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
- Test harness for hooks (use `tools/internal/hooks-test.sh`).

---
## 13. Quick Reference Snippets
Check ticket requirement:
```
node tools/commit-utils.js --need-ticket
```
Extract ticket from current branch:
```
node tools/commit-utils.js --extract-ticket "$(git rev-parse --abbrev-ref HEAD)"
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
End of repository-specific Copilot instructions.
