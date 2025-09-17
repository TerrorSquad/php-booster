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
 */

import { $, fs } from 'zx'
import {
  log,
  getStagedPhpFiles,
  hasVendorBin,
  shouldSkipDuringMerge,
  runTool,
  checkPhpSyntax,
  stageFiles,
  runVendorBin,
  runWithRunner,
  exitIfChecksFailed,
} from '../shared/utils.ts'

// Configure zx
$.verbose = false

async function main(): Promise<void> {
  log.step('Starting pre-commit checks...')

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
      allSuccessful = false
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
      allSuccessful = false
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
