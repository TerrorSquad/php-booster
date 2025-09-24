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
 * - FORCE_COMMIT=1: Continue with commit even if PHPStan or Psalm fail
 * - PRECOMMIT_VERBOSE=1: Enable verbose output for debugging
 */

import { $, fs } from 'zx'
import {
  checkPhpSyntax,
  exitIfChecksFailed,
  getStagedPhpFiles,
  hasVendorBin,
  log,
  runTool,
  runVendorBin,
  runWithRunner,
  shouldSkipDuringMerge,
  stageFiles,
} from '../shared/utils.ts'

// Configure zx
$.verbose = process.env.PRECOMMIT_VERBOSE === '1' || process.env.PRECOMMIT_VERBOSE === 'true'

// Fix locale issues that can occur in VS Code
process.env.LC_ALL = 'C'
process.env.LANG = 'C'

async function main(): Promise<void> {
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

  // Check if we should force commit even if static analysis fails
  const forceCommit = process.env.FORCE_COMMIT === '1' || process.env.FORCE_COMMIT === 'true'

  if (forceCommit) {
    log.info('Force commit mode enabled (FORCE_COMMIT environment variable set)')
  }

  // Run Rector if available
  if (await hasVendorBin('rector')) {
    const success = await runTool('Rector', async () => {
      log.tool('Rector', 'Running automatic refactoring...')
      await runVendorBin('rector', ['process', '--ansi', ...phpFiles])
      log.success('Rector completed')
    })

    if (success) {
      // Stage any changes made by Rector
      await stageFiles(phpFiles)
    } else {
      allSuccessful = false
    }
  } else {
    log.skip('Rector not found in vendor/bin. Skipping...')
  }

  // Run ECS if available
  if (await hasVendorBin('ecs')) {
    const success = await runTool('ECS', async () => {
      log.tool('ECS', 'Running code style fixes...')
      await runVendorBin('ecs', ['check', '--fix', '--ansi', ...phpFiles])
      log.success('ECS completed')
    })

    if (success) {
      // Stage any changes made by ECS
      await stageFiles(phpFiles)
    } else {
      allSuccessful = false
    }
  } else {
    log.skip('ECS not found in vendor/bin. Skipping...')
  }

  // Run PHPStan if available
  if (await hasVendorBin('phpstan')) {
    const success = await runTool('PHPStan', async () => {
      log.tool('PHPStan', 'Running static analysis...')
      await runVendorBin('phpstan', ['analyse', '-c', 'phpstan.neon.dist', ...phpFiles])
      log.success('PHPStan analysis passed')
    })

    if (!success) {
      if (forceCommit) {
        log.warn('PHPStan failed, but continuing due to FORCE_COMMIT flag')
      } else {
        allSuccessful = false
      }
    }
  } else {
    log.skip('PHPStan not found in vendor/bin. Skipping...')
  }

  // Run Deptrac if available (architectural analysis)
  if (await hasVendorBin('deptrac')) {
    const success = await runTool('Deptrac', async () => {
      log.tool('Deptrac', 'Running architecture analysis...')
      await runVendorBin('deptrac')
      log.success('Deptrac analysis passed')
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
  } else {
    log.skip('Deptrac not found in vendor/bin. Skipping...')
  }

  // Run Psalm if available
  if ((await hasVendorBin('psalm')) || (await hasVendorBin('psalm.phar'))) {
    const psalmBin = (await hasVendorBin('psalm')) ? 'psalm' : 'psalm.phar'
    const success = await runTool('Psalm', async () => {
      log.tool('Psalm', 'Running static analysis...')
      await runVendorBin(psalmBin, ['--show-info=false', ...phpFiles])
      log.success('Psalm analysis passed')
    })

    if (!success) {
      if (forceCommit) {
        log.warn('Psalm failed, but continuing due to FORCE_COMMIT flag')
      } else {
        allSuccessful = false
      }
    }
  } else {
    log.skip('Psalm not found in vendor/bin. Skipping...')
  }

  // Final result
  exitIfChecksFailed(allSuccessful)
}

// Run main function
try {
  await main()
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  log.error(`Unexpected error: ${errorMessage}`)
  process.exit(1)
}
