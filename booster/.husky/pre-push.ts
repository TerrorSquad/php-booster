#!/usr/bin/env zx

/**
 * Pre-push hook - ZX TypeScript implementation
 *
 * Runs checks before pushing:
 * - Tests (Pest/PHPUnit)
 * - Artifact generation (Deptrac image, API docs) - informational only
 *
 * Configuration File (.git-hooks.config.json):
 * - Disable hooks, tests, or artifact generation
 */
import { fs } from 'zx'
import {
  GitHook,
  isHookSkippedByConfig,
  isSkipped,
  loadConfig,
  log,
  runHook,
  exec,
  generateApiDocs,
  generateDeptracImage,
} from './shared/index.ts'

export async function runTests(): Promise<boolean> {
  if (await fs.pathExists('vendor/bin/pest')) {
    log.tool('Pest', 'Running tests...')
    try {
      await exec(['composer', 'test:pest'], { type: 'php' })
      log.success('Tests passed')
    } catch {
      log.error('Tests failed')
      return false
    }
  }
  return true
}

export async function handleArtifacts(): Promise<void> {
  // Generate artifacts - these are informational and don't block the push
  // Developers should commit these manually if needed

  if (!isSkipped('deptrac_image')) {
    await generateDeptracImage()
  }

  if (!isSkipped('api_docs')) {
    try {
      const result = await generateApiDocs()
      if (result.changed) {
        log.warn('API documentation has changed. Consider committing the changes.')
      }
    } catch {
      // API docs generation is optional, don't fail the push
      log.warn('API docs generation failed, but continuing with push')
    }
  }
}

await runHook(GitHook.PrePush, async () => {
  const config = await loadConfig()

  // Run tests - these ARE blocking (unless disabled in config)
  if (!isHookSkippedByConfig('tests', config)) {
    if (!(await runTests())) return false
  } else {
    log.info('Skipping tests (disabled in config)')
  }

  // Generate artifacts - informational only, don't block push
  if (!isHookSkippedByConfig('artifacts', config)) {
    await handleArtifacts()
  } else {
    log.info('Skipping artifact generation (disabled in config)')
  }

  return true
})
