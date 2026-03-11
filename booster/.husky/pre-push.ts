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
  applyConfigOverrides,
  runQualityChecks,
} from './shared/index.ts'
import { TOOLS } from './shared/tools.ts'

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

/**
 * Check if a tool is disabled in the config for the pre-push hook
 */
function isToolDisabled(toolName: string, config: Awaited<ReturnType<typeof loadConfig>>): boolean {
  if (!config) return false
  const prePushTools = config.hooks?.prePush?.tools ?? {}
  const hookKey = Object.keys(prePushTools).find((k) => k.toLowerCase() === toolName.toLowerCase())
  return hookKey ? prePushTools[hookKey]?.enabled === false : false
}

export async function handleArtifacts(config: Awaited<ReturnType<typeof loadConfig>>): Promise<void> {
  // Generate artifacts - these are informational and don't block the push
  // Developers should commit these manually if needed

  // Check both env var and config file for Deptrac image
  if (!isSkipped('deptrac_image') && !isSkipped('deptrac') && !isToolDisabled('Deptrac', config)) {
    await generateDeptracImage()
  } else {
    log.skip('Deptrac image generation skipped')
  }

  // Check both env var and config file for API docs
  if (!isSkipped('api_docs') && !isToolDisabled('API Docs', config)) {
    try {
      const result = await generateApiDocs()
      if (result.changed) {
        log.warn('API documentation has changed. Consider committing the changes.')
      }
    } catch {
      // API docs generation is optional, don't fail the push
      log.warn('API docs generation failed, but continuing with push')
    }
  } else {
    log.skip('API docs generation skipped')
  }
}

await runHook(GitHook.PrePush, async () => {
  const config = await loadConfig()
  if (config === null) return true

  // Run tests - these ARE blocking (unless disabled in config)
  if (!isHookSkippedByConfig('tests', config)) {
    if (!(await runTests())) return false
  } else {
    log.info('Skipping tests (disabled in config)')
  }

  // Generate artifacts - informational only, don't block push
  if (!isHookSkippedByConfig('artifacts', config)) {
    await handleArtifacts(config)
  } else {
    log.info('Skipping artifact generation (disabled in config)')
  }

  // Run any quality tools explicitly configured for the pre-push hook.
  // Tools with passFiles:false (whole-project analysis) are always executed.
  // Tools that require specific files are skipped when no relevant files are
  // available in the push context.
  const prePushTools = applyConfigOverrides(TOOLS, config, 'prePush')
  if (prePushTools.length > 0) {
    log.step('Running pre-push quality checks...')
    const success = await runQualityChecks([], prePushTools, true)
    if (!success) return false
  }

  return true
})
