#!/usr/bin/env zx

/**
 * Pre-commit hook - ZX TypeScript implementation
 *
 * Runs PHP quality tools on staged files:
 * - PHP Lint (syntax check)
 * - Rector (auto-fixes)
 * - ECS (code style auto-fixes)
 * - PHPStan (static analysis)
 * - Psalm (static analysis)
 *
 * Environment Variables:
 * - SKIP_PRECOMMIT=1: Skip the entire pre-commit hook
 * - PRECOMMIT_VERBOSE=1: Enable verbose output for debugging
 * - SKIP_RECTOR=1: Skip Rector refactoring
 * - SKIP_ECS=1: Skip ECS code style fixes
 * - SKIP_PHPSTAN=1: Skip PHPStan static analysis
 * - SKIP_PSALM=1: Skip Psalm static analysis
 * - SKIP_DEPTRAC=1: Skip Deptrac architecture analysis
 */

import { $, fs } from 'zx'
import {
  checkPhpSyntax,
  exitIfChecksFailed,
  formatDuration,
  getStagedPhpFiles,
  getPsalmBinary,
  hasVendorBin,
  isToolSkipped,
  log,
  PHPTool,
  runTool,
  runVendorBin,
  runWithRunner,
  shouldRunTool,
  shouldSkipDuringMerge,
  stageFiles,
} from '../shared/utils.ts'

// Configure zx
$.verbose = process.env.PRECOMMIT_VERBOSE === '1' || process.env.PRECOMMIT_VERBOSE === 'true'

// Fix locale issues that can occur in VS Code
process.env.LC_ALL = 'C'
process.env.LANG = 'C'

async function main(): Promise<void> {
  const startTime = Date.now()

  log.step('Starting pre-commit checks...')

  // Check if we should skip the entire hook
  if (process.env.SKIP_PRECOMMIT === '1' || process.env.SKIP_PRECOMMIT === 'true') {
    log.info('Skipping pre-commit checks (SKIP_PRECOMMIT environment variable set)')
    process.exit(0)
  }

  // Check if we should skip all checks
  if (await shouldSkipDuringMerge()) {
    log.info('Skipping pre-commit checks during merge')
    process.exit(0)
  }

  // Get staged PHP files
  const phpFiles = await getStagedPhpFiles()

  if (phpFiles.length === 0) {
    log.info('No PHP files staged for commit. Skipping PHP quality checks.')
    process.exit(0)
  }

  log.info(`Found ${phpFiles.length} staged PHP file(s): ${phpFiles.join(', ')}`)

  // Check PHP syntax first
  if (!(await checkPhpSyntax(phpFiles))) {
    process.exit(1)
  }

  // Track overall success
  let allSuccessful = true

  // Run Rector if available
  if (await shouldRunTool(PHPTool.RECTOR)) {
    const success = await runTool('Rector', 'Running automatic refactoring...', async () => {
      await runVendorBin('rector', ['process', '--ansi', ...phpFiles])
    })

    if (success) {
      // Stage any changes made by Rector
      await stageFiles(phpFiles)
    } else {
      allSuccessful = false
    }
  }

  // Run ECS if available
  if (await shouldRunTool(PHPTool.ECS)) {
    const success = await runTool('ECS', 'Running code style fixes...', async () => {
      await runVendorBin('ecs', ['check', '--fix', '--ansi', ...phpFiles])
    })

    if (success) {
      // Stage any changes made by ECS
      await stageFiles(phpFiles)
    } else {
      allSuccessful = false
    }
  }

  // Run PHPStan if available
  if (await shouldRunTool(PHPTool.PHPSTAN)) {
    const success = await runTool('PHPStan', 'Running static analysis...', async () => {
      await runVendorBin('phpstan', ['analyse', '-c', 'phpstan.neon.dist', ...phpFiles])
    })

    if (!success) {
      allSuccessful = false
    }
  }

  // Run Deptrac if available (architectural analysis)
  if (await shouldRunTool(PHPTool.DEPTRAC)) {
    const success = await runTool('Deptrac', 'Running architecture analysis...', async () => {
      await runVendorBin('deptrac')
    })

    if (success) {
      // Optional: Generate and add deptrac image if configured
      try {
        await runVendorBin('deptrac', ['--formatter=graphviz', '--output=deptrac.png'])
        if (await fs.pathExists('./deptrac.png')) {
          await runWithRunner(['git', 'add', 'deptrac.png'], { quiet: true })
          log.info('Added deptrac.png to staging area')
        }
      } catch (error: unknown) {
        // Image generation is optional, don't fail if it doesn't work
        const errorMessage = error instanceof Error ? error.message : String(error)
        log.warn(`Deptrac image generation failed: ${errorMessage}`)
      }
    } else {
      allSuccessful = false
    }
  }

  // Run Psalm if available
  const psalmBin = await getPsalmBinary()
  if (psalmBin && !isToolSkipped(PHPTool.PSALM)) {
    const success = await runTool('Psalm', 'Running static analysis...', async () => {
      await runVendorBin(psalmBin, ['--show-info=false', ...phpFiles])
    })

    if (!success) {
      allSuccessful = false
    }
  } else if (!psalmBin) {
    log.skip('Psalm not found in vendor/bin. Skipping...')
  } else {
    log.skip('Psalm skipped (SKIP_PSALM environment variable set)')
  }

  // Final result with performance summary
  const totalDuration = Date.now() - startTime
  const formattedTotalDuration = formatDuration(totalDuration)

  if (allSuccessful) {
    log.celebrate(`All pre-commit checks passed! (Total time: ${formattedTotalDuration})`)
  } else {
    log.error(
      `Some pre-commit checks failed after ${formattedTotalDuration}. Please fix the issues and try again.`,
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
