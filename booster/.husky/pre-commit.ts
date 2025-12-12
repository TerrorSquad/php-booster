#!/usr/bin/env zx

/**
 * Pre-commit hook - ZX TypeScript implementation for JS/TS projects
 *
 * Runs JS quality tools on staged files:
 * - ESLint (auto-fixes)
 * - Prettier (auto-fixes)
 * - Stylelint (auto-fixes)
 *
 * Environment Variables:
 * - SKIP_PRECOMMIT=1: Skip the entire pre-commit hook
 * - GIT_HOOKS_VERBOSE=1: Enable verbose output for debugging
 * - SKIP_ESLINT=1: Skip ESLint
 * - SKIP_PRETTIER=1: Skip Prettier
 * - SKIP_STYLELINT=1: Skip Stylelint
 */
import { generateDeptracImage, getStagedFiles, GitHook, log, runHook, runQualityTools } from './shared/index.ts'
import { TOOLS } from './shared/tools.ts'

await runHook(GitHook.PreCommit, async () => {
  const files = await getStagedFiles()

  if (files.length === 0) {
    log.info('No files staged for commit. Skipping quality checks.')
    process.exit(0)
  }

  log.info(`Found ${files.length} staged file(s): ${files.join(', ')}`)

  const success = await runQualityTools(files, TOOLS)

  // Optional: Generate Deptrac image
  await generateDeptracImage()

  return success
})
