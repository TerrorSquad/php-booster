#!/usr/bin/env zx

/**
 * Pre-commit hook - ZX TypeScript implementation
 *
 * Runs quality tools on staged files:
 * - PHP: Syntax Check, Rector, ECS, PHPStan, Psalm, Deptrac
 * - JS/TS: ESLint, Prettier, Stylelint
 *
 * Environment Variables:
 * - SKIP_PRECOMMIT=1: Skip the entire pre-commit hook
 * - GIT_HOOKS_VERBOSE=1: Enable verbose output for debugging
 * - SKIP_<TOOL_NAME>=1: Skip specific tool (e.g. SKIP_RECTOR, SKIP_ESLINT)
 *
 * Configuration File (.git-hooks.config.json):
 * - Disable tools, override arguments, or add custom tools
 */
import {
  applyConfigOverrides,
  getStagedFiles,
  GitHook,
  loadConfig,
  log,
  runHook,
  runQualityChecks,
} from './shared/index.ts'
import { TOOLS } from './shared/tools.ts'

await runHook(GitHook.PreCommit, async () => {
  const files = await getStagedFiles()

  if (files.length === 0) {
    log.info('No files staged for commit. Skipping quality checks.')
    return true
  }

  log.info(`Found ${files.length} staged file(s): ${files.join(', ')}`)

  // Load config and apply overrides to tools
  const config = await loadConfig()
  const tools = applyConfigOverrides(TOOLS, config)

  const success = await runQualityChecks(files, tools)

  return success
})
