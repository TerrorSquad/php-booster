#!/usr/bin/env zx

/**
 * Pre-push hook - ZX TypeScript implementation
 *
 * Runs checks before pushing:
 * - Deptrac (Architecture check)
 * - PHPUnit (Tests)
 * - API Documentation generation
 */
import { $, fs } from 'zx'
import {
  GitHook,
  isSkipped,
  log,
  runHook,
  runWithRunner,
  generateApiDocs,
  generateDeptracImage,
} from './shared/index.ts'

const SKIP_COMMIT_MSG = 'chore: update API documentation'
const SKIP_DEPTRAC_MSG = 'chore: update deptrac image'

async function shouldSkip(): Promise<boolean> {
  const lastCommitMsg = (await $`git log -1 --pretty=%B`).stdout.trim()
  if (lastCommitMsg.includes(SKIP_COMMIT_MSG) || lastCommitMsg.includes(SKIP_DEPTRAC_MSG)) {
    log.info('Skipping pre-push hook for auto-generated commit.')
    return true
  }
  return false
}

async function runTests(): Promise<boolean> {
  if (await fs.pathExists('vendor/bin/pest')) {
    log.tool('PHPUnit', 'Running tests...')
    try {
      await runWithRunner(['composer', 'test:pest'])
      log.success('Tests passed')
    } catch {
      log.error('Tests failed')
      return false
    }
  }
  return true
}

async function handleApiDocs(): Promise<boolean> {
  // Allow skipping API docs generation explicitly via env var
  if (isSkipped('api_docs')) {
    log.info('Skipping API docs generation (SKIP_API_DOCS environment variable set)')
    return true
  }

  try {
    await generateApiDocs()
    return true
  } catch {
    log.error('API spec generation failed')
    return false
  }
}

await runHook(GitHook.PrePush, async () => {
  if (await shouldSkip()) return true

  // Deptrac check is currently disabled

  if (!(await runTests())) return false

  // Generate artifacts (non-blocking failures)
  await generateDeptracImage()
  if (!(await handleApiDocs())) return false

  return true
})
