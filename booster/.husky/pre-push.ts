#!/usr/bin/env zx

/**
 * Pre-push hook - ZX TypeScript implementation
 *
 * Runs comprehensive checks before pushing:
 * - Architecture validation with Deptrac
 * - Test execution (PHPUnit)
 * - API documentation generation
 *
 * Environment Variables:
 * - SKIP_PREPUSH=1: Skip the entire pre-push hook
 * - GIT_HOOKS_VERBOSE=1: Enable verbose output for debugging
 * - SKIP_DEPTRAC=1: Skip Deptrac architecture analysis
 * - SKIP_PHPUNIT=1: Skip PHPUnit tests
 * - SKIP_API_DOCS=1: Skip API documentation generation
 */

import { $, fs } from 'zx'
import {
  formatDuration,
  generateApiDocs,
  generateDeptracImage,
  hasComposerPackage,
  hasVendorBin,
  isSkipped,
  log,
  PHPTool,
  runTool,
  runVendorBin,
  runWithRunner,
  shouldRunTool,
  shouldSkipDuringMerge,
} from './shared/utils.ts'

// Configure zx
$.verbose = process.env.GIT_HOOKS_VERBOSE === '1' || process.env.GIT_HOOKS_VERBOSE === 'true'

/**
 * Configuration for a pre-push tool/check
 */
interface PushCheckConfig {
  name: string
  description: string
  skipKey?: string
  shouldRun: () => Promise<boolean>
  run: () => Promise<void>
  required?: boolean
}

/**
 * Centralized push checks configuration
 */
const PUSH_CHECKS: PushCheckConfig[] = [
  {
    name: 'Deptrac',
    description: 'Running architecture analysis...',
    skipKey: 'deptrac',
    shouldRun: async () => {
      // Use shouldRunTool with checkVendorBin=false, then check vendor bin separately for custom logic
      if (!(await shouldRunTool(PHPTool.DEPTRAC, false))) return false
      if (!(await hasVendorBin('deptrac'))) return false

      if (!(await fs.pathExists('deptrac.yaml')) && !(await fs.pathExists('deptrac.yml'))) {
        log.skip('deptrac.yaml (or .yml) not found. Skipping Deptrac...')
        return false
      }
      return true
    },
    run: async () => {
      await runVendorBin('deptrac')

      // Optional: Generate and add deptrac image if configured
      await generateDeptracImage()
    },
  },
  {
    name: 'PHPUnit tests',
    description: 'Running PHPUnit tests...',
    skipKey: 'phpunit',
    shouldRun: async () => {
      // Check if skipped via environment variable, then verify package is installed
      return !isSkipped('phpunit') && (await hasComposerPackage('phpunit/phpunit'))
    },
    run: async () => {
      await runVendorBin('phpunit')
    },
  },
  {
    name: 'API Documentation',
    description: 'Generating API documentation...',
    skipKey: 'api_docs',
    shouldRun: async () => {
      // Check if skipped via environment variable, then verify package is installed
      return !isSkipped('api_docs') && (await hasComposerPackage('zircote/swagger-php'))
    },
    run: async () => {
      // Use the documentation/api.php script to generate the spec
      await runWithRunner(['php', 'documentation/api.php'])

      await generateApiDocs()
    },
  },
]

/**
 * Run all configured push checks
 */
async function runPushChecks(): Promise<boolean> {
  let allSuccessful = true

  for (const check of PUSH_CHECKS) {
    if (!(await check.shouldRun())) {
      log.skip(`${check.name} not available. Skipping...`)
      continue
    }

    const success = await runTool(check.name, check.description, () => check.run())

    if (!success) {
      allSuccessful = false
      if (check.required) {
        log.error(`${check.name} is required but failed`)
        return false
      }
    }
  }

  return allSuccessful
}

async function main(): Promise<void> {
  const startTime = Date.now()

  log.step('Starting pre-push checks...')

  // Check if we should skip the entire hook
  if (isSkipped('prepush')) {
    log.info('Skipping pre-push checks (SKIP_PREPUSH environment variable set)')
    process.exit(0)
  }

  // Check if we should skip all checks
  if (await shouldSkipDuringMerge()) {
    log.info('Skipping pre-push checks during merge')
    process.exit(0)
  }

  // Check dependencies
  if (!(await fs.pathExists('./vendor'))) {
    log.error('vendor/ directory not found. Run composer install.')
    process.exit(1)
  }

  // Run all push checks
  let allSuccessful = await runPushChecks()
  const totalDuration = Date.now() - startTime
  const formattedTotalDuration = formatDuration(totalDuration)

  if (allSuccessful) {
    log.celebrate(`All pre-push checks passed! (Total time: ${formattedTotalDuration})`)
  } else {
    log.error(
      `Some pre-push checks failed after ${formattedTotalDuration}. Please fix the issues and try again.`,
    )
    process.exit(1)
  }
}

// Run main function
try {
  await main()
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  log.error(`Unexpected error: ${errorMessage}`)
  process.exit(1)
}
