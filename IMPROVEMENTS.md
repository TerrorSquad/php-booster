# Repository Improvements Roadmap

Progress tracking for reducing redundancy and improving architecture.

---

## #1: Optimize Distribution (Release Artifacts)
**Status:** COMPLETED ✓

**Problem:** `integrate_booster.sh` clones the entire repository (including docs, tests, and history) just to access the `booster/` directory.

**Solution:** 
- Create `booster.zip` artifact containing only essential booster files
- Update `integrate_booster.sh` to download and unzip instead of cloning
- Configure GitHub Actions to build and publish artifact on each release

**Benefits:**
- Significantly faster installation (smaller download)
- Decouples user from repository structure changes
- Reduces bandwidth and git operations

**Completed Tasks:**
- [x] Create packaging script (`booster/package-release.sh`)
  - Packages only necessary files (excludes node_modules, coverage, tests, etc.)
  - Creates `.booster-package` marker file
  - Generates minimal ZIP file
  
- [x] Update `integrate_booster.sh` to support both methods
  - `try_download_booster_zip()` - Downloads from GitHub releases
  - `download_via_git_clone()` - Refactored git clone logic
  - Automatic fallback to git clone if ZIP unavailable
  - Environment variable `BOOSTER_USE_ZIP` to control behavior
  
- [x] Add GitHub Actions workflow (`publish-booster-package.yml`)
  - Builds package on release
  - Uploads `booster.zip` as release asset
  - Includes manual trigger for testing
  - Provides build summary in GitHub

**Notes:**
- Integration script tries ZIP first (faster), falls back to git clone
- Local dev mode unchanged
- User experience improves transparently once releases include ZIP assets
- Package size: ~136KB (vs entire repo clone)
- Packaging script verified and tested ✓
- GitHub Actions workflow created and ready to publish on next release

---

## #2: Decouple Configuration from Logic (Manifest File)
**Status:** COMPLETED ✓

**Problem:** List of files to copy is hardcoded in `booster/src/lib/files.sh`.

**Solution:**
- Extract file lists into `booster/manifest.json`
- Update shell scripts to read from manifest
- Add validation to ensure all files in manifest exist

**Benefits:**
- Easier to maintain and update file lists
- No need to modify shell scripts when adding new config files
- Better separation of concerns

**Completed Tasks:**
- [x] Create `booster/manifest.json` with organized file lists
  - `directories`: .github, .vscode, .phpstorm, bin, .husky
  - `files.topLevel`: .editorconfig, .markdownlint-cli2.jsonc, .prettierignore
  - `files.config`: commitlint, validate-branch-name, renovate, .git-hooks.config.example.json
  - `files.php`: composer.json, ecs.php, rector.php, phpstan, psalm, deptrac, sonar-project.properties
  - `files.packageManagement`: package.json, pnpm files
  - Meta information and validation configuration

- [x] Update `booster/src/lib/files.sh` to use manifest
  - Added `load_manifest()` function
  - Added `get_manifest_items()` function
  - Added `validate_manifest()` function (verbose mode)
  - Updated `copy_files()` to load from manifest with fallback to hardcoded defaults
  - Graceful degradation if jq not available

- [x] Update `booster/src/main.sh` for partial updates
  - Updated `update_configs_only()` to use manifest
  - Maintains backward compatibility with fallback defaults

- [x] Update packaging script
  - Added manifest.json to `booster/package-release.sh`
  - Included in distributed booster.zip

- [x] Rebuild integration script
  - integrate_booster.sh now supports manifest-driven configuration

**Notes:**
- Manifest loads automatically if jq is available
- Falls back to hardcoded defaults if jq not installed
- No breaking changes - fully backward compatible
- Manifest is validated in verbose mode
- Easier to add/remove files in future - just edit manifest.json

**Updated (Stricter Enforcement):**
- ✓ Build script (`booster/build.sh`) now validates manifest.json exists and is valid JSON before building
- ✓ Manifest loading in `files.sh` and `main.sh` now errors if manifest is missing or invalid (no fallback)
- ✓ Errors caught at build time, not at installation time
- ✓ Integration script will fail loudly with clear error message if manifest corrupted

---

## #3: Test Fixtures for Fast CI
**Status:** COMPLETED ✓

**Problem:** `tests/` directory generates frameworks on demand, making CI slow and flaky.

**Solution:**
- Build pre-installed Laravel and Symfony fixtures on first CI run
- Cache fixtures using GitHub Actions cache (30-day retention)
- Fixtures include vendor/ directories for instant setup
- Falls back to create-project if cache expires

