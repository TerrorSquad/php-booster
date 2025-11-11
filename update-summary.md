## 📦 Dependency Updates

This PR updates booster dependencies to their latest versions.

### Package Manager
- Updated pnpm to `10.21.0`

### PHP Packages (composer.json)
```
```

### NPM Packages (package.json)
Updated to latest versions. See `package.json` for details.

### Files Changed
- `booster/.ddev/config.yaml` (Node.js version)
- `booster/package.json` (pnpm, @types/node, devDependencies)
- `booster/pnpm-lock.yaml` (NPM lockfile)
- `booster/composer.json` (PHP package versions)

### ⚠️ Important Notes
- `composer.lock` is NOT updated in this PR
- Run `composer update` locally or in DDEV to update lockfile
- This ensures you can test updates before committing lockfile changes

### Testing
Please verify:
- [ ] Run `ddev composer update` to update lockfile
- [ ] All git hooks function correctly
- [ ] PHP quality tools (Rector, PHPStan, ECS, Psalm) work as expected
- [ ] Integration tests pass
- [ ] DDEV environment starts without issues
