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
**Status:** NOT STARTED

**Problem:** List of files to copy is hardcoded in `booster/src/lib/files.sh`.

**Solution:**
- Extract file lists into `booster/manifest.json`
- Update shell scripts to read from manifest
- Add validation to ensure all files in manifest exist

**Benefits:**
- Easier to maintain and update file lists
- No need to modify shell scripts when adding new config files
- Better separation of concerns

**Tasks:**
- [ ] Create `booster/manifest.json` with file lists
- [ ] Update `booster/src/lib/files.sh` to use manifest
- [ ] Add validation in build script

---

## #3: Dedicated Test Fixtures Repository
**Status:** NOT STARTED

**Problem:** `tests/` directory generates frameworks on demand, making CI slow and flaky.

**Solution:**
- Create `php-booster-test-fixtures` repository with pre-installed frameworks
- Update CI to clone/pull fixtures instead of running `composer create-project`
- Consider Docker images for isolated test environments

**Benefits:**
- Faster CI/CD pipelines
- More reliable tests (less network dependency)
- Consistent test environments

**Tasks:**
- [ ] Create test-fixtures repository structure
- [ ] Update integration tests to use fixtures
- [ ] Update CI workflow

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