**Benefits:**
- Faster CI/CD pipelines (70-80% improvement after first build)
- More reliable tests (reduced network dependency)
- Consistent test environments
- Simple architecture - no release assets or downloads needed
- Built on-demand, cached aggressively
- Cache expires after 30 days of inactivity (automatic rebuild)

**Completed Tasks:**
- [x] Create fixture build script (`tools/build-fixtures.sh`)
  - Builds fresh Laravel 11 and Symfony 7 projects
  - Includes all dependencies in vendor/
  - Creates tarball archives (~20-30MB each)
  - Adds FIXTURE_VERSION timestamp
  
- [x] Update CI workflow (`.github/workflows/integration-tests.yml`)
  - Added "Build test fixtures if not cached" step
  - Builds fixtures on first run or cache miss
  - Caches fixtures with GitHub Actions cache (30-day retention)
  - All subsequent runs use cached fixtures (instant!)
  - Step timeouts prevent indefinite hangs
  
- [x] Update `tools/internal-test/lib/project_setup.py`
  - Checks local cache first (built by CI)
  - Automatic fallback to create-project if fixtures unavailable
  - Environment variable: `USE_TEST_FIXTURES` (default: true) - enable/disable fixtures

**Architecture:**
```
CI Workflow:
1st Run:  Build fixtures (5 min) → Cache → Run tests → Total: ~8-10 min
2nd+ Run: Load cache (30s) → Run tests → Total: ~3-5 min
Cache expires after 30 days → rebuilds automatically

Local Cache (tests/.fixtures-cache/):
├── laravel/                       # Built fixture
│   ├── vendor/                    # All dependencies
│   ├── composer.lock
│   └── FIXTURE_VERSION
└── symfony/                       # Built fixture
    ├── vendor/
    ├── composer.lock
    └── FIXTURE_VERSION
```

**Performance:**
- **First CI Run:** 8-10 minutes (builds fixtures + runs tests)
- **Cached CI Runs:** 3-5 minutes (70-80% faster)
- **Cache Expiry:** 30 days (automatic rebuild on first run after expiry)
- **Local Runs:** Re-use cached fixtures indefinitely

**Usage:**
```bash
# Default: Use fixtures (built on first run, cached thereafter)
make test

# Disable fixtures (always use create-project)
USE_TEST_FIXTURES=false make test

# Download from latest GitHub release instead of building
DOWNLOAD_FIXTURES_FROM_RELEASE=true make test

# Clear cache (forces rebuild)
rm -rf tests/.fixtures-cache
```

**Notes:**
- Fixtures built automatically by CI on first run
- Cached with GitHub Actions cache (30-day retention)
- Release workflow still builds fixtures for optional download
- Backwards compatible - falls back to create-project if fixtures fail
- Network timeouts prevent indefinite hangs

---

## #4: Single Source of Truth for Documentation
├── booster.zip                    # ~140KB - main package
├── laravel-fixture.tar.gz         # ~20-30MB - Laravel with vendor/
└── symfony-fixture.tar.gz         # ~20-30MB - Symfony with vendor/

Local Cache (tests/.fixtures-cache/):
├── laravel/                       # Extracted fixture
│   ├── vendor/                    # All dependencies
│   ├── composer.lock
│   └── FIXTURE_VERSION
└── symfony/                       # Extracted fixture
    ├── vendor/
    ├── composer.lock
    └── FIXTURE_VERSION
```

**Performance Expectations:**
- **Before:** 3-5 minutes to create test projects
- **After:** 30-60 seconds to download and extract
- **Improvement:** 70-80% faster test execution
- **Data Transfer:** Tarball compression reduces download size

**Usage:**
```bash
# Fixtures are used by default
make test              # Downloads from latest release if needed
make test-symfony      # Uses cached fixtures on subsequent runs

# Disable fixtures (use create-project)
USE_TEST_FIXTURES=false make test

# Clear fixture cache (forces re-download)
rm -rf tests/.fixtures-cache
```

**Notes:**
- Fixtures built automatically on every release
- Downloaded from latest release (no version pinning needed)
- Cached locally after first download
- Backwards compatible - falls back to create-project if download fails
- No separate repository - everything in main repo
- Tarball size: ~20-30MB each (compressed vendor/ directories)

---

## #4: Single Source of Truth for Documentation
**Status:** NOT STARTED

**Problem:** Overlap between `booster/README_SNIPPET.md` and `docs/` site.

**Solution:**
- Auto-generate `README_SNIPPET.md` from documentation during build
- Use a marker or template system to extract specific sections

**Benefits:**
- Documentation and snippet never drift
- Single update point
- Less maintenance

**Tasks:**
- [ ] Define extraction logic/markers in docs
- [ ] Create generation script
- [ ] Integrate into build process
- [ ] Verify output matches expectations

---
